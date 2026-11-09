import { useEffect, useState } from 'react';
import {
  Check,
  CreditCard,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { FALLBACK_PLANS, PLAN_STATUS_LABELS } from '../lib/constants';
import {
  formatPrice,
  isPlanSelect,
  isSubscriptionActive,
  normalizeFeatures,
} from '../lib/helpers';
import { createCheckoutSession, PAYMENT_URL } from '../lib/payments';
import usePlan from '../lib/usePlan';
import BackButton from '../components/BackButton';
import Toast from '../components/Toast';

export default function PlansScreen({ user, onBack }) {
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [selecting, setSelecting] = useState(null);
  const [toast, setToast] = useState<any>(null);
  const [confirmation, setConfirmation] = useState<any>(null);
  const planState = usePlan(user?.id);

  useEffect(() => {
    let active = true;

    async function loadPlans() {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('active', true)
        .order('price', { ascending: true });

      if (!active) return;

      if (error || !data || data.length === 0) {
        setPlans(FALLBACK_PLANS);
        setUsingFallback(true);
      } else {
        setPlans(data);
        setUsingFallback(false);
      }
      setLoadingPlans(false);
    }

    loadPlans();
    return () => {
      active = false;
    };
  }, []);

  async function selectPlan(plan) {
    if (selecting || !user?.id) return;

    if (!plan.id) {
      setToast({
        type: 'error',
        message:
          'O plano ainda não está no banco. Rode o SQL de consolidação do briefing no Supabase.',
      });
      return;
    }

    if (
      planState.subscription &&
      isSubscriptionActive(planState.subscription) &&
      planState.subscription.plan_id === plan.id
    ) {
      return;
    }

    setSelecting(plan.id);

    try {
      const checkout = await createCheckoutSession({ plan, user });

      const current = planState.subscription;

      if (current && current.status === 'pending_payment') {
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({ plan_id: plan.id })
          .eq('id', current.id);
        if (updateError) throw updateError;
      } else if (!current) {
        const { error: insertError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: user.id,
            plan_id: plan.id,
            status: 'pending_payment',
          });
        if (insertError) throw insertError;
      } else if (current && ['cancelled', 'expired'].includes(current.status)) {
        const { error: insertError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: user.id,
            plan_id: plan.id,
            status: 'pending_payment',
          });
        if (insertError) throw insertError;
      } else {
        setToast({
          type: 'error',
          message:
            'Você já tem um plano ativo. A troca será liberada junto com o pagamento.',
        });
        return;
      }

      setConfirmation({
        plan,
        message: checkout.message,
      });

      // Abre a página de pagamento/vendas em uma aba nova — o funil completo:
      // escolhe o plano → paga lá → a assinatura é ativada pela curadoria.
      window.open(PAYMENT_URL, '_blank', 'noopener,noreferrer');

      await planState.reload();
    } catch (error) {
      setToast({ type: 'error', message: error.message || String(error) });
    } finally {
      setSelecting(null);
    }
  }

  return (
    <div className="min-h-[100dvh] text-white">
      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#150408]">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between">
          <BackButton onClick={onBack} />
          <h1 className="text-xl font-serif text-rose-50">Planos</h1>
          <div className="w-16" />
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 pt-7 pb-12">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full border border-rose-800/30 bg-rose-950/40 flex items-center justify-center mx-auto mb-4">
            <Sparkles size={23} className="text-rose-300" />
          </div>
          <h2 className="text-3xl font-serif text-rose-50 leading-tight">
            Escolha como viver o Duo Match.
          </h2>
          <p className="text-sm text-rose-100/45 leading-relaxed mt-2 max-w-xs mx-auto">
            A curadoria aprova cada perfil antes do acesso. Ao escolher o plano,
            você será levado à página de pagamento.
          </p>
        </div>

        {planState.subscription && (
          <div
            className={`mb-4 rounded-2xl border px-4 py-3 text-xs ${
              isSubscriptionActive(planState.subscription)
                ? 'border-emerald-700/30 bg-emerald-950/20 text-emerald-200/80'
                : 'border-amber-700/30 bg-amber-950/20 text-amber-200/80'
            }`}
          >
            Plano atual: <strong>{planState.plan?.name || 'selecionado'}</strong> ·{' '}
            {PLAN_STATUS_LABELS[planState.subscription.status] ||
              planState.subscription.status}
          </div>
        )}

        {usingFallback && (
          <div className="mb-4 rounded-2xl border border-amber-700/25 bg-amber-950/20 px-4 py-3 text-[11px] text-amber-200/70 leading-relaxed">
            Exibindo a prévia dos planos. Rode o SQL de consolidação do briefing
            no Supabase para habilitar a seleção.
          </div>
        )}

        {loadingPlans ? (
          <div className="space-y-4">
            {[0, 1].map((item) => (
              <div
                key={item}
                className="h-72 rounded-[28px] border border-white/5 bg-white/[0.035] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map((plan) => {
              const features = normalizeFeatures(plan.features);
              const isCurrent =
                planState.subscription?.plan_id === plan.id &&
                isSubscriptionActive(planState.subscription);
              const isPending =
                planState.subscription?.plan_id === plan.id &&
                planState.subscription?.status === 'pending_payment';
              const highlight = plan.highlight || isPlanSelect(plan);

              return (
                <article
                  key={plan.id || plan.slug}
                  className={`relative overflow-hidden rounded-[28px] border p-6 ${
                    highlight
                      ? 'border-rose-500/40 bg-[#1a0205]'
                      : 'border-white/[0.08] bg-white/[0.035]'
                  }`}
                >
                  <div className="relative">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-2xl font-serif text-rose-50">
                            {plan.name}
                          </h3>
                          {highlight && (
                            <span className="rounded-full bg-rose-600/20 border border-rose-500/30 px-2 py-0.5 text-[8px] uppercase tracking-widest text-rose-200">
                              Mais escolhido
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-rose-100/45 leading-relaxed mt-2 max-w-[280px]">
                          {plan.description || 'Uma experiência Duo Match.'}
                        </p>
                      </div>
                      {isCurrent && (
                        <span className="shrink-0 rounded-full border border-emerald-600/30 bg-emerald-950/30 px-2.5 py-1 text-[9px] uppercase tracking-widest text-emerald-200/80">
                          Ativo
                        </span>
                      )}
                    </div>

                    <div className="flex items-end gap-1.5 mt-5">
                      <span className="text-3xl font-serif text-rose-50">
                        {formatPrice(plan.price)}
                      </span>
                      <span className="text-xs text-rose-100/35 mb-1">
                        /{plan.interval === 'year' ? 'ano' : 'mês'}
                      </span>
                    </div>

                    <div className="h-px bg-white/[0.07] my-5" />

                    <ul className="space-y-2.5 mb-6">
                      {features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5">
                          <span
                            className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                              highlight
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-white/[0.06] text-rose-200/60'
                            }`}
                          >
                            <Check size={10} />
                          </span>
                          <span className="text-xs text-rose-100/65 leading-relaxed">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      onClick={() => selectPlan(plan)}
                      disabled={
                        selecting === plan.id ||
                        isCurrent ||
                        isPending ||
                        (planState.subscription &&
                          isSubscriptionActive(planState.subscription) &&
                          planState.subscription.plan_id !== plan.id)
                      }
                      className={`w-full rounded-full py-3.5 text-sm font-semibold transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2 ${
                        highlight
                          ? 'bg-[#f4ece8] text-[#3a1c1c] hover:bg-white'
                          : 'border border-white/15 text-rose-50 hover:bg-white/5'
                      }`}
                    >
                      {selecting === plan.id ? (
                        <>
                          <Loader2 size={15} className="animate-spin" /> Salvando...
                        </>
                      ) : isCurrent ? (
                        'Plano atual'
                      ) : isPending ? (
                        'Plano selecionado'
                      ) : (
                        <>
                          <CreditCard size={15} /> Escolher {plan.name}
                        </>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-7 rounded-3xl border border-white/[0.07] bg-white/[0.03] p-5 space-y-3">
          <InfoRow
            icon={ShieldCheck}
            title="Curadoria antes do acesso"
            text="Cada perfil é aprovado manualmente antes de aparecer no Descobrir."
          />
          <InfoRow
            icon={Lock}
            title="Pagamento seguro"
            text="Você é direcionado à página de pagamento para concluir a assinatura de forma segura."
          />
          <InfoRow
            icon={Sparkles}
            title="Cancele quando quiser"
            text="O gerenciamento da assinatura será liberado junto com o pagamento."
          />
        </div>
      </div>

      {confirmation && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-[28px] border border-white/10 bg-[#171719] p-6 text-center animate-scale-in">
            <div className="w-14 h-14 rounded-full bg-rose-950/60 border border-rose-800/30 flex items-center justify-center mx-auto mb-4">
              <Check size={24} className="text-rose-300" />
            </div>
            <h2 className="text-2xl font-serif text-rose-50 mb-2">
              Plano selecionado
            </h2>
            <p className="text-sm text-rose-100/55 leading-relaxed">
              Você escolheu o <strong>{confirmation.plan.name}</strong>.
            </p>
            <p className="text-xs text-amber-200/60 leading-relaxed mt-3">
              Abrimos a página de pagamento em uma nova aba. Conclua lá;
              a curadoria ativa sua assinatura assim que o pagamento for confirmado.
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <a
                href={PAYMENT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full rounded-full bg-[#f4ece8] py-3.5 text-sm font-semibold text-[#3a1c1c] hover:bg-white transition-colors inline-flex items-center justify-center gap-2"
              >
                <CreditCard size={15} /> Ir para o pagamento
              </a>
              <button
                type="button"
                onClick={() => setConfirmation(null)}
                className="text-xs text-rose-200/55 hover:text-rose-100 underline underline-offset-4"
              >
                Voltar aos planos
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

function InfoRow({ icon: Icon, title, text }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.07] flex items-center justify-center shrink-0">
        <Icon size={14} className="text-rose-200/60" />
      </div>
      <div>
        <p className="text-xs text-rose-50/75">{title}</p>
        <p className="text-[10px] text-rose-100/35 leading-relaxed mt-0.5">
          {text}
        </p>
      </div>
    </div>
  );
}
