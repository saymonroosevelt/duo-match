import { LogOut, Mail, ShieldX } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function RejectedApproval() {
  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  return (
    <div className="min-h-[100dvh] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">

      <div className="relative z-10 max-w-sm w-full text-center">
        <div className="w-20 h-20 rounded-full border border-red-900/30 bg-red-950/30 flex items-center justify-center mx-auto mb-6">
          <ShieldX size={34} className="text-red-200/70" />
        </div>

        <h1 className="text-3xl font-serif mb-3 text-rose-50 leading-tight">
          Curadoria concluÃ­da
        </h1>
        <p className="text-rose-100/55 mb-8 leading-relaxed text-sm">
          Neste momento, seu perfil nÃ£o foi aprovado para a Ã¡rea de membros. Isso
          pode acontecer por informaÃ§Ãµes incompletas ou por critÃ©rios da curadoria.
        </p>

        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.035] p-5 mb-8 text-left">
          <p className="text-[10px] uppercase tracking-widest text-rose-300/50 mb-2">
            O que vocÃª pode fazer
          </p>
          <ul className="space-y-2 text-xs text-rose-100/50 leading-relaxed">
            <li>Â· Revise suas informaÃ§Ãµes e tente novamente com dados completos.</li>
            <li>Â· Fale com a curadoria para entender o que pode ser ajustado.</li>
            <li>Â· VocÃª pode sair da conta e criar um novo cadastro com outro e-mail.</li>
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
