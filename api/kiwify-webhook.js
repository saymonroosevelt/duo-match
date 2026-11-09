export const config = { runtime: 'edge' };

/**
 * Webhook da Kiwify → Duo Match (Vercel Edge Function)
 *
 * Fluxo:
 * 1) Kiwify confirma a compra (order_approved / subscription_renewed)
 * 2) Esta função valida a assinatura HMAC-SHA1 (raw body + token)
 * 3) Procura a assinatura pending_payment pelo e-mail do comprador
 * 4) Ativa (ou cancela, em refund/chargeback) usando a service_role
 *
 * A Edge Function é usada aqui porque ela entrega o corpo cru da requisição
 * (request.text()), necessário para conferir a assinatura HMAC.
 *
 * Eventos aceitos (Kiwify → aqui):
 *   order_approved / subscription_renewed  → active   (+30 dias em expires_at)
 *   order_refunded / chargeback /
 *   subscription_canceled                  → cancelled
 *   subscription_late                      → past_due
 */

const FALLBACK_SUPABASE_URL = 'https://hnvcxgbgjxbtlvnrehqn.supabase.co';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

async function hmacSha1Hex(token, message) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(token),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(mac))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function pickCustomerEmail(payload) {
  return (
    payload?.Customer?.email ||
    payload?.customer?.email ||
    payload?.Email ||
    payload?.email ||
    null
  );
}

function pickGatewayId(payload) {
  return (
    payload?.Subscription?.id ||
    payload?.Subscription?.subscription_id ||
    payload?.subscription_id ||
    payload?.order_id ||
    payload?.id ||
    null
  );
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const webhookToken = process.env.KIWIFY_WEBHOOK_TOKEN;

  if (!serviceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY não configurada na Vercel.');
    return json({ error: 'not_configured', message: 'Webhook sem chave de serviço.' }, 500);
  }
  if (!webhookToken) {
    console.error('KIWIFY_WEBHOOK_TOKEN não configurada na Vercel.');
    return json({ error: 'not_configured', message: 'KIWIFY_WEBHOOK_TOKEN ausente.' }, 500);
  }

  const rawBody = await request.text();
  const signature = new URL(request.url).searchParams.get('signature') || '';

  const expected = await hmacSha1Hex(webhookToken, rawBody);
  if (!signature || !timingSafeEqual(expected, String(signature))) {
    console.warn('Assinatura inválida no webhook Kiwify.');
    return json({ error: 'invalid_signature' }, 401);
  }

  let payload = null;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const eventType = payload?.webhook_event_type || '';
  const customerEmail = pickCustomerEmail(payload);
  const gatewayId = pickGatewayId(payload);

  const supabaseUrl = process.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;

  const patchSubscriptions = async (filters, changes) => {
    const response = await fetch(`${supabaseUrl}/rest/v1/subscriptions?${filters}`, {
      method: 'PATCH',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(changes),
    });
    const rows = await response.json().catch(() => []);
    if (!response.ok) {
      const message = rows?.message || `HTTP ${response.status}`;
      throw new Error(message);
    }
    return Array.isArray(rows) ? rows : [];
  };

  const logAction = (action, extra = {}) => {
    console.log(
      '[kiwify-webhook]',
      JSON.stringify({ eventType, customerEmail, gatewayId, action, ...extra }),
    );
  };

  const activateEvents = ['order_approved', 'subscription_renewed'];
  const deactivateEvents = ['order_refunded', 'chargeback', 'subscription_canceled'];

  try {
    if (activateEvents.includes(eventType)) {
      if (!customerEmail) {
        logAction('skipped_no_email');
        return json({ ok: false, error: 'no_customer_email' }, 202);
      }
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const rows = await patchSubscriptions(
        `checkout_email=ilike.${encodeURIComponent(customerEmail.trim())}&status=in.(pending_payment,active,past_due)&select=id,user_id,status`,
        {
          status: 'active',
          gateway: 'kiwify',
          ...(gatewayId ? { gateway_subscription_id: String(gatewayId) } : {}),
          started_at: new Date().toISOString(),
          expires_at: expiresAt,
        },
      );
      logAction('activated', { matched: rows.length });
      return json({ ok: true, matched: rows.length, event: eventType });
    }

    if (deactivateEvents.includes(eventType)) {
      if (!customerEmail) {
        logAction('skipped_no_email');
        return json({ ok: false, error: 'no_customer_email' }, 202);
      }
      const rows = await patchSubscriptions(
        `checkout_email=ilike.${encodeURIComponent(customerEmail.trim())}&status=in.(active,pending_payment,past_due)&select=id`,
        { status: 'cancelled', gateway: 'kiwify' },
      );
      logAction('cancelled', { matched: rows.length });
      return json({ ok: true, matched: rows.length, event: eventType });
    }

    if (eventType === 'subscription_late') {
      if (!customerEmail) {
        return json({ ok: false, error: 'no_customer_email' }, 202);
      }
      await patchSubscriptions(
        `checkout_email=ilike.${encodeURIComponent(customerEmail.trim())}&status=eq.active`,
        { status: 'past_due', gateway: 'kiwify' },
      );
      logAction('marked_past_due');
      return json({ ok: true, event: eventType });
    }
  } catch (error) {
    console.error('Erro ao atualizar assinatura:', error.message);
    return json({ error: 'database_error', message: error.message }, 500);
  }

  // Outros eventos (pix_gerado, boleto_gerado, recusas…): só registra
  logAction('ignored_event');
  return json({ ok: true, ignored: eventType || 'unknown' });
}
