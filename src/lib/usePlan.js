import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

// Retorna a assinatura mais recente e o plano associado.
// A assinatura só é considerada ativa quando o status for active/trialing;
// o cliente nunca ativa nada sozinho.
export default function usePlan(userId) {
  const [state, setState] = useState({
    subscription: null,
    plan: null,
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    if (!userId) {
      setState({
        subscription: null,
        plan: null,
        loading: false,
        error: null,
      });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      // Se a coluna created_at ainda não existe, tenta sem ordenar.
      const fallback = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .limit(1);

      if (fallback.error) {
        setState({
          subscription: null,
          plan: null,
          loading: false,
          error: fallback.error.message,
        });
        return;
      }

      await hydrate(fallback.data?.[0]);
      return;
    }

    await hydrate(subscriptions?.[0]);
  }, [userId]);

  async function hydrate(subscription) {
    if (!subscription) {
      setState({
        subscription: null,
        plan: null,
        loading: false,
        error: null,
      });
      return;
    }

    let plan = null;
    if (subscription.plan_id) {
      const { data: planRow } = await supabase
        .from('plans')
        .select('*')
        .eq('id', subscription.plan_id)
        .maybeSingle();
      plan = planRow;
    }

    setState({
      subscription,
      plan,
      loading: false,
      error: null,
    });
  }

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
