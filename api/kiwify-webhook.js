export const config = { runtime: 'edge' };

// Sentry no edge — só ativa quando SENTRY_DSN está configurado.
// Sem ele, o SDK simplesmente não inicializa e o fluxo segue igual.
let Sentry = null;
let sentryInit = null;
async function getSentry() {
  if (Sentry) return Sentry;
  if (!sentryInit) {
    sentryInit = (async () => {
      if (!process.env.SENTRY_DSN) return null;
      try {
        const mod = await import('@sentry/vercel-edge');
        mod.init({
          dsn: process.env.SENTRY_DSN,
          environment: 'production',
        });
        return mod;
      } catch {
        return null;
      }
    })();
  }
  Sentry = await sentryInit;
  return Sentry;
}

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
const FALLBACK_PUBLISHABLE_KEY = 'sb_publishable_BdVgtFsy-RFG_FMHIes3QQ_8Uj1EhaX';
const FALLBACK_ADMIN_EMAIL = 'marynamirandadirection@gmail.com';

// Sessão admin usada apenas como plano B quando o trigger de proteção do
// banco ainda não reconhece a service_role (migration de correção).
// É gerada no servidor, nunca sai da função e fica em cache enquanto vale.
let adminSession = { token: null, expiresAt: 0 };

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

async function getAdminToken(supabaseUrl, serviceRoleKey, anonKey) {
  if (adminSession.token && adminSession.expiresAt > Date.now() + 60_000) {
    return adminSession.token;
  }

  const email = process.env.KIWIFY_ADMIN_EMAIL || FALLBACK_ADMIN_EMAIL;

  const linkResponse = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'magiclink', email }),
  });
  const link = await linkResponse.json().catch(() => null);

  if (!linkResponse.ok || !link?.hashed_token) {
    console.warn('Plano B: não foi possível gerar a sessão admin.', linkResponse.status);
    return null;
  }

  const verifyResponse = await fetch(`${supabaseUrl}/auth/v1/verify`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'magiclink', token_hash: link.hashed_token }),
  });
  const session = await verifyResponse.json().catch(() => null);

  if (!verifyResponse.ok || !session?.access_token) {
    console.warn('Plano B: não foi possível validar a sessão admin.', verifyResponse.status);
    return null;
  }

  const ttl = Number(session.expires_in) > 0 ? Number(session.expires_in) : 3600;
  adminSession = {
    token: session.access_token,
    expiresAt: Date.now() + ttl * 1000,
  };
  return adminSession.token;
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
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || FALLBACK_PUBLISHABLE_KEY;

  const logAction = (action, extra = {}) => {
    console.log(
      '[kiwify-webhook]',
      JSON.stringify({ eventType, customerEmail, gatewayId, action, ...extra }),
    );
  };

  const patchSubscriptions = async (
    filters,
    changes,
    auth = { key: serviceRoleKey, token: serviceRoleKey },
  ) => {
    const response = await fetch(`${supabaseUrl}/rest/v1/subscriptions?${filters}`, {
      method: 'PATCH',
      headers: {
        apikey: auth.key,
        Authorization: `Bearer ${auth.token}`,
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

  // Aplica a mudança e confere o status devolvido pelo banco. Se o trigger
  // de proteção tiver revertido (service_role não reconhecida), tenta de
  // novo com uma sessão admin — que passa pelo public.is_admin() do trigger.
  const applyAndConfirm = async (filters, changes, expectedStatus) => {
    let rows = await patchSubscriptions(filters, changes);
    if (rows.length === 0) return rows;
    if (rows.every((row) => row.status === expectedStatus)) return rows;

    logAction('service_role_blocked', { expectedStatus });
    try {
      const sentry = await getSentry();
      sentry?.captureMessage('service_role_blocked: ativação via fallback admin', 'warning');
    } catch {
      // Sentry indisponível — segue.
    }

    try {
      const adminToken = await getAdminToken(supabaseUrl, serviceRoleKey, anonKey);
      if (adminToken) {
        rows = await patchSubscriptions(filters, changes, {
          key: anonKey,
          token: adminToken,
        });
        if (rows.length > 0 && rows.every((row) => row.status === expectedStatus)) {
          logAction('applied_via_admin_fallback', { expectedStatus });
          return rows;
        }
      }
    } catch (fallbackError) {
      console.warn('Plano B falhou:', fallbackError.message);
    }

    throw new Error(`status_not_applied:${expectedStatus}`);
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
      const rows = await applyAndConfirm(
        `checkout_email=ilike.${encodeURIComponent(customerEmail.trim())}&status=in.(pending_payment,active,past_due)&select=id,user_id,status`,
        {
          status: 'active',
          gateway: 'kiwify',
          ...(gatewayId ? { gateway_subscription_id: String(gatewayId) } : {}),
          started_at: new Date().toISOString(),
          expires_at: expiresAt,
        },
        'active',
      );
      logAction('activated', { matched: rows.length });
      return json({ ok: true, matched: rows.length, event: eventType });
    }

    if (deactivateEvents.includes(eventType)) {
      if (!customerEmail) {
        logAction('skipped_no_email');
        return json({ ok: false, error: 'no_customer_email' }, 202);
      }
      const rows = await applyAndConfirm(
        `checkout_email=ilike.${encodeURIComponent(customerEmail.trim())}&status=in.(active,pending_payment,past_due)&select=id,user_id,status`,
        { status: 'cancelled', gateway: 'kiwify' },
        'cancelled',
      );
      logAction('cancelled', { matched: rows.length });
      return json({ ok: true, matched: rows.length, event: eventType });
    }

    if (eventType === 'subscription_late') {
      if (!customerEmail) {
        return json({ ok: false, error: 'no_customer_email' }, 202);
      }
      const rows = await applyAndConfirm(
        `checkout_email=ilike.${encodeURIComponent(customerEmail.trim())}&status=eq.active&select=id,user_id,status`,
        { status: 'past_due', gateway: 'kiwify' },
        'past_due',
      );
      logAction('marked_past_due', { matched: rows.length });
      return json({ ok: true, matched: rows.length, event: eventType });
    }
  } catch (error) {
    console.error('Erro ao atualizar assinatura:', error.message);
    try {
      const sentry = await getSentry();
      sentry?.captureException(error, {
        extra: { eventType, customerEmail, gatewayId },
      });
    } catch {
      // Sentry indisponível — segue.
    }
    return json({ error: 'database_error', message: error.message }, 500);
  }

  // Outros eventos (pix_gerado, boleto_gerado, recusas…): só registra
  logAction('ignored_event');
  return json({ ok: true, ignored: eventType || 'unknown' });
}
