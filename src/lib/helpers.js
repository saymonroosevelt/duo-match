// Remove caracteres de controle, colapsa espaços e limita o tamanho do texto.
export function cleanText(value, maxLength = 500) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value ?? '').trim());
}

export function clampInt(value, min, max, fallback = NaN) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

// Pequenos utilitários compartilhados entre as telas.

export function asArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value == null || value === '') return [];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
      } catch {
        // segue para o split abaixo
      }
    }
    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export function normalizeFeatures(value) {
  return asArray(value).map((item) =>
    typeof item === 'string' ? item : String(item),
  );
}

export function formatPrice(value) {
  const number = Number(value || 0);
  return `R$ ${number.toFixed(2).replace('.', ',')}`;
}

export function formatDate(value, options = {}) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    ...options,
  });
}

export function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function dayLabel(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a, b) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();

  if (sameDay(date, today)) return 'Hoje';
  if (sameDay(date, yesterday)) return 'Ontem';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

export function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '♡';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || 'você';
}

export function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

// Traduz os erros mais comuns do Supabase para uma orientação útil.
export function friendlyError(error) {
  if (!error) return '';
  const message = error.message || String(error);
  const code = error.code || '';

  if (
    code === 'PGRST204' ||
    code === '42703' ||
    /column .* does not exist/i.test(message) ||
    /could not find the '.*' column/i.test(message)
  ) {
    return 'O banco de dados ainda não foi atualizado. Rode o SQL de consolidação do briefing no Supabase.';
  }

  if (
    code === '42P01' ||
    code === 'PGRST205' ||
    /relation .* does not exist/i.test(message) ||
    /could not find the table/i.test(message)
  ) {
    return 'Uma tabela necessária ainda não existe. Rode o SQL de consolidação do briefing no Supabase.';
  }

  if (code === '42501' || /row-level security/i.test(message)) {
    return 'Ação bloqueada pela política de segurança. Verifique as permissões (RLS) no Supabase.';
  }

  if (/duplicate key/i.test(message)) {
    return 'Esse registro já existe.';
  }

  return message;
}

// Galeria de fotos do perfil (até 5). Fallback: perfis antigos só com photo_url.
export function profilePhotos(profile) {
  const list = asArray(profile?.photos);
  if (list.length) return list.slice(0, 5);
  const single = typeof profile?.photo_url === 'string' ? profile.photo_url.trim() : '';
  return single ? [single] : [];
}

// Detecta o erro do PostgREST/Postgres quando a coluna `gender` ainda não
// existe (migração 20261114_profiles_gender.sql ainda não executada).
export function isMissingGenderColumn(error) {
  if (!error) return false;
  const message = error?.message || String(error);
  const code = error?.code || '';
  return (
    code === 'PGRST204' ||
    code === '42703' ||
    /could not find the 'gender' column/i.test(message) ||
    /column .*gender.* does not exist/i.test(message)
  );
}

export function isPlanSelect(plan) {
  const slug = String(plan?.slug || '').toLowerCase();
  const name = String(plan?.name || '').toLowerCase();
  return slug.includes('select') || name.includes('select');
}

export function isSubscriptionActive(subscription) {
  return ['active', 'trialing'].includes(subscription?.status);
}
