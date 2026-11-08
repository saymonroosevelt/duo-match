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

export function isPlanSelect(plan) {
  const slug = String(plan?.slug || '').toLowerCase();
  const name = String(plan?.name || '').toLowerCase();
  return slug.includes('select') || name.includes('select');
}

export function isSubscriptionActive(subscription) {
  return ['active', 'trialing'].includes(subscription?.status);
}
