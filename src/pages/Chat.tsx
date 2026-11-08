import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  MoreVertical,
  Send,
  Flag,
  Ban,
  Lock,
  Unlock,
  X,
  MessageCircle,
  Heart,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { REPORT_REASONS } from '../lib/constants';
import { asArray, dayLabel, formatTime, friendlyError } from '../lib/helpers';
import Avatar from '../components/Avatar';
import Toast from '../components/Toast';

const ICE_BREAKERS = [
  'Qual foi a última coisa que te fez rir de verdade?',
  'O que você está lendo ou assistindo agora?',
  'Qual lugar do mundo você ainda quer conhecer?',
];

export default function Chat({
  matchId,
  otherUser,
  onBack,
}: {
  matchId: number;
  otherUser: any;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState('');
  const [reporting, setReporting] = useState(false);
  const [toast, setToast] = useState<any>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const initialScroll = useRef(false);

  useEffect(() => {
    let active = true;

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;
      if (!user) {
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      if (otherUser?.id) {
        const { data: blockRows } = await supabase
          .from('blocks')
          .select('blocker_id,blocked_id')
          .or(
            `and(blocker_id.eq.${user.id},blocked_id.eq.${otherUser.id}),and(blocker_id.eq.${otherUser.id},blocked_id.eq.${user.id})`,
          )
          .limit(1);

        if (active && blockRows && blockRows.length > 0) {
          setBlocked(true);
          setBlockedByMe(blockRows[0].blocker_id === user.id);
        }
      }

      const { data, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });

      if (!active) return;

      if (messagesError) {
        setError(friendlyError(messagesError));
        setLoading(false);
        return;
      }

      setMessages(data || []);
      setLoading(false);
    }

    init();

    const channel = supabase
      .channel(`chat-${matchId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((message) => message.id === payload.new.id)) {
              return prev;
            }
            return [...prev, payload.new];
          });
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [matchId, otherUser?.id]);

  useEffect(() => {
    if (loading) return;
    if (!initialScroll.current) {
      bottomRef.current?.scrollIntoView({ block: 'end' });
      initialScroll.current = true;
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  async function handleSend(event) {
    event.preventDefault();
    const content = newMessage.trim();
    if (!content || sending || !currentUserId || blocked) return;

    setSending(true);
    setError('');

    const { data, error: sendError } = await supabase
      .from('messages')
      .insert({
        match_id: matchId,
        sender_id: currentUserId,
        content,
      })
      .select()
      .single();

    if (sendError) {
      setError(friendlyError(sendError));
    } else {
      setNewMessage('');
      if (data) {
        setMessages((prev) =>
          prev.some((message) => message.id === data.id) ? prev : [...prev, data],
        );
      }
    }

    setSending(false);
    inputRef.current?.focus();
  }

  async function handleBlock() {
    if (!currentUserId || !otherUser?.id) return;

    const { error: blockError } = await supabase.from('blocks').insert({
      blocker_id: currentUserId,
      blocked_id: otherUser.id,
    });

    if (blockError && !/duplicate key/i.test(blockError.message)) {
      setToast({ type: 'error', message: friendlyError(blockError) });
      return;
    }

    setBlocked(true);
    setBlockedByMe(true);
    setBlockOpen(false);
    setMenuOpen(false);
    setToast({
      type: 'success',
      message: 'Perfil bloqueado. Ele não aparecerá mais no Descobrir.',
    });
  }

  async function handleUnblock() {
    if (!currentUserId || !otherUser?.id) return;

    const { error: unblockError } = await supabase
      .from('blocks')
      .delete()
      .eq('blocker_id', currentUserId)
      .eq('blocked_id', otherUser.id);

    if (unblockError) {
      setToast({ type: 'error', message: friendlyError(unblockError) });
      return;
    }

    setBlocked(false);
    setBlockedByMe(false);
    setMenuOpen(false);
    setToast({ type: 'success', message: 'Perfil desbloqueado.' });
  }

  async function handleReport(event) {
    event.preventDefault();
    if (!currentUserId || !otherUser?.id || reporting) return;

    setReporting(true);
    const { error: reportError } = await supabase.from('reports').insert({
      reporter_id: currentUserId,
      reported_id: otherUser.id,
      reason: reportReason,
      details: reportDetails.trim() || null,
    });

    setReporting(false);

    if (reportError) {
      setToast({ type: 'error', message: friendlyError(reportError) });
      return;
    }

    setReportOpen(false);
    setReportDetails('');
    setMenuOpen(false);
    setToast({
      type: 'success',
      message: 'Denúncia enviada. Nossa curadoria vai analisar.',
    });
  }

  const name = otherUser?.full_name || 'Perfil';
  const interests = asArray(otherUser?.intentions);

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0a0000] text-white" style={{ background: 'linear-gradient(135deg, #1f0408 0%, #0d0103 100%)' }}>
      <header className="shrink-0 border-b border-white/[0.07] bg-[#0F0F10]/95 backdrop-blur-xl">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center text-rose-100/70 hover:bg-white/5 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} />
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="flex flex-1 items-center gap-3 min-w-0 text-left"
          >
            <Avatar src={otherUser?.photo_url} name={name} size="sm" />
            <div className="min-w-0 flex-1">
              <h2 className="font-serif text-lg text-rose-50 truncate">{name}</h2>
              <p className="text-[10px] text-rose-100/40 truncate">
                {otherUser?.city || 'Match Duo Match'}
              </p>
            </div>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-rose-100/60 hover:bg-white/5 transition-colors"
              aria-label="Opções da conversa"
            >
              <MoreVertical size={19} />
            </button>

            {menuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Fechar menu"
                />
                <div className="absolute right-0 top-11 z-50 w-52 rounded-2xl border border-white/10 bg-[#1C1C1E] p-1.5 shadow-2xl animate-scale-in">
                  <button
                    type="button"
                    onClick={() => {
                      setReportOpen(true);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-rose-100/75 hover:bg-white/5 transition-colors"
                  >
                    <Flag size={15} className="text-amber-300/80" /> Denunciar perfil
                  </button>
                  {blockedByMe ? (
                    <button
                      type="button"
                      onClick={handleUnblock}
                      className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-rose-100/75 hover:bg-white/5 transition-colors"
                    >
                      <Unlock size={15} className="text-emerald-300/80" /> Desbloquear
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setBlockOpen(true);
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-rose-100/75 hover:bg-white/5 transition-colors"
                    >
                      <Ban size={15} className="text-red-300/80" /> Bloquear perfil
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {(otherUser?.what_procura || interests.length > 0) && (
          <div className="max-w-md mx-auto px-4 pb-3 flex items-center gap-2 overflow-x-auto">
            {otherUser?.what_procura && (
              <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-rose-800/40 bg-rose-950/40 px-2.5 py-1 text-[9px] uppercase tracking-widest text-rose-200/80">
                <Heart size={11} className="text-rose-300/80" />{' '}
                {otherUser.what_procura}
              </span>
            )}
            {interests.slice(0, 4).map((interest) => (
              <span
                key={interest}
                className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] uppercase tracking-widest text-rose-100/45"
              >
                {interest}
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto px-4 py-5">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className={`h-10 rounded-2xl bg-white/[0.04] animate-pulse ${
                    item % 2 === 0 ? 'w-2/3' : 'w-1/2 ml-auto'
                  }`}
                />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center pt-10 pb-4">
              <div className="w-14 h-14 rounded-full bg-rose-950/50 border border-rose-900/40 flex items-center justify-center mx-auto mb-4">
                <MessageCircle size={22} className="text-rose-300/80" />
              </div>
              <h3 className="font-serif text-2xl text-rose-50 mb-1">
                Vocês deram match
              </h3>
              <p className="text-sm text-rose-100/45 max-w-[260px] mx-auto leading-relaxed">
                Que tal quebrar o gelo? Escolha uma ideia ou escreva do seu jeito.
              </p>
              <div className="mt-6 flex flex-col gap-2">
                {ICE_BREAKERS.map((idea) => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => {
                      setNewMessage(idea);
                      inputRef.current?.focus();
                    }}
                    className="rounded-2xl border border-white/[0.07] bg-white/[0.035] px-4 py-3 text-xs text-rose-100/60 hover:bg-white/[0.06] transition-colors"
                  >
                    {idea}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => {
              const mine = message.sender_id === currentUserId;
              const previous = messages[index - 1];
              const showDay =
                !previous ||
                new Date(previous.created_at).toDateString() !==
                  new Date(message.created_at).toDateString();

              return (
                <div key={message.id}>
                  {showDay && (
                    <div className="flex items-center gap-3 my-5">
                      <div className="h-px flex-1 bg-white/[0.06]" />
                      <span className="text-[9px] uppercase tracking-[0.2em] text-rose-100/30">
                        {dayLabel(message.created_at)}
                      </span>
                      <div className="h-px flex-1 bg-white/[0.06]" />
                    </div>
                  )}

                  <div className={`flex ${mine ? 'justify-end' : 'justify-start'} mb-2`}>
                    <div
                      className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        mine
                          ? 'bg-gradient-to-br from-rose-700 to-rose-900 text-white rounded-br-md shadow-lg shadow-rose-950/30'
                          : 'bg-white/[0.06] border border-white/[0.07] text-rose-50/90 rounded-bl-md'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      <p
                        className={`text-[9px] mt-1 text-right ${
                          mine ? 'text-rose-100/50' : 'text-rose-100/30'
                        }`}
                      >
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {error && (
        <div className="shrink-0 mx-auto max-w-md w-full px-4 pb-2">
          <p className="rounded-xl border border-red-500/20 bg-red-950/30 px-3 py-2 text-[11px] text-red-200/80">
            {error}
          </p>
        </div>
      )}

      {blocked ? (
        <div className="shrink-0 border-t border-white/[0.07] bg-[#0F0F10] px-5 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <div className="max-w-md mx-auto text-center">
            <Lock size={20} className="text-rose-300/70 mx-auto mb-2" />
            <p className="text-sm text-rose-100/60">
              {blockedByMe
                ? 'Você bloqueou este perfil. Desbloqueie para voltar a conversar.'
                : 'Esta conversa não está mais disponível.'}
            </p>
            {blockedByMe && (
              <button
                type="button"
                onClick={handleUnblock}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-xs text-rose-100/70 hover:bg-white/5"
              >
                <Unlock size={14} /> Desbloquear
              </button>
            )}
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSend}
          className="shrink-0 border-t border-white/[0.07] bg-[#0F0F10] px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
        >
          <div className="max-w-md mx-auto flex items-center gap-2">
            <input
              ref={inputRef}
              value={newMessage}
              onChange={(event) => setNewMessage(event.target.value)}
              placeholder="Escreva uma mensagem..."
              maxLength={2000}
              className="flex-1 min-w-0 rounded-full border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-rose-100/25 focus:outline-none focus:border-rose-500/40"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="w-12 h-12 shrink-0 rounded-full bg-gradient-to-br from-rose-500 to-rose-800 flex items-center justify-center text-white shadow-lg shadow-rose-950/40 disabled:opacity-40 active:scale-95 transition-all"
              aria-label="Enviar mensagem"
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      )}

      {reportOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-5">
          <button
            type="button"
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setReportOpen(false)}
            aria-label="Fechar denúncia"
          />
          <form
            onSubmit={handleReport}
            className="relative w-full max-w-sm rounded-[28px] border border-white/10 bg-[#171719] p-6 animate-scale-in"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flag size={18} className="text-amber-300" />
                <h2 className="text-xl font-serif text-rose-50">Denunciar perfil</h2>
              </div>
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="text-rose-100/40 hover:text-white"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-rose-100/45 leading-relaxed mb-4">
              Sua denúncia é confidencial. Nossa curadoria analisa todos os casos.
            </p>

            <div className="space-y-2 mb-4">
              {REPORT_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setReportReason(reason)}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-left text-xs transition-colors ${
                    reportReason === reason
                      ? 'border-rose-500/50 bg-rose-500/10 text-rose-50'
                      : 'border-white/10 bg-white/[0.03] text-rose-100/60'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            <textarea
              value={reportDetails}
              onChange={(event) => setReportDetails(event.target.value)}
              rows={3}
              maxLength={800}
              placeholder="Conte mais detalhes (opcional)"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm text-white placeholder:text-rose-100/25 focus:outline-none focus:border-rose-500/40 resize-none mb-4"
            />

            <button
              type="submit"
              disabled={reporting}
              className="w-full rounded-full bg-[#f4ece8] py-3.5 text-sm font-semibold text-[#3a1c1c] disabled:opacity-50 hover:bg-white transition-colors"
            >
              {reporting ? 'Enviando...' : 'Enviar denúncia'}
            </button>
          </form>
        </div>
      )}

      {blockOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-5">
          <button
            type="button"
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setBlockOpen(false)}
            aria-label="Fechar bloqueio"
          />
          <div className="relative w-full max-w-sm rounded-[28px] border border-white/10 bg-[#171719] p-6 text-center animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-red-950/50 border border-red-900/30 flex items-center justify-center mx-auto mb-4">
              <Ban size={20} className="text-red-300" />
            </div>
            <h2 className="text-xl font-serif text-rose-50 mb-2">Bloquear perfil?</h2>
            <p className="text-xs text-rose-100/50 leading-relaxed mb-6">
              O perfil deixa de aparecer no Descobrir e a conversa fica indisponível.
              Você pode desbloquear depois.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setBlockOpen(false)}
                className="flex-1 rounded-full border border-white/15 py-3 text-sm text-rose-100/70 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleBlock}
                className="flex-1 rounded-full bg-red-700 py-3 text-sm font-semibold text-white hover:bg-red-600"
              >
                Bloquear
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

