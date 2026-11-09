import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

/**
 * Webhook da Kiwify → Duo Match
 *
 * Fluxo:
 * 1) Kiwify confirma a compra (compra_aprovada / order_approved)
 * 2) Esta função valida a assinatura HMAC-SHA1 (raw body + token)
 * 3) Procura a assinatura pending_payment pelo e-mail do comprador
 * 4) Ativa (ou cancela, em refund/chargeback) usando a service_role
 *
 * Eventos aceitos (Kiwify → aqui):
 *   order_approved / subscription_renewed  → active   (+1 mês em expires_at)
 *   order_refunded / chargeback /
 *   subscription_canceled                  → cancelled
 *   subscription_late                      → past_due
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://hnvcxgbgjxbtlvnrehqn.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KIWIFY_WEBHOOK_TOKEN = process.env.KIWIFY_WEBHOOK_TOKEN;

const json = (body, status = 200) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
});

function verifySignature(rawBody, signature, token) {
  if (!signature || !token) return false;
  const expected = crypto.createHmac('sha1', token).update(rawBody, 'utf8').digest('hex');
  const a = Buffer.from(String(expected), 'utf8');
  const b = Buffer.from(String(signature), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
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

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }
  if (!SERVICE_ROLE_KEY) {
    console.error('SUPABASE_SERVICE_ROLE_KEY não configurada no Netlify.');
    return json({ error: 'not_configured', message: 'Webhook sem chave de serviço.' }, 500);
  }
  if (!KIWIFY_WEBHOOK_TOKEN) {
    console.error('KIWIFY_WEBHOOK_TOKEN não configurada no Netlify.');
    return json({ error: 'not_configured', message: 'KIWIFY_WEBHOOK_TOKEN ausente.' }, 500);
  }

  const rawBody = event.body || '';
  const query = event.queryStringParameters || {};
  const signature = query.signature || query.Signature || query.SIGNATURE || '';

  if (!verifySignature(rawBody, signature, KIWIFY_WEBHOOK_TOKEN)) {
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

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const note = async (action, extra = {}) => {
    console.log('[kiwify-webhook]', JSON.stringify({ eventType, customerEmail, gatewayId, action, ...extra }));
  };

  // Eventos que mantêm o cliente ativo por 30 dias
  const activateEvents = ['order_approved', 'subscription_renewed'];
  // Eventos que encerram o acesso
  const deactivateEvents = ['order_refunded', 'chargeback', 'subscription_canceled'];

  if (activateEvents.includes(eventType)) {
    if (!customerEmail) {
      await note('skipped_no_email');
      return json({ ok: false, error: 'no_customer_email' }, 202);
    }
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        gateway: 'kiwify',
        gateway_subscription_id: gatewayId || undefined,
        started_at: new Date().toISOString(),
        expires_at: expiresAt,
      })
      .ilike('checkout_email', customerEmail.trim())
      .in('status', ['pending_payment', 'active', 'past_due'])
      .select('id, user_id, status');

    if (error) {
      console.error('Erro ao ativar assinatura:', error.message);
      return json({ error: 'database_error', message: error.message }, 500);
    }
    await note('activated', { matched: data?.length || 0 });
    return json({ ok: true, matched: data?.length || 0, event: eventType });
  }

  if (deactivateEvents.includes(eventType)) {
    if (!customerEmail) {
      await note('skipped_no_email');
      return json({ ok: false, error: 'no_customer_email' }, 202);
    }
    const { data, error } = await supabase
      .from('subscriptions')
      .update({ status: 'cancelled', gateway: 'kiwify' })
      .ilike('checkout_email', customerEmail.trim())
      .in('status', ['active', 'pending_payment', 'past_due'])
      .select('id');

    if (error) {
      console.error('Erro ao cancelar assinatura:', error.message);
      return json({ error: 'database_error', message: error.message }, 500);
    }
    await note('cancelled', { matched: data?.length || 0 });
    return json({ ok: true, matched: data?.length || 0, event: eventType });
  }

  if (eventType === 'subscription_late') {
    if (!customerEmail) return json({ ok: false, error: 'no_customer_email' }, 202);
    await supabase
      .from('subscriptions')
      .update({ status: 'past_due', gateway: 'kiwify' })
      .ilike('checkout_email', customerEmail.trim())
      .eq('status', 'active');
    await note('marked_past_due');
    return json({ ok: true, event: eventType });
  }

  // Outros eventos (pix_gerado, boleto_gerado, recusas…): só registra
  await note('ignored_event');
  return json({ ok: true, ignored: eventType || 'unknown' });
};
