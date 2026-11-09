import { Check, Heart, Lock, Sparkles } from 'lucide-react';

const BENEFITS = [
  'Veja perfis completos antes de decidir quem você quer conhecer',
  'Matches ilimitados com curadoria real',
  'Conversas privadas e seguras com quem deu match com você',
  'Cancele quando quiser, sem multa e sem letras miúdas',
];

export default function PaywallScreen({ onOpenPlans, onOpenProfile }) {
  return (
    <div className="min-h-[70vh] text-[#f8e3d8] flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="w-16 h-16 rounded-2xl border border-rose-800/40 bg-rose-950/30 flex items-center justify-center mb-6">
        <Lock size={26} className="text-rose-200/80" />
      </div>

      <h1 className="font-serif text-3xl text-rose-50 leading-tight mb-3">
        Esta área é dos assinantes
      </h1>
      <p className="text-sm text-rose-100/60 max-w-xs leading-relaxed mb-7">
        Sua curadoria já foi aprovada — agora falta só ativar o Duo Match
        para desbloquear perfis completos, conversas e matches.
      </p>

      <ul className="w-full max-w-sm space-y-3 text-left mb-8">
        {BENEFITS.map((benefit) => (
          <li key={benefit} className="flex items-start gap-2.5 text-[13px] text-rose-100/75 leading-snug">
            <Check size={15} className="text-emerald-300/80 mt-0.5 shrink-0" />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>

      <div className="w-full max-w-sm rounded-3xl border border-rose-800/40 bg-rose-950/20 px-5 py-4 mb-6">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-3xl font-serif text-rose-50">R$ 49,90</span>
          <span className="text-xs text-rose-100/55">/ mês</span>
        </div>
        <p className="text-[10px] uppercase tracking-widest text-rose-200/50 mt-1.5 inline-flex items-center gap-1.5 justify-center">
          <Sparkles size={11} /> Plano Duo Match · assinatura única
        </p>
      </div>

      <button
        type="button"
        onClick={onOpenPlans}
        className="w-full max-w-sm rounded-full bg-[#f4ece8] py-4 text-sm font-semibold text-[#3a1c1c] hover:bg-white transition-colors inline-flex items-center justify-center gap-2"
      >
        <Heart size={16} /> Assinar por R$ 49,90/mês
      </button>
      <button
        type="button"
        onClick={onOpenProfile}
        className="mt-3 text-xs text-rose-200/55 hover:text-rose-100 underline underline-offset-4"
      >
        Ver meu perfil (gratuito)
      </button>
    </div>
  );
}
