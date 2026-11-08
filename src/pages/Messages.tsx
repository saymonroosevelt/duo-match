import { useMemo, useState } from 'react';
import { MessageCircle, RefreshCw, Search, Sparkles } from 'lucide-react';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import { formatDate, formatTime, friendlyError } from '../lib/helpers';
import useMatches from '../lib/useMatches';

export default function Messages({
  onSelectMatch,
  onGoExplore,
}: {
  onSelectMatch: (matchId: number, otherUser: any) => void;
  onGoExplore?: () => void;
}) {
  const { userId, matches, loading, error, reload } = useMatches();
  const [search, setSearch] = useState('');

  const conversations = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...matches]
      .filter((match) =>
        !term
          ? true
          : String(match.otherUser?.full_name || '')
              .toLowerCase()
              .includes(term),
      )
      .sort((a, b) => {
        const aTime = new Date(a.lastMessage?.created_at || a.createdAt).getTime();
        const bTime = new Date(b.lastMessage?.created_at || b.createdAt).getTime();
        return bTime - aTime;
      });
  }, [matches, search]);

  function timestamp(value) {
    if (!value) return '';
    const date = new Date(value);
    const today = new Date();
    const sameDay =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
    return sameDay ? formatTime(value) : formatDate(value);
  }

  return (
    <div className="min-h-full text-white px-5 pt-5 pb-8">
      <div className="max-w-md mx-auto">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="text-3xl font-serif text-rose-50 tracking-tight">Mensagens</h1>
            <p className="text-rose-100/40 text-xs mt-1">
              Conversas que começaram com um match.
            </p>
          </div>
          <button
            type="button"
            onClick={reload}
            className="w-11 h-11 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-rose-100/80 hover:bg-white/10 transition-colors"
            aria-label="Atualizar conversas"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {matches.length > 0 && (
          <div className="relative mb-5">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-100/30"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar conversa"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-rose-100/25 focus:outline-none focus:border-rose-500/40"
            />
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-4 mb-5">
            <p className="text-sm text-red-200/80">{friendlyError({ message: error })}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-20 rounded-3xl border border-white/5 bg-white/[0.035] animate-pulse"
              />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title={search ? 'Nenhuma conversa encontrada' : 'Nenhuma mensagem ainda'}
            description={
              search
                ? 'Tente buscar por outro nome.'
                : 'Quando você e outra pessoa demonstrarem interesse recíproco, a conversa aparece aqui.'
            }
            actionLabel={!search ? 'Descobrir pessoas' : undefined}
            onAction={!search ? onGoExplore : undefined}
            secondaryLabel={search ? 'Limpar busca' : undefined}
            onSecondary={search ? () => setSearch('') : undefined}
          />
        ) : (
          <div className="space-y-2.5">
            {conversations.map((match) => {
              const last = match.lastMessage;
              const isMine = last?.sender_id === userId;
              return (
                <button
                  key={match.id}
                  type="button"
                  onClick={() => onSelectMatch(match.id, match.otherUser)}
                  className="w-full flex items-center gap-3.5 rounded-3xl border border-white/[0.07] bg-white/[0.035] p-4 text-left hover:bg-white/[0.06] active:scale-[0.99] transition-all"
                >
                  <Avatar
                    src={match.otherUser?.photo_url}
                    name={match.otherUser?.full_name}
                    size="md"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-serif text-lg text-rose-50 truncate">
                        {match.otherUser?.full_name || 'Perfil'}
                      </h3>
                      <span className="text-[10px] text-rose-100/35 shrink-0">
                        {timestamp(last?.created_at || match.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-rose-100/45 truncate mt-0.5">
                      {last ? (
                        <>
                          {isMine && <span className="text-rose-200/60">Você: </span>}
                          {last.content}
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-300/60">
                          <Sparkles size={12} /> Vocês deram match. Diga olá.
                        </span>
                      )}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
