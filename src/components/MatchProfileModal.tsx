import {
  ArrowLeft,
  CheckCircle2,
  Heart,
  MapPin,
  Sparkles,
} from 'lucide-react';
import Avatar from './Avatar';
import { asArray, formatDate } from '../lib/helpers';

export default function MatchProfileModal({
  profile,
  onClose,
}: {
  profile: any;
  onClose: () => void;
}) {
  if (!profile) return null;

  const interests = asArray(profile.intentions);
  const values = asArray(profile.values_inegotiable);

  return (
    <div className="fixed inset-0 z-[130] overflow-y-auto bg-[#120306] text-white">
      <header className="sticky top-0 z-10 border-b border-white/[0.07] bg-[#150408]/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-rose-100/70 transition-colors hover:bg-white/5"
            aria-label="Fechar perfil"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-serif text-lg text-rose-50">Perfil</h1>
        </div>
      </header>

      <div className="mx-auto max-w-md px-5 pb-10 pt-5">
        <section className="relative overflow-hidden rounded-[32px] border border-white/[0.07] bg-[#1a0205] p-6 text-center">
          <Avatar
            src={profile.photo_url}
            name={profile.full_name}
            size="xl"
          />

          <h2 className="mt-4 font-serif text-3xl leading-tight text-rose-50">
            {profile.full_name || 'Perfil'}
            {profile.age ? `, ${profile.age}` : ''}
          </h2>

          <p className="mt-1.5 flex items-center justify-center gap-1.5 text-xs text-rose-100/45">
            <MapPin size={13} />
            {profile.city || 'Cidade não informada'}
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-700/30 bg-emerald-950/30 px-3 py-1.5 text-[10px] uppercase tracking-widest text-emerald-200/80">
              <CheckCircle2 size={12} /> Membro aprovado
            </span>
          </div>

          {profile.created_at && (
            <p className="mt-4 text-[10px] text-rose-100/25">
              Membro desde {formatDate(profile.created_at, { year: 'numeric' })}
            </p>
          )}
        </section>

        <section className="mt-4 rounded-3xl border border-white/[0.07] bg-white/[0.035] p-5">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles size={14} className="text-rose-400/80" />
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-rose-100/45">
              Sobre
            </h3>
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-rose-100/70">
            {profile.bio || 'Este perfil ainda não adicionou uma descrição.'}
          </p>
        </section>

        {profile.what_procura && (
          <section className="mt-3 rounded-3xl border border-rose-800/30 bg-rose-950/25 p-5">
            <div className="mb-1.5 flex items-center gap-2">
              <Heart size={14} className="text-rose-400" />
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-rose-300/60">
                O que busca
              </h3>
            </div>
            <p className="text-sm text-rose-50/90">{profile.what_procura}</p>
          </section>
        )}

        {interests.length > 0 && (
          <section className="mt-3 rounded-3xl border border-white/[0.07] bg-white/[0.035] p-5">
            <h3 className="mb-3 text-[10px] uppercase tracking-[0.2em] text-rose-100/45">
              Interesses
            </h3>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => (
                <span
                  key={interest}
                  className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-rose-100/65"
                >
                  {interest}
                </span>
              ))}
            </div>
          </section>
        )}

        {values.length > 0 && (
          <section className="mt-3 rounded-3xl border border-white/[0.07] bg-white/[0.035] p-5">
            <h3 className="mb-3 text-[10px] uppercase tracking-[0.2em] text-rose-100/45">
              Valores inegociáveis
            </h3>
            <div className="flex flex-wrap gap-2">
              {values.map((value) => (
                <span
                  key={value}
                  className="rounded-full border border-rose-800/30 bg-rose-950/30 px-3 py-1.5 text-xs text-rose-200/75"
                >
                  {value}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
