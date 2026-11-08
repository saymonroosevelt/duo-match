import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle,
  MapPin,
  X,
  Heart,
  Star,
  SlidersHorizontal,
  Users,
  RefreshCw,
  RotateCcw,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { INTEREST_OPTIONS } from '../lib/constants';
import { asArray, firstName, friendlyError } from '../lib/helpers';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import Toast from '../components/Toast';

const DEFAULT_FILTERS = {
  minAge: 18,
  maxAge: 99,
  city: '',
  interest: '',
};

export default function Explore({
  initialInterest = '',
  onInitialInterestApplied,
  onOpenChat,
  onOpenInterests,
}: {
  initialInterest?: string;
  onInitialInterestApplied?: () => void;
  onOpenChat?: (matchId: number, otherUser: any) => void;
  onOpenInterests?: () => void;
}) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS, interest: initialInterest });
  const [draftFilters, setDraftFilters] = useState({ ...DEFAULT_FILTERS, interest: initialInterest });
  const [filterOpen, setFilterOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [matchInfo, setMatchInfo] = useState<any>(null);
  const [toast, setToast] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!initialInterest) return;
    setFilters((prev) =>
      prev.interest === initialInterest
        ? prev
        : { ...prev, interest: initialInterest },
    );
    setDraftFilters((prev) => ({ ...prev, interest: initialInterest }));
    onInitialInterestApplied?.();
  }, [initialInterest, onInitialInterestApplied]);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    setError('');
    setDetailOpen(false);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    setUserId(user.id);

    // Bloqueios: se a tabela ainda nÃ£o existir, o app continua funcionando.
    let blockedIds = new Set<string>();
    const { data: blockedRows, error: blockedError } = await supabase
      .from('blocks')
      .select('blocker_id,blocked_id')
      .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);

    if (!blockedError) {
      for (const row of blockedRows || []) {
        blockedIds.add(row.blocker_id === user.id ? row.blocked_id : row.blocker_id);
      }
    }

    const { data: interactionRows, error: interactionError } = await supabase
      .from('matches')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (interactionError) {
      setError(friendlyError(interactionError));
      setLoading(false);
      return;
    }

    const acted = new Set<string>();
    const likedYou = new Set<string>();

    for (const row of interactionRows || []) {
      const otherId =
        row.sender_id === user.id ? row.receiver_id : row.sender_id;

      if (row.status === 'rejected' || row.status === 'matched') {
        acted.add(otherId);
      } else if (row.status === 'pending') {
        if (row.sender_id === user.id) acted.add(otherId);
        else likedYou.add(row.sender_id);
      }
    }

    let query = supabase
      .from('profiles')
      .select('*')
      .eq('status', 'approved')
      .neq('id', user.id)
      .order('created_at', { ascending: false });

    if (filters.minAge > 18) query = query.gte('age', filters.minAge);
    if (filters.maxAge < 99) query = query.lte('age', filters.maxAge);
    if (filters.city.trim()) {
      query = query.ilike('city', `%${filters.city.trim()}%`);
    }
    if (filters.interest) {
      query = query.contains('intentions', [filters.interest]);
    }

    const { data, error: profilesError } = await query;

    if (profilesError) {
      setError(friendlyError(profilesError));
      setProfiles([]);
      setLoading(false);
      return;
    }

    const nextProfiles = (data || [])
      .filter((profile) => !blockedIds.has(profile.id) && !acted.has(profile.id))
      .map((profile) => ({ ...profile, likedYou: likedYou.has(profile.id) }));

    setProfiles(nextProfiles);
    setIndex(0);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles, refreshKey]);

  const current = profiles[index] || null;

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.minAge > 18) count += 1;
    if (filters.maxAge < 99) count += 1;
    if (filters.city.trim()) count += 1;
    if (filters.interest) count += 1;
    return count;
  }, [filters]);

  const hasFilters = activeFilterCount > 0;

  function openFilters() {
    setDraftFilters(filters);
    setFilterOpen(true);
  }

  function clearFilters() {
    const reset = { ...DEFAULT_FILTERS };
    setFilters(reset);
    setDraftFilters(reset);
    setFilterOpen(false);
  }

  function applyFilters() {
    const minAge = Math.max(18, Math.min(99, Number(draftFilters.minAge) || 18));
    const maxAge = Math.max(minAge, Math.min(99, Number(draftFilters.maxAge) || 99));
    setFilters({
      ...draftFilters,
      minAge,
      maxAge,
      city: draftFilters.city.trim(),
    });
    setFilterOpen(false);
  }

  function advance() {
    setDetailOpen(false);
    setIndex((value) => value + 1);
  }

  async function handleAction(action: 'pass' | 'like' | 'superlike') {
    if (processing || !current || !userId) return;
    setProcessing(true);

    try {
      const { data: existingRows, error: findError } = await supabase
        .from('matches')
        .select('*')
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${current.id}),and(sender_id.eq.${current.id},receiver_id.eq.${userId})`,
        )
        .limit(1);

      if (findError) throw findError;
      const existing = existingRows?.[0] || null;

      if (action === 'pass') {
        if (existing) {
          if (existing.status !== 'matched') {
            const { error: updateError } = await supabase
              .from('matches')
              .update({ status: 'rejected' })
              .eq('id', existing.id);
            if (updateError) throw updateError;
          }
        } else {
          const { error: insertError } = await supabase.from('matches').insert({
            sender_id: userId,
            receiver_id: current.id,
            status: 'rejected',
          });
          if (insertError) throw insertError;
        }

        advance();
        return;
      }

      if (existing) {
        if (existing.status === 'matched') {
          setToast({ type: 'success', message: 'VocÃªs jÃ¡ sÃ£o um match.' });
          advance();
          return;
        }

        if (existing.sender_id === userId) {
          setToast({
            type: 'success',
            message:
              action === 'superlike'
                ? 'Seu destaque jÃ¡ foi enviado.'
                : 'VocÃª jÃ¡ demonstrou interesse nessa pessoa.',
          });
          advance();
          return;
        }

        // A outra pessoa jÃ¡ curtiu: agora o match Ã© recÃ­proco.
        const { error: matchError } = await supabase
          .from('matches')
          .update({ status: 'matched' })
          .eq('id', existing.id);

        if (matchError) throw matchError;

        setMatchInfo({ matchId: existing.id, otherUser: current });
        advance();
        return;
      }

      const { error: likeError } = await supabase.from('matches').insert({
        sender_id: userId,
        receiver_id: current.id,
        status: 'pending',
      });

      if (likeError) throw likeError;

      setToast({
        type: 'success',
        message:
          action === 'superlike'
            ? `Destaque enviado para ${firstName(current.full_name)}.`
            : 'Interesse enviado. Se for recÃ­proco, vira match.',
      });
      advance();
    } catch (actionError) {
      setToast({ type: 'error', message: friendlyError(actionError) });
    } finally {
      setProcessing(false);
    }
  }

  const allSeen = !loading && profiles.length > 0 && index >= profiles.length;

  return (
    <div className="min-h-full bg-[#0F0F10] text-white px-4 pt-4 pb-6" style={{ background: '#0f0a0d' }}>
      <div className="max-w-md mx-auto w-full flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-serif text-rose-50 tracking-tight">Descobrir</h1>
          <p className="text-rose-100/40 text-xs mt-1">
            Pessoas aprovadas pela curadoria Duo Match.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openFilters}
            className="relative w-11 h-11 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-rose-100/80 hover:bg-white/10 transition-colors"
            aria-label="Abrir filtros"
          >
            <SlidersHorizontal size={18} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={onOpenInterests}
            className="w-11 h-11 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-rose-100/80 hover:bg-white/10 transition-colors"
            aria-label="Abrir comunidades"
          >
            <Users size={18} />
          </button>
        </div>
      </div>

      {hasFilters && (
        <div className="max-w-md mx-auto w-full mb-3 flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {filters.interest && (
              <span className="text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full bg-rose-950/60 border border-rose-800/40 text-rose-200">
                {filters.interest}
              </span>
            )}
            {filters.city.trim() && (
              <span className="text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-rose-100/60">
                {filters.city}
              </span>
            )}
            {(filters.minAge > 18 || filters.maxAge < 99) && (
              <span className="text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-rose-100/60">
                {filters.minAge}â€“{filters.maxAge} anos
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={clearFilters}
            className="text-[10px] uppercase tracking-widest text-rose-300/70 hover:text-rose-200 flex items-center gap-1 shrink-0"
          >
            <RotateCcw size={12} /> Limpar
          </button>
        </div>
      )}

      {error ? (
        <div className="max-w-md mx-auto mt-10 rounded-3xl border border-red-500/20 bg-red-950/20 p-6 text-center">
          <p className="text-red-200/90 text-sm leading-relaxed">{error}</p>
          <button
            type="button"
            onClick={() => setRefreshKey((key) => key + 1)}
            className="mt-5 inline-flex items-center gap-2 text-rose-200 text-sm border border-white/15 rounded-full px-5 py-2.5 hover:bg-white/5"
          >
            <RefreshCw size={15} /> Tentar novamente
          </button>
        </div>
      ) : loading ? (
        <div className="max-w-md mx-auto">
          <div className="h-[calc(100vh-310px)] min-h-[420px] max-h-[640px] rounded-[36px] bg-white/[0.04] border border-white/5 animate-pulse" />
          <p className="text-center text-rose-100/30 text-sm mt-6 font-serif">
            A curadoria estÃ¡ preparando novos perfis...
          </p>
        </div>
      ) : profiles.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={hasFilters ? 'Nenhum perfil com esses filtros' : 'Novas conexÃµes em breve'}
          description={
            hasFilters
              ? 'Tente ampliar a idade, mudar a cidade ou remover o interesse selecionado.'
              : 'Assim que novas pessoas forem aprovadas pela curadoria, elas aparecerÃ£o aqui. VocÃª tambÃ©m pode explorar comunidades de interesse.'
          }
          actionLabel="Atualizar"
          onAction={() => setRefreshKey((key) => key + 1)}
          secondaryLabel={hasFilters ? 'Limpar filtros' : 'Explorar comunidades'}
          onSecondary={hasFilters ? clearFilters : onOpenInterests}
        />
      ) : allSeen ? (
        <EmptyState
          icon={Heart}
          title="VocÃª viu todos por agora"
          description="Novos perfis aprovados aparecem aqui. Enquanto isso, dÃª uma olhada nas comunidades ou revise seus matches."
          actionLabel="Atualizar"
          onAction={() => setRefreshKey((key) => key + 1)}
          secondaryLabel={hasFilters ? 'Ajustar filtros' : undefined}
          onSecondary={hasFilters ? openFilters : undefined}
        />
      ) : (
        <div className="max-w-md mx-auto">
          <div className="relative h-[calc(100vh-310px)] min-h-[420px] max-h-[640px] rounded-[36px] overflow-hidden border border-white/10 shadow-2xl shadow-black/60 bg-[#1C1C1E]">
            {current.photo_url ? (
              <img
                src={current.photo_url}
                alt={current.full_name || 'Perfil'}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-[#1a0205] flex flex-col items-center justify-center">
                <div className="w-28 h-28 rounded-full border border-rose-200/20 bg-black/20 flex items-center justify-center font-serif text-5xl text-rose-100/70">
                  {(current.full_name || 'â™¡').trim().charAt(0).toUpperCase()}
                </div>
                <p className="text-rose-100/30 text-xs uppercase tracking-[0.25em] mt-5">
                  Foto em breve
                </p>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

            <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-2">
              <div className="flex flex-col gap-2">
                {current.likedYou && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600/90 backdrop-blur px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-white shadow-lg">
                    <Heart size={12} fill="white" /> Curtiu vocÃª
                  </span>
                )}
                {current.is_verified && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-rose-100 border border-white/10">
                    <CheckCircle size={12} /> Verificado
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDetailOpen(true)}
                className="inline-flex items-center gap-1 rounded-full bg-black/35 backdrop-blur px-3 py-1.5 text-[10px] uppercase tracking-widest text-white/80 border border-white/10"
              >
                Ver perfil <ChevronRight size={13} />
              </button>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-6 space-y-3">
              <div className="flex items-end gap-2">
                <h2 className="text-3xl font-serif text-white tracking-tight leading-none">
                  {current.full_name}
                  {current.age ? `, ${current.age}` : ''}
                </h2>
                {current.is_verified && (
                  <CheckCircle size={19} className="text-sky-400 fill-sky-400/20 mb-1" />
                )}
              </div>

              <div className="flex items-center gap-1.5 text-white/60 text-xs">
                <MapPin size={13} />
                <span>{current.city || 'LocalizaÃ§Ã£o nÃ£o informada'}</span>
              </div>

              {current.what_procura && (
                <div className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-rose-950/60 border border-rose-800/40 px-3 py-1.5">
                  <span className="text-[9px] uppercase tracking-widest text-rose-300/80">
                    Busca
                  </span>
                  <span className="text-[10px] text-rose-100/90 truncate">
                    {current.what_procura}
                  </span>
                </div>
              )}

              {asArray(current.intentions).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {asArray(current.intentions).slice(0, 3).map((interest: string) => (
                    <span
                      key={interest}
                      className="bg-white/10 backdrop-blur-md text-white/80 text-[9px] px-2.5 py-1 rounded-full border border-white/10 uppercase tracking-wider"
                    >
                      {interest}
                    </span>
                  ))}
                  {asArray(current.intentions).length > 3 && (
                    <span className="text-white/50 text-[9px] px-1 py-1">
                      +{asArray(current.intentions).length - 3}
                    </span>
                  )}
                </div>
              )}

              <p className="text-white/70 text-xs leading-relaxed line-clamp-2">
                {current.bio || 'Buscando conexÃµes reais e valores compartilhados.'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-5 py-6">
            <button
              type="button"
              onClick={() => handleAction('pass')}
              disabled={processing}
              className="w-14 h-14 rounded-full bg-[#1C1C1E] border border-white/10 flex items-center justify-center text-white/80 shadow-xl active:scale-90 transition-all disabled:opacity-40"
              aria-label="Passar"
            >
              <X size={26} />
            </button>
            <button
              type="button"
              onClick={() => handleAction('like')}
              disabled={processing}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 to-rose-900 flex items-center justify-center text-white shadow-xl shadow-rose-900/50 active:scale-90 transition-all disabled:opacity-40"
              aria-label="Curtir"
            >
              <Heart size={30} fill="white" />
            </button>
            <button
              type="button"
              onClick={() => handleAction('superlike')}
              disabled={processing}
              className="w-14 h-14 rounded-full bg-[#1C1C1E] border border-white/10 flex items-center justify-center text-fuchsia-300 shadow-xl active:scale-90 transition-all disabled:opacity-40"
              aria-label="Enviar destaque"
            >
              <Star size={23} fill="currentColor" />
            </button>
          </div>

          <p className="text-center text-[10px] text-rose-100/25 uppercase tracking-[0.2em] -mt-2">
            {processing ? 'Registrando...' : 'Deslize com intenÃ§Ã£o'}
          </p>
        </div>
      )}

      {filterOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setFilterOpen(false)}
            aria-label="Fechar filtros"
          />
          <div className="relative w-full max-w-md rounded-t-[32px] border-t border-white/10 bg-[#171719] p-6 pb-10 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mb-6" />
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-serif text-rose-50">Filtros</h2>
                <p className="text-xs text-rose-100/40 mt-1">
                  Refine quem aparece no Descobrir.
                </p>
              </div>
              <button
                type="button"
                onClick={clearFilters}
                className="text-[10px] uppercase tracking-widest text-rose-300/80 flex items-center gap-1"
              >
                <RotateCcw size={12} /> Limpar
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <label className="block">
                <span className="text-xs text-rose-100/60 ml-1">Idade mÃ­nima</span>
                <input
                  type="number"
                  min={18}
                  max={99}
                  value={draftFilters.minAge}
                  onChange={(event) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      minAge: Number(event.target.value),
                    }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white focus:outline-none focus:border-rose-500/50"
                />
              </label>
              <label className="block">
                <span className="text-xs text-rose-100/60 ml-1">Idade mÃ¡xima</span>
                <input
                  type="number"
                  min={18}
                  max={99}
                  value={draftFilters.maxAge}
                  onChange={(event) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      maxAge: Number(event.target.value),
                    }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white focus:outline-none focus:border-rose-500/50"
                />
              </label>
            </div>

            <label className="block mb-5">
              <span className="text-xs text-rose-100/60 ml-1">Cidade</span>
              <input
                type="text"
                value={draftFilters.city}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, city: event.target.value }))
                }
                placeholder="Ex: FlorianÃ³polis"
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-rose-500/50"
              />
            </label>

            <div className="mb-7">
              <span className="text-xs text-rose-100/60 ml-1">Interesse</span>
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  type="button"
                  onClick={() =>
                    setDraftFilters((prev) => ({ ...prev, interest: '' }))
                  }
                  className={`px-3.5 py-2 rounded-full border text-xs transition-all ${
                    !draftFilters.interest
                      ? 'border-rose-400 bg-rose-500/15 text-white'
                      : 'border-white/10 bg-white/[0.04] text-white/55'
                  }`}
                >
                  Todos
                </button>
                {INTEREST_OPTIONS.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() =>
                      setDraftFilters((prev) => ({ ...prev, interest }))
                    }
                    className={`px-3.5 py-2 rounded-full border text-xs transition-all ${
                      draftFilters.interest === interest
                        ? 'border-rose-400 bg-rose-500/15 text-white'
                        : 'border-white/10 bg-white/[0.04] text-white/55'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={applyFilters}
              className="w-full bg-[#f4ece8] text-[#3a1c1c] py-4 rounded-full font-semibold text-base hover:bg-white transition-colors"
            >
              Aplicar filtros
            </button>
          </div>
        </div>
      )}

      {detailOpen && current && (
        <div className="fixed inset-0 z-[105] flex items-end justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setDetailOpen(false)}
            aria-label="Fechar perfil"
          />
          <div className="relative w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-[32px] border-t border-white/10 bg-[#171719] animate-slide-up">
            <div className="relative h-72">
              {current.photo_url ? (
                <img
                  src={current.photo_url}
                  alt={current.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#1a0205] flex items-center justify-center">
                  <span className="font-serif text-6xl text-rose-100/60">
                    {(current.full_name || 'â™¡').trim().charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#171719] via-transparent to-black/30" />
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur border border-white/10 flex items-center justify-center text-white"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
              <div className="absolute bottom-4 left-6 right-6">
                <h2 className="text-3xl font-serif text-white">
                  {current.full_name}
                  {current.age ? `, ${current.age}` : ''}
                </h2>
                <p className="text-white/60 text-xs flex items-center gap-1.5 mt-1">
                  <MapPin size={13} /> {current.city || 'LocalizaÃ§Ã£o nÃ£o informada'}
                </p>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {current.what_procura && (
                <div className="rounded-2xl border border-rose-800/30 bg-rose-950/30 p-4">
                  <p className="text-[10px] uppercase tracking-widest text-rose-300/70 mb-1">
                    O que busca
                  </p>
                  <p className="text-sm text-rose-50">{current.what_procura}</p>
                </div>
              )}

              <div>
                <p className="text-[10px] uppercase tracking-widest text-rose-100/40 mb-2">
                  Sobre
                </p>
                <p className="text-sm text-rose-100/75 leading-relaxed whitespace-pre-line">
                  {current.bio || 'Sem descriÃ§Ã£o por enquanto.'}
                </p>
              </div>

              {asArray(current.intentions).length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-rose-100/40 mb-2">
                    Interesses
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {asArray(current.intentions).map((interest: string) => (
                      <span
                        key={interest}
                        className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-rose-100/70"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {asArray(current.values_inegotiable).length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-rose-100/40 mb-2">
                    Valores inegociÃ¡veis
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {asArray(current.values_inegotiable).map((value: string) => (
                      <span
                        key={value}
                        className="rounded-full border border-rose-800/30 bg-rose-950/30 px-3 py-1.5 text-xs text-rose-200/80"
                      >
                        {value}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDetailOpen(false);
                    handleAction('pass');
                  }}
                  disabled={processing}
                  className="flex-1 rounded-full border border-white/15 py-3.5 text-sm text-white/70 hover:bg-white/5 disabled:opacity-40"
                >
                  Passar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDetailOpen(false);
                    handleAction('like');
                  }}
                  disabled={processing}
                  className="flex-1 rounded-full bg-gradient-to-r from-rose-600 to-rose-800 py-3.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Demonstrar interesse
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {matchInfo && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          <div className="relative w-full max-w-sm rounded-[32px] border border-rose-500/20 bg-[#171719] p-7 text-center shadow-2xl animate-scale-in">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 to-rose-900 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-rose-900/50">
              <Heart size={30} fill="white" className="text-white" />
            </div>
            <h2 className="text-3xl font-serif text-rose-50 mb-2">Ã‰ um match!</h2>
            <p className="text-sm text-rose-100/60 leading-relaxed mb-6">
              VocÃª e {firstName(matchInfo.otherUser.full_name)} demonstraram
              interesse recÃ­proco. Agora Ã© sÃ³ comeÃ§ar a conversa.
            </p>
            <div className="flex justify-center mb-6">
              <Avatar
                src={matchInfo.otherUser.photo_url}
                name={matchInfo.otherUser.full_name}
                size="lg"
              />
            </div>
            <div className="flex flex-col gap-3">
              {onOpenChat && (
                <button
                  type="button"
                  onClick={() => {
                    const info = matchInfo;
                    setMatchInfo(null);
                    onOpenChat(info.matchId, info.otherUser);
                  }}
                  className="w-full rounded-full bg-[#f4ece8] py-3.5 text-sm font-semibold text-[#3a1c1c] hover:bg-white transition-colors"
                >
                  Conversar agora
                </button>
              )}
              <button
                type="button"
                onClick={() => setMatchInfo(null)}
                className="w-full rounded-full border border-white/15 py-3.5 text-sm text-rose-100/70 hover:bg-white/5 transition-colors"
              >
                Continuar explorando
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
