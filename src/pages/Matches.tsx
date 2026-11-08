import { useState } from 'react';
import {
  Heart,
  ChevronRight,
  Lock,
  RefreshCw,
  Sparkles,
  MessageCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import Toast from '../components/Toast';
import useMatches from '../lib/useMatches';
import usePlan from '../lib/usePlan';
import {
  firstName,
  friendlyError,
  isSubscriptionActive,
} from '../lib/helpers';

export default function Matches({
  onSelectMatch,
  onOpenPlans,
  onGoExplore,
}: {
  onSelectMatch: (matchId: number, otherUser: any) => void;
  onOpenPlans?: () => void;
  onGoExplore?: () => void;
}) {
  const { userId, matches, likes, loading, error, reload } = useMatches();
  const planState = usePlan(userId);
  const [toast, setToast] = useState<any>(null);
  const [matchingId, setMatchingId] = useState<number | null>(null);

  const selectUnlocked = isSubscriptionActive(planState.subscription);

  async function likeBack(like) {
    if (matchingId) return;
    setMatchingId(like.matchId);
    try {
      const { error: updateError } = await supabase
        .from('matches')
        .update({ status: 'matched' })
        .eq('id', like.matchId);

      if (updateError) throw updateError;

      setToast({
        type: 'success',
        message: `Ã‰ um match com ${firstName(like.otherUser?.full_name)}! Abra a conversa.`,
      });
      await reload();
    } catch (likeError) {
      setToast({ type: 'error', message: friendlyError(likeError) });
    } finally {
      setMatchingId(null);
    }
  }

  return (
    <div className="min-h-full text-white px-5 pt-5 pb-8">
      <div className="max-w-md mx-auto">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="text-3xl font-serif text-rose-50 tracking-tight">Matches</h1>
            <p className="text-rose-100/40 text-xs mt-1">
              Interesses recÃ­procos aprovados pela curadoria.
            </p>
          </div>
          <button
            type="button"
            onClick={reload}
            className="w-11 h-11 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-rose-100/80 hover:bg-white/10 transition-colors"
            aria-label="Atualizar matches"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-4 mb-5">
            <p className="text-sm text-red-200/80">{friendlyError({ message: error })}</p>
          </div>
        )}

        {!loading && likes.length > 0 && (
          <section className="mb-7">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Heart size={15} className="text-rose-400" />
                <h2 className="text-[11px] uppercase tracking-[0.2em] text-rose-100/60">
                  Curtidas recebidas
                </h2>
                <span className="text-[10px] rounded-full bg-rose-600/20 border border-rose-500/20 text-rose-200 px-2 py-0.5">
                  {likes.length}
                </span>
              </div>
            </div>

            {selectUnlocked ? (
              <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
                {likes.map((like) => (
                  <div
                    key={like.matchId}
                    className="w-40 shrink-0 rounded-3xl border border-white/[0.07] bg-white/[0.035] p-4"
                  >
                    <div className="flex flex-col items-center text-center">
                      <Avatar
                        src={like.otherUser?.photo_url}
                        name={like.otherUser?.full_name}
                        size="lg"
                      />
                      <h3 className="font-serif text-base text-rose-50 mt-3 truncate w-full">
                        {like.otherUser?.full_name}
                      </h3>
                      <p className="text-[10px] text-rose-100/40 truncate w-full mt-0.5">
                        {like.otherUser?.city || 'Cidade nÃ£o informada'}
                      </p>
                      <button
                        type="button"
                        onClick={() => likeBack(like)}
                        disabled={matchingId === like.matchId}
                        className="mt-3 w-full rounded-full bg-rose-600 py-2 text-[11px] font-semibold text-white hover:bg-rose-500 disabled:opacity-50 transition-colors"
                      >
                        {matchingId === like.matchId ? 'Curtindo...' : 'Curtir de volta'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenPlans}
                className="w-full rounded-3xl border border-rose-900/40 bg-[#1a0205] p-5 text-left relative overflow-hidden"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-rose-950/70 border border-rose-800/30 flex items-center justify-center">
                    <Lock size={15} className="text-rose-300" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-rose-300/70">
                      Exclusivo Duo Match
                    </p>
                    <p className="text-sm text-rose-50">
                      {likes.length}{' '}
                      {likes.length === 1 ? 'pessoa curtiu' : 'pessoas curtiram'} vocÃª
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  {likes.slice(0, 5).map((like) => (
                    <div key={like.matchId} className="blur-[3px] opacity-70">
                      <Avatar
                        src={like.otherUser?.photo_url}
                        name={like.otherUser?.full_name}
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs text-rose-200">
                  Conhecer o Duo Match <ChevronRight size={14} />
                </span>
              </button>
            )}
          </section>
        )}

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-24 rounded-3xl border border-white/5 bg-white/[0.035] animate-pulse"
              />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="Seus matches vÃ£o aparecer aqui"
            description="Quando vocÃª e outra pessoa demonstrarem interesse recÃ­proco, o match Ã© criado e a conversa Ã© liberada."
            actionLabel="Descobrir pessoas"
            onAction={onGoExplore}
          />
        ) : (
          <div className="space-y-2.5">
            {matches.map((match) => {
              const other = match.otherUser || {};
              return (
                <button
                  key={match.id}
                  type="button"
                  onClick={() => onSelectMatch(match.id, other)}
                  className="w-full flex items-center gap-3.5 rounded-3xl border border-white/[0.07] bg-white/[0.035] p-4 text-left hover:bg-white/[0.06] active:scale-[0.99] transition-all"
                >
                  <Avatar src={other.photo_url} name={other.full_name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-serif text-lg text-rose-50 truncate">
                        {other.full_name || 'Perfil'}
                        {other.age ? `, ${other.age}` : ''}
                      </h3>
                      <ChevronRight size={16} className="text-rose-100/25 shrink-0" />
                    </div>
                    <p className="text-[11px] text-rose-100/40 truncate mt-0.5">
                      {other.city || 'Cidade nÃ£o informada'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <Sparkles size={11} className="text-rose-400/70 shrink-0" />
                      <p className="text-[11px] text-rose-100/50 truncate">
                        {match.lastMessage
                          ? match.lastMessage.content
                          : 'VocÃªs deram match. Comece a conversa.'}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}

            <button
              type="button"
              onClick={onGoExplore}
              className="w-full mt-3 rounded-full border border-white/10 py-3.5 text-sm text-rose-100/60 hover:bg-white/5 transition-colors inline-flex items-center justify-center gap-2"
            >
              <MessageCircle size={15} /> Continuar descobrindo
            </button>

            {planState.subscription && (
              <p className="text-center text-[10px] text-rose-100/25 pt-2">
                Plano {planState.plan?.name || 'selecionado'} Â·{' '}
                {planState.subscription.status === 'active'
                  ? 'ativo'
                  : 'aguardando pagamento'}
              </p>
            )}
          </div>
        )}
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
