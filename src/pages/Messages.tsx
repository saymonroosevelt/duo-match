import { useMemo, useState } from 'react';
import { MessageCircle, RefreshCw, Search, Sparkles } from 'lucide-react';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import { firstName, formatTime, formatDate, friendlyError } from '../lib/helpers';
import useMatches from '../lib/useMatches';

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
        // Não lidas sobem para o topo — como em qualquer inbox moderno
        if ((b.unread || 0) !== (a.unread || 0)) return (b.unread || 0) - (a.unread || 0);
        const aTime = new Date(a.lastMessage?.created_at || a.createdAt).getTime();
        const bTime = new Date(b.lastMessage?.created_at || b.createdAt).getTime();
        return bTime - aTime;
      });
  }, [matches, search]);

  const recentMatches = useMemo(
    () =>
      [...matches]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 12),
    [matches],
  );

  const unreadTotal = useMemo(
    () => matches.reduce((sum, match) => sum + (match.unread || 0), 0),
    [matches],
  );

  return (
    <div className="min-h-full text-white px-5 pt-5 pb-8">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-serif text-rose-50 tracking-tight">Mensagens</h1>
            <p className="text-rose-100/40 text-xs mt-1">
              {unreadTotal > 0
                ? `${unreadTotal} ${unreadTotal === 1 ? 'conversa não lida' : 'conversas não lidas'}`
                : 'Conversas que começaram com um match.'}
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

        {/* Carrossel de matches — swipe horizontal */}
        {matches.length > 0 && (
          <section aria-label="Seus matches" className="mb-5">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-rose-100/45 mb-2">
              <Sparkles size={12} className="text-rose-400/80" /> Seus matches
            </div>
            <div className="-mx-5 px-5 flex gap-3.5 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none">
              {recentMatches.map((match) => {
                const unread = (match.unread || 0) > 0;
                return (
                  <button
                    key={match.id}
                    type="button"
                    onClick={() => onSelectMatch(match.id, match.otherUser)}
                    className="snap-start shrink-0 flex flex-col items-center gap-1.5 w-[74px] group"
                    aria-label={`Abrir conversa com ${firstName(match.otherUser?.full_name)}`}
                  >
                    <div
                      className={`relative rounded-full p-[3px] ${
                        unread ? 'ring-[2px] ring-rose-500/90' : 'ring-[2px] ring-white/[0.07]'
                      } group-active:scale-95 transition-transform`}
                    >
                      <Avatar
                        src={match.otherUser?.photo_url}
                        name={match.otherUser?.full_name}
                        size="md"
                      />
                      {unread && (
                        <span className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-rose-600 border-2 border-[#120306]" />
                      )}
                    </div>
                    <span className="text-[11px] text-rose-50/90 truncate w-full text-center">
                      {firstName(match.otherUser?.full_name)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Busca */}
        {matches.length > 0 && (
          <div className="relative mb-3">
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

        {/* Inbox */}
        {loading ? (
          <div className="space-y-2.5">
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
          <ul className="space-y-2" aria-label="Conversas">
            {conversations.map((match) => {
              const last = match.lastMessage;
              const isMine = last?.sender_id === userId;
              const unread = (match.unread || 0) > 0;
              return (
                <li key={match.id}>
                  <button
                    type="button"
                    onClick={() => onSelectMatch(match.id, match.otherUser)}
                    className={`w-full flex items-center gap-3.5 rounded-3xl border p-3 text-left active:scale-[0.99] transition-all ${
                      unread
                        ? 'border-rose-700/25 bg-rose-950/15 hover:bg-rose-950/25'
                        : 'border-white/[0.07] bg-white/[0.035] hover:bg-white/[0.055]'
                    }`}
                    aria-label={`${unread ? 'Conversa não lida com' : 'Conversa com'} ${match.otherUser?.full_name || 'perfil'}`}
                  >
                    <div className="relative shrink-0">
                      <Avatar
                        src={match.otherUser?.photo_url}
                        name={match.otherUser?.full_name}
                        size="md"
                      />
                      {unread && (
                        <span className="absolute -bottom-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-[9px] font-bold text-white flex items-center justify-center border-2 border-[#120306]">
                          {match.unread > 9 ? '9+' : match.unread}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <h3
                          className={`truncate text-[15px] ${
                            unread ? 'font-semibold text-rose-50' : 'font-serif text-rose-50/90'
                          }`}
                        >
                          {match.otherUser?.full_name || 'Perfil'}
                        </h3>
                        <span
                          className={`text-[10px] shrink-0 ${
                            unread ? 'text-rose-300' : 'text-rose-100/35'
                          }`}
                        >
                          {timestamp(last?.created_at || match.createdAt)}
                        </span>
                      </div>
                      <p
                        className={`text-xs truncate mt-0.5 ${
                          unread ? 'text-rose-100/70' : 'text-rose-100/40'
                        }`}
                      >
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
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
