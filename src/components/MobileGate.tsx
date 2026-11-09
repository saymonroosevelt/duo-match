import { useEffect, useState, type ReactNode } from 'react';
import { Check, Copy, ShieldAlert, Smartphone } from 'lucide-react';

const APP_URL = 'https://duomatchapp.vercel.app';

function hasDesktopBypass() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('admin') === 'true' || params.get('desktop') === '1';
}

export default function MobileGate({ children }: { children: ReactNode }) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(max-width: 767px)').matches;
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const onChange = () => setIsMobile(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  if (isMobile || hasDesktopBypass()) {
    return <>{children}</>;
  }

  async function copyAppLink() {
    try {
      await navigator.clipboard.writeText(APP_URL);
      setCopied(true);
      return;
    } catch {
      const input = document.createElement('textarea');
      input.value = APP_URL;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
    }
  }

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#120306] px-6 py-10 text-white">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-rose-600/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-rose-900/20 blur-3xl" />

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="mb-10 flex items-baseline justify-center gap-1.5">
          <span className="font-serif text-3xl tracking-tighter text-rose-50">
            match
          </span>
          <span className="mb-1 h-1.5 w-1.5 rounded-full bg-rose-500/80" />
        </div>

        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-rose-800/30 bg-rose-950/40">
          <Smartphone size={32} className="text-rose-300" />
        </div>

        <h1 className="font-serif text-3xl leading-tight text-rose-50">
          Uma experiência para o seu celular.
        </h1>
        <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-rose-100/50">
          O Duo Match foi feito para ser vivido no smartphone. Abra este link no
          seu celular para entrar, conversar e dar match.
        </p>

        <button
          type="button"
          onClick={copyAppLink}
          className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#f4ece8] py-4 text-sm font-semibold text-[#3a1c1c] transition-colors hover:bg-white"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Link copiado!' : 'Copiar link do app'}
        </button>

        <p className="mt-3 break-all text-[11px] text-rose-100/30">
          {APP_URL}
        </p>

        <div className="mt-10 border-t border-white/[0.06] pt-5">
          <a
            href="/?admin=true"
            className="inline-flex items-center gap-1.5 text-[11px] text-rose-200/35 transition-colors hover:text-rose-200/60"
          >
            <ShieldAlert size={13} /> Acesso da curadoria
          </a>
        </div>
      </div>
    </main>
  );
}
