// Arquitetura de pagamento preparada para o futuro.
//
// Regra do briefing: NENHUM pagamento simulado. O cliente nunca deve
// marcar uma assinatura como "active". Quando o gateway for conectado,
// esta função chamará uma Edge Function (Stripe, Mercado Pago etc.) que
// devolve a URL do checkout. A ativação da assinatura será feita pelo
// webhook do gateway usando a service_role no servidor.

export const PAYMENT_PROVIDER =
  import.meta.env.VITE_PAYMENT_PROVIDER || 'not_configured';

export async function createCheckoutSession({ plan, user }) {
  if (!plan?.id) {
    return {
      status: 'unavailable',
      message:
        'O plano ainda não está disponível no banco. Rode o SQL de consolidação do briefing no Supabase.',
    };
  }

  // Ponto de integração futuro:
  // const { data, error } = await supabase.functions.invoke('create-checkout', {
  //   body: { planId: plan.id, userId: user?.id },
  // });
  // if (data?.url) window.location.href = data.url;

  return {
    status: 'not_configured',
    message:
      'O pagamento ainda não foi habilitado nesta versão. Nenhuma cobrança foi feita.',
  };
}
