import {
  CheckCircle,
  ChevronRight,
  CreditCard,
  LogOut,
  MapPin,
  Pencil,
  Shield,
  ShieldAlert,
  Sparkles,
  Users,
  Heart,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { asArray, formatDate, isSubscriptionActive, profilePhotos } from '../lib/helpers';
import { PLAN_STATUS_LABELS } from '../lib/constants';
import Avatar from '../components/Avatar';
import usePlan from '../lib/usePlan';

export default function ProfileView({
  profile,
  onEdit,
  onOpenPlans,
  onOpenInterests,
  onOpenPrivacy,
  onOpenAdmin,
  isAdmin = false,
}: {
  profile: any;
  onEdit: () => void;
  onOpenPlans: () => void;
  onOpenInterests: () => void;
  onOpenPrivacy: () => void;
  onOpenAdmin?: () => void;
  isAdmin?: boolean;
}) {
  const planState = usePlan(profile?.id);
  const interests = asArray(profile?.intentions);
  const values = asArray(profile?.values_inegotiable);
  const gallery = profilePhotos(profile);
  const active = isSubscriptionActive(planState.subscription);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  if (!profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-rose-100/40 font-serif">
        Carregando perfil...
      </div>
    );
  }

  return (
    <div className="min-h-full text-white px-5 pt-5 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-3xl font-serif text-rose-50 tracking-tight">Perfil</h1>
            <p className="text-rose-100/40 text-xs mt-1">Sua presença no Duo Match.</p>
          </div>
          <button
            type="button"
            onClick={onEdit}
            className="w-11 h-11 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-rose-100/80 hover:bg-white/10 transition-colors"
            aria-label="Editar perfil"
          >
            <Pencil size={17} />
          </button>
        </div>

        <section className="relative overflow-hidden rounded-[32px] border border-white/[0.07] bg-[#1a0205] p-6 text-center">
          <div className="relative">
            <div className="relative inline-block">
              <Avatar src={profile.photo_url} name={profile.full_name} size="xl" />
              <button
                type="button"
                onClick={onEdit}
                className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-[#f4ece8] text-[#3a1c1c] flex items-center justify-center border-4 border-[#0F0F10]"
                aria-label="Trocar foto"
              >
                <Pencil size={13} />
              </button>
            </div>

            <h2 className="font-serif text-3xl text-rose-50 mt-4 leading-tight">
              {profile.full_name}
              {profile.age ? `, ${profile.age}` : ''}
            </h2>

            <p className="text-xs text-rose-100/45 flex items-center justify-center gap-1.5 mt-1.5">
              <MapPin size={13} />
              {profile.city || 'Cidade não informada'}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-700/30 bg-emerald-950/30 px-3 py-1.5 text-[10px] uppercase tracking-widest text-emerald-200/80">
                <CheckCircle size={12} /> Membro aprovado
              </span>
              {isAdmin && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-700/30 bg-amber-950/30 px-3 py-1.5 text-[10px] uppercase tracking-widest text-amber-200/80">
                  <ShieldAlert size={12} /> Curadoria
                </span>
              )}
            </div>

            {profile.created_at && (
              <p className="text-[10px] text-rose-100/25 mt-4">
                Membro desde {formatDate(profile.created_at, { year: 'numeric' })}
              </p>
            )}
          </div>
        </section>

        {gallery.length > 1 && (
          <section className="mt-4">
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-rose-100/40">
                Suas fotos · {gallery.length}/5
              </h3>
              <button
                type="button"
                onClick={onEdit}
                className="text-[10px] uppercase tracking-widest text-rose-300/60 hover:text-rose-200 transition-colors"
              >
                Editar galeria
              </button>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-1 snap-x">
              {gallery.map((url: string) => (
                <img
                  key={url}
                  src={url}
                  alt="Foto do seu perfil"
                  className="h-48 w-36 shrink-0 snap-start rounded-2xl object-cover border border-white/10 bg-white/[0.03]"
                  onError={(event) => {
                    (event.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ))}
            </div>
          </section>
        )}

        <section className="mt-4 rounded-3xl border border-white/[0.07] bg-white/[0.035] p-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-rose-400/80" />
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-rose-100/45">
              Sobre você
            </h3>
          </div>
          <p className="text-sm text-rose-100/70 leading-relaxed whitespace-pre-line">
            {profile.bio || 'Adicione uma descrição para que as pessoas conheçam você.'}
          </p>
        </section>

        {profile.what_procura && (
          <section className="mt-3 rounded-3xl border border-rose-800/30 bg-rose-950/25 p-5">
            <div className="flex items-center gap-2 mb-1.5">
              <Heart size={14} className="text-rose-400" />
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-rose-300/60">
                O que você busca
              </h3>
            </div>
            <p className="text-sm text-rose-50/90">{profile.what_procura}</p>
          </section>
        )}

        {interests.length > 0 && (
          <section className="mt-3 rounded-3xl border border-white/[0.07] bg-white/[0.035] p-5">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-rose-100/45 mb-3">
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
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-rose-100/45 mb-3">
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

        <section className="mt-4">
          <button
            type="button"
            onClick={onOpenPlans}
            className="w-full rounded-3xl border border-white/[0.07] bg-white/[0.04] p-5 text-left hover:bg-white/[0.06] transition-colors"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-950/60 border border-rose-800/30 flex items-center justify-center">
                  <CreditCard size={17} className="text-rose-300" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-rose-100/35">
                    Seu plano
                  </p>
                  <p className="text-sm text-rose-50">
                    {planState.loading
                      ? 'Carregando...'
                      : planState.plan?.name || 'Escolha seu plano'}
                  </p>
                  {planState.subscription && (
                    <p
                      className={`text-[10px] mt-0.5 ${
                        active ? 'text-emerald-300/70' : 'text-amber-300/60'
                      }`}
                    >
                      {PLAN_STATUS_LABELS[planState.subscription.status] ||
                        planState.subscription.status}
                    </p>
                  )}
                </div>
              </div>
              <ChevronRight size={17} className="text-rose-100/25" />
            </div>
          </button>
        </section>

        <section className="mt-4 overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.035] divide-y divide-white/[0.06]">
          <MenuRow
            icon={Pencil}
            label="Editar perfil"
            description="Foto, bio, intenções e interesses"
            onClick={onEdit}
          />
          <MenuRow
            icon={Users}
            label="Comunidades"
            description="Encontre pessoas pelos mesmos interesses"
            onClick={onOpenInterests}
          />
          <MenuRow
            icon={Shield}
            label="Privacidade e dados"
            description="LGPD, termos e exclusão da conta"
            onClick={onOpenPrivacy}
          />
          {isAdmin && onOpenAdmin && (
            <MenuRow
              icon={ShieldAlert}
              label="Painel de curadoria"
              description="Aprovar e revisar perfis"
              onClick={onOpenAdmin}
            />
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.03] transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-red-950/30 border border-red-900/20 flex items-center justify-center">
              <LogOut size={16} className="text-red-300/80" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-red-200/80">Sair da conta</p>
              <p className="text-[10px] text-rose-100/30 mt-0.5">
                Você pode entrar novamente quando quiser
              </p>
            </div>
          </button>
        </section>

        <p className="text-center text-[10px] text-rose-100/20 mt-6">
          Duo Match · Curadoria privada · v1.0
        </p>
      </div>
    </div>
  );
}

function MenuRow({ icon: Icon, label, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.03] transition-colors"
    >
      <div className="w-9 h-9 rounded-full bg-white/[0.05] border border-white/[0.07] flex items-center justify-center">
        <Icon size={16} className="text-rose-200/70" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-rose-50/85">{label}</p>
        <p className="text-[10px] text-rose-100/30 mt-0.5">{description}</p>
      </div>
      <ChevronRight size={16} className="text-rose-100/20" />
    </button>
  );
}
