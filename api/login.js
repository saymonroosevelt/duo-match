import { createHash } from 'node:crypto';

const WINDOW_MS = 15 * 60 * 1000; // janela de 15 minutos
const MAX_FAILS = 8; // tentativas erradas por IP dentro da janela

// Rate limit em memória do processo (a Vercel não tem Netlify Blobs).
// Em cold start o contador reinicia; ainda assim segura rajadas de força bruta.
const attempts = new Map();

function clientIp(req) {
  // Na Vercel, x-real-ip é definido pela borda; x-forwarded-for é o fallback.
  const real = req.headers['x-real-ip'];
  if (real) return String(real).trim();
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return 'unknown';
}

function send(res, body, status, extraHeaders = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  for (const [key, value] of Object.entries(extraHeaders)) {
    res.setHeader(key, value);
  }
  res.end(JSON.stringify(body));
}

function pruneExpired(now) {
  if (attempts.size < 5000) return;
  for (const [key, rec] of attempts) {
    if (!rec || now > rec.resetAt) attempts.delete(key);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return send(res, { error: 'method_not_allowed' }, 405);
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return send(res, { error: 'invalid_body', message: 'Corpo da requisição inválido.' }, 400);
    }
  }
  if (!body || typeof body !== 'object') body = {};

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!email || !password) {
    return send(res, { error: 'invalid_credentials', message: 'Informe e-mail e senha.' }, 400);
  }

  const ip = clientIp(req);
  const ipHash = createHash('sha256').update(ip).digest('hex');
  const key = `ip:${ipHash}`;
  const now = Date.now();

  pruneExpired(now);

  let rec = attempts.get(key);
  if (!rec || now > rec.resetAt) {
    rec = { count: 0, resetAt: now + WINDOW_MS };
  }
  if (rec.count >= MAX_FAILS) {
    const retryAfter = Math.max(1, Math.ceil((rec.resetAt - now) / 1000));
    return send(
      res,
      {
        error: 'rate_limited',
        message: `Muitas tentativas de login. Aguarde ${Math.ceil(retryAfter / 60)} minuto(s) e tente novamente.`,
        retryAfter,
      },
      429,
      { 'Retry-After': String(retryAfter) },
    );
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
    return send(
      res,
      {
        error: 'upstream_unavailable',
        message: 'Servidor de autenticação indisponível. Tente novamente em instantes.',
      },
      502,
    );
  }

  const payload = await resp.json().catch(() => ({}));

  if (resp.status >= 400) {
    rec.count += 1;
    attempts.set(key, rec);
    return send(res, { error: 'invalid_credentials', message: 'E-mail ou senha incorretos.' }, 400);
  }

  // Login OK: zera o contador do IP
  attempts.delete(key);
  return send(res, payload, 200);
}
