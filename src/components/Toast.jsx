import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(onClose, 4200);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isError = toast.type === 'error';
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-[120] w-[calc(100%-2rem)] max-w-sm animate-slide-up">
      <div
        className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl ${
          isError
            ? 'border-red-500/30 bg-red-950/80 text-red-100'
            : 'border-rose-400/20 bg-[#1C1C1E]/95 text-rose-50'
        }`}
      >
        <Icon size={18} className="mt-0.5 shrink-0" />
        <p className="text-sm leading-snug flex-1">{toast.message}</p>
        <button
          type="button"
          onClick={onClose}
          className="text-white/40 hover:text-white transition-colors"
          aria-label="Fechar aviso"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
