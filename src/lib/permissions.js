// Controle de acesso: admin exclusivo (contas com privilégio administrativo)

// As únicas contas com privilégios administrativos no Duo Match.
export const ADMIN_EMAILS = [
  'marynamirandadirection@gmail.com',
  'symonrooseveelt@gmail.com',
];

export const PAID_STATUSES = ['active', 'trialing'];

export function isAdminUser(session) {
  const email = String(session?.user?.email || '').trim().toLowerCase();
  return ADMIN_EMAILS.includes(email);
}

export function isPaidSubscription(subscriptionRow) {
  return !!subscriptionRow && PAID_STATUSES.includes(subscriptionRow.status);
}

export async function fetchMySubscription(supabase, userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, status, plan_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar assinatura:', error.message);
    return null;
  }
  return data ?? null;
}
