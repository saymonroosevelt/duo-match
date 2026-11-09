import { getStore } from '@netlify/blobs';
import { createHash } from 'node:crypto';

const WINDOW_MS = 15 * 60 * 1000; // janela de 15 minutos
const MAX_FAILS = 8; // tentativas erradas por IP dentro da janela
const STORE = 'login-rate-limit';

const json = (body, status, extraHeaders = {}) => ({
  statusCode: status,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  },
  body: JSON.stringify(body),
});

// IP real do cliente: no Netlify, x-nf-client-connection-ip é confiável
// (x-forwarded-for pode ser forjado pelo cliente — usado só como fallback).
function clientIp(event) {
  const headers = event.headers || {};
  const flat = (name) => {
    for (const [k, v] of Object.entries(headers)) {
      if (k.toLowerCase() === name) return v;
    }
    return undefined;
  };
  const nf = flat('x-nf-client-connection-ip');
  if (nf) return String(nf).trim();
  const fwd = flat('x-forwarded-for');
  if (fwd) return String(fwd).split(',')[0].trim();
  return flat('x-real-ip') || flat('client-ip') || 'unknown';
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json({ error: 'invalid_body', message: 'Corpo da requisição inválido.' }, 400);
  }

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!email || !password) {
    return json({ error: 'invalid_credentials', message: 'Informe e-mail e senha.' }, 400);
  }

  const ip = clientIp(event);
  const ipHash = createHash('sha256').update(ip).digest('hex');
  const key = `ip:${ipHash}`;
  const now = Date.now();

  let store = null;
  try {
    store = getStore({ name: STORE, consistency: 'strong' });
  } catch {
    store = null; // se o Blobs estiver indisponível, segue sem derrubar o login
  }

  let rec = null;
  if (store) {
    try {
      rec = (await store.get(key, { type: 'json' })) || null;
    } catch {
      rec = null;
    }
    if (!rec || now > rec.resetAt) {
      rec = { count: 0, resetAt: now + WINDOW_MS };
    }
    if (rec.count >= MAX_FAILS) {
      const retryAfter = Math.max(1, Math.ceil((rec.resetAt - now) / 1000));
      return json(
        {
          error: 'rate_limited',
          message: `Muitas tentativas de login. Aguarde ${Math.ceil(retryAfter / 60)} minuto(s) e tente novamente.`,
          retryAfter,
        },
        429,
        { 'Retry-After': String(retryAfter) },
      );
    }
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hnvcxgbgjxbtlvnrehqn.supabase.co';
  // Chave publishable/anon é pública por design — aceitável também no servidor.
  // NUNCA use service_role aqui.
  const supabaseAnonKey =
    process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_BdVgtFsy-RFG_FMHIes3QQ_8Uj1EhaX';

  let resp;
  try {
    resp = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return json(
      { error: 'upstream_unavailable', message: 'Servidor de autenticação indisponível. Tente novamente em instantes.' },
      502,
    );
  }

  const payload = await resp.json().catch(() => ({}));

  if (resp.status >= 400) {
    if (store) {
      rec = rec || { count: 0, resetAt: now + WINDOW_MS };
      rec.count += 1;
      try {
        await store.setJSON(key, rec);
      } catch {
        /* não derruba o login se a escrita falhar */
      }
    }
    return json({ error: 'invalid_credentials', message: 'E-mail ou senha incorretos.' }, 400);
  }

  // Login OK: zera o contador do IP
  if (store) {
    try {
      await store.setJSON(key, { count: 0, resetAt: now + WINDOW_MS });
    } catch {
      /* idempotente */
    }
  }
  return json(payload, 200);
};
