import { ArrowLeft } from 'lucide-react';

export default function BackButton({ onClick, label = 'Voltar', className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 text-rose-100/70 hover:text-rose-100 transition-colors text-sm font-medium ${className}`}
    >
      <ArrowLeft size={18} />
      <span>{label}</span>
    </button>
  );
}
