import { ArrowUpRight } from 'lucide-react';
import { COMMUNITIES } from '../lib/constants';
import BackButton from '../components/BackButton';

export default function Interests({
  onBack,
  onSelectInterest,
}: {
  onBack?: () => void;
  onSelectInterest?: (interest: string) => void;
}) {
  return (
    <div className="min-h-[100dvh] text-white">
      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#150408]">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between">
          {onBack ? <BackButton onClick={onBack} /> : <div className="w-16" />}
          <h1 className="text-xl font-serif text-rose-50">Interesses</h1>
          <div className="w-16" />
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 pt-6 pb-16">
        <div className="mb-7 px-1">
          <p className="text-[10px] uppercase tracking-[0.25em] text-rose-300/50 mb-2">
            Comunidades Duo Match
          </p>
          <h2 className="text-3xl font-serif text-rose-50 leading-tight">
            Encontre pessoas que gostam das mesmas coisas que você.
          </h2>
          <p className="text-sm text-rose-100/40 leading-relaxed mt-3">
            Toque em um interesse para ver perfis aprovados que compartilham essa
            paixão.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {COMMUNITIES.map((community) => (
            <button
              key={community.name}
              type="button"
              onClick={() => onSelectInterest?.(community.filter || community.name)}
              className="group relative h-52 rounded-[30px] overflow-hidden border border-white/[0.07] cursor-pointer shadow-2xl shadow-black/40 transition-transform active:scale-[0.98] text-left"
            >
              <img
                src={community.image}
                alt={community.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                style={community.position ? { objectPosition: community.position } : undefined}
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent" />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/5 rounded-[30px]" />

              <div className="absolute bottom-0 left-0 p-6 w-full flex items-end justify-between gap-4">
                <div>
                  <h3 className="font-serif text-2xl text-white tracking-wide mb-1">
                    {community.name}
                  </h3>
                  <p className="text-white/60 text-xs font-light">
                    {community.desc}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-full bg-white/10 backdrop-blur border border-white/15 flex items-center justify-center text-white/80 group-hover:bg-white group-hover:text-[#3a1c1c] transition-colors shrink-0">
                  <ArrowUpRight size={16} />
                </div>
              </div>
            </button>
          ))}
        </div>

        <p className="text-center text-[10px] uppercase tracking-[0.2em] text-rose-100/20 mt-8">
          Curadoria privada · Duo Match
        </p>
      </div>
    </div>
  );
}
