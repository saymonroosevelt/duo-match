import { Heart } from 'lucide-react';

export default function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  icon: Icon = Heart,
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-16">
      <div className="w-16 h-16 rounded-full bg-rose-950/50 border border-rose-900/40 flex items-center justify-center mb-5">
        <Icon size={26} className="text-rose-300/80" />
      </div>
      <h3 className="text-2xl font-serif text-rose-50 mb-2">{title}</h3>
      <p className="text-sm text-rose-100/50 leading-relaxed max-w-xs mb-6">
        {description}
      </p>
      <div className="flex flex-col gap-3 w-full max-w-[240px]">
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="w-full bg-[#f4ece8] text-[#3a1c1c] py-3 rounded-full font-semibold text-sm hover:bg-white transition-colors"
          >
            {actionLabel}
          </button>
        )}
        {secondaryLabel && onSecondary && (
          <button
            type="button"
            onClick={onSecondary}
            className="w-full border border-white/15 text-rose-100/80 py-3 rounded-full font-medium text-sm hover:bg-white/5 transition-colors"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
