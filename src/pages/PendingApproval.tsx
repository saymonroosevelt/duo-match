import { Check, Clock, Lock, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function PendingApproval() {
  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  return (
    <div className="min-h-[100dvh] bg-[#0a0000] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1f0408 0%, #0d0103 100%)' }}>
      <div className="absolute top-1/3 w-full h-1/2 bg-rose-900/15 blur-[110px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-sm w-full">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full border border-rose-800/30 bg-rose-950/40 flex items-center justify-center">
            <ShieldCheck size={34} className="text-rose-200/80" />
          </div>
        </div>

        <h1 className="text-4xl font-serif mb-3 text-rose-50 text-center leading-tight">
          Perfil em análise
        </h1>
        <p className="text-rose-100/55 mb-8 leading-relaxed text-center text-sm">
          Nossa curadoria está verificando seus dados com cuidado. O acesso ao
          Descobrir, matches e conversas é liberado somente após a aprovação.
        </p>

        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.035] p-5 mb-8">
          <TimelineItem
            icon={Check}
            title="Cadastro recebido"
            description="Seus dados foram enviados com segurança."
            state="done"
          />
          <TimelineItem
            icon={Clock}
            title="Curadoria em andamento"
            description="Nossa equipe avalia perfil, intenções e interesses."
            state="active"
          />
          <TimelineItem
            icon={Lock}
            title="Acesso liberado"
            description="Você poderá explorar, dar match e conversar."
            state="locked"
            last
          />
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full rounded-full bg-[#f4ece8] py-4 text-sm font-semibold text-[#3a1c1c] hover:bg-white transition-colors inline-flex items-center justify-center gap-2"
          >
            <RefreshCw size={15} /> Verificar novamente
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-full border border-white/15 py-3.5 text-sm text-rose-100/60 hover:bg-white/5 transition-colors inline-flex items-center justify-center gap-2"
          >
            <LogOut size={15} /> Sair da conta
          </button>
        </div>

        <p className="text-center text-[10px] text-rose-100/25 mt-6 leading-relaxed">
          A análise é manual e pode levar alguns minutos. Não é necessário pagar
          para participar da curadoria.
        </p>
      </div>
    </div>
  );
}

function TimelineItem({ icon: Icon, title, description, state, last = false }) {
  const styles = {
    done: 'bg-emerald-950/40 border-emerald-700/30 text-emerald-300',
    active: 'bg-rose-950/50 border-rose-700/40 text-rose-300',
    locked: 'bg-white/[0.03] border-white/10 text-rose-100/30',
  };

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${
            styles[state] || styles.locked
          }`}
        >
          <Icon size={14} />
        </div>
        {!last && <div className="w-px flex-1 bg-white/[0.07] my-1.5" />}
      </div>
      <div className={`pb-5 ${last ? 'pb-0' : ''}`}>
        <p
          className={`text-sm ${
            state === 'locked' ? 'text-rose-100/35' : 'text-rose-50/85'
          }`}
        >
          {title}
        </p>
        <p className="text-[11px] text-rose-100/35 leading-relaxed mt-0.5">
          {description}
        </p>
      </div>
    </div>
  );
}
