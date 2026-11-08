import { LogOut, Mail, ShieldX } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function RejectedApproval() {
  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  return (
    <div className="min-h-[100dvh] bg-[#0a0000] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1f0408 0%, #0d0103 100%)' }}>
      <div className="absolute top-1/3 w-full h-1/2 bg-rose-900/10 blur-[110px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-sm w-full text-center">
        <div className="w-20 h-20 rounded-full border border-red-900/30 bg-red-950/30 flex items-center justify-center mx-auto mb-6">
          <ShieldX size={34} className="text-red-200/70" />
        </div>

        <h1 className="text-3xl font-serif mb-3 text-rose-50 leading-tight">
          Curadoria concluída
        </h1>
        <p className="text-rose-100/55 mb-8 leading-relaxed text-sm">
          Neste momento, seu perfil não foi aprovado para a área de membros. Isso
          pode acontecer por informações incompletas ou por critérios da curadoria.
        </p>

        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.035] p-5 mb-8 text-left">
          <p className="text-[10px] uppercase tracking-widest text-rose-300/50 mb-2">
            O que você pode fazer
          </p>
          <ul className="space-y-2 text-xs text-rose-100/50 leading-relaxed">
            <li>· Revise suas informações e tente novamente com dados completos.</li>
            <li>· Fale com a curadoria para entender o que pode ser ajustado.</li>
            <li>· Você pode sair da conta e criar um novo cadastro com outro e-mail.</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <a
            href="mailto:curadoria@duomatch.app?subject=Revis%C3%A3o%20de%20perfil%20Duo%20Match"
            className="w-full rounded-full bg-[#f4ece8] py-4 text-sm font-semibold text-[#3a1c1c] hover:bg-white transition-colors inline-flex items-center justify-center gap-2"
          >
            <Mail size={15} /> Falar com a curadoria
          </a>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-full border border-white/15 py-3.5 text-sm text-rose-100/60 hover:bg-white/5 transition-colors inline-flex items-center justify-center gap-2"
          >
            <LogOut size={15} /> Sair da conta
          </button>
        </div>
      </div>
    </div>
  );
}
