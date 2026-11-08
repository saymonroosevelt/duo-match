import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  ShieldAlert,
  UserCheck,
  UserX,
  X,
  XCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { asArray, formatDate, friendlyError } from '../lib/helpers';
import Avatar from '../components/Avatar';
import BackButton from '../components/BackButton';
import EmptyState from '../components/EmptyState';
import Toast from '../components/Toast';

const TABS = [
  { id: 'pending', label: 'Pendentes' },
  { id: 'approved', label: 'Aprovados' },
  { id: 'rejected', label: 'Recusados' },
  { id: 'all', label: 'Todos' },
];

export default function AdminPanel({ onBack }: { onBack?: () => void }) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<any>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<any>(null);
  const [view, setView] = useState<'profiles' | 'reports'>('profiles');
  const [reports, setReports] = useState<any[]>([]);
  const [reportsLoaded, setReportsLoaded] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState('');
  const [reportFilter, setReportFilter] = useState('open');
  const [reportActioningId, setReportActioningId] = useState<any>(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    setLoading(true);
    setError('');

    const { data, error: loadError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (loadError) {
      setError(friendlyError(loadError));
      setProfiles([]);
    } else {
      setProfiles(data || []);
    }
    setLoading(false);
  }

  async function loadReports() {
    setReportsLoading(true);
    setReportsError('');

    const { data, error: loadError } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (loadError) {
      setReportsError(friendlyError(loadError));
      setReports([]);
      setReportsLoaded(true);
      setReportsLoading(false);
      return;
    }

    const rows = data || [];
    const ids = [
      ...new Set(
        rows
          .flatMap((report) => [report.reporter_id, report.reported_id])
          .filter(Boolean),
      ),
    ];

    let profileRows = [];
    if (ids.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id,full_name,photo_url,status,city')
        .in('id', ids);
      profileRows = profileData || [];
    }

    const profileMap = new Map(profileRows.map((profile) => [profile.id, profile]));

    setReports(
      rows.map((report) => ({
        ...report,
        reporter: profileMap.get(report.reporter_id) || null,
        reported: profileMap.get(report.reported_id) || null,
      })),
    );
    setReportsLoaded(true);
    setReportsLoading(false);
  }

  const counts = useMemo(() => {
    return {
      pending: profiles.filter((profile) => profile.status === 'pending').length,
      approved: profiles.filter((profile) => profile.status === 'approved').length,
      rejected: profiles.filter((profile) => profile.status === 'rejected').length,
      all: profiles.length,
    };
  }, [profiles]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return profiles.filter((profile) => {
      const matchesTab = tab === 'all' || profile.status === tab;
      const matchesSearch =
        !term ||
        String(profile.full_name || '').toLowerCase().includes(term) ||
        String(profile.city || '').toLowerCase().includes(term) ||
        String(profile.what_procura || '').toLowerCase().includes(term);
      return matchesTab && matchesSearch;
    });
  }, [profiles, tab, search]);

  const openReports = useMemo(() => {
    return reports.filter((report) => !report.status || report.status === 'open').length;
  }, [reports]);

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      if (reportFilter === 'open') {
        return !report.status || report.status === 'open';
      }
      if (reportFilter === 'resolved') {
        return report.status === 'resolved' || report.status === 'dismissed';
      }
      return true;
    });
  }, [reports, reportFilter]);

  async function updateStatus(profile, status) {
    if (actioningId) return;
    setActioningId(profile.id);
    setConfirmAction(null);

    const { data, error: updateError } = await supabase
      .from('profiles')
      .update({ status })
      .eq('id', profile.id)
      .select()
      .single();

    setActioningId(null);

    if (updateError) {
      setToast({ type: 'error', message: friendlyError(updateError) });
      return;
    }

    setProfiles((prev) =>
      prev.map((item) => (item.id === profile.id ? { ...item, ...data } : item)),
    );

    const labels = {
      approved: 'Perfil aprovado. Ele jÃ¡ pode acessar o Duo Match.',
      rejected: 'Perfil recusado.',
      pending: 'Perfil devolvido para a fila de anÃ¡lise.',
    };
    setToast({ type: 'success', message: labels[status] || 'Status atualizado.' });
  }

  function requestAction(profile, status, label, description, destructive = false) {
    setConfirmAction({ profile, status, label, description, destructive });
  }

  async function resolveReport(report, status) {
    if (reportActioningId) return;
    setReportActioningId(report.id);

    const { data, error: updateError } = await supabase
      .from('reports')
      .update({ status })
      .eq('id', report.id)
      .select()
      .single();

    setReportActioningId(null);

    if (updateError) {
      setToast({ type: 'error', message: friendlyError(updateError) });
      return;
    }

    setReports((prev) =>
      prev.map((item) =>
        item.id === report.id
          ? { ...item, ...data, reporter: item.reporter, reported: item.reported }
          : item,
      ),
    );
    setToast({
      type: 'success',
      message:
        status === 'resolved' ? 'DenÃºncia resolvida.' : 'DenÃºncia arquivada.',
    });
  }

  const refreshing = view === 'profiles' ? loading : reportsLoading;

  return (
    <div className="min-h-[100dvh] bg-[#0a0000] text-white" style={{ background: '#0f0a0d' }}>
      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#0f0a0d]">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <BackButton
            onClick={() => {
              if (onBack) onBack();
              else window.location.href = '/';
            }}
          />
          <div className="flex items-center gap-2">
            <ShieldAlert size={17} className="text-amber-300/80" />
            <h1 className="text-xl font-serif text-rose-50">Curadoria</h1>
          </div>
          <button
            type="button"
            onClick={view === 'profiles' ? loadProfiles : loadReports}
            className="w-10 h-10 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center text-rose-100/70 hover:bg-white/10"
            aria-label="Atualizar"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 pt-6 pb-16">
        <div className="grid grid-cols-2 gap-2 rounded-full border border-white/[0.07] bg-white/[0.03] p-1 mb-6">
          <button
            type="button"
            onClick={() => setView('profiles')}
            className={`rounded-full py-2.5 text-xs font-medium transition-colors ${
              view === 'profiles'
                ? 'bg-[#f4ece8] text-[#3a1c1c]'
                : 'text-rose-100/50 hover:text-rose-100'
            }`}
          >
            Perfis
          </button>
          <button
            type="button"
            onClick={() => {
              setView('reports');
              if (!reportsLoaded) loadReports();
            }}
            className={`rounded-full py-2.5 text-xs font-medium transition-colors inline-flex items-center justify-center gap-2 ${
              view === 'reports'
                ? 'bg-[#f4ece8] text-[#3a1c1c]'
                : 'text-rose-100/50 hover:text-rose-100'
            }`}
          >
            DenÃºncias
            {openReports > 0 && (
              <span className="rounded-full bg-red-700 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                {openReports}
              </span>
            )}
          </button>
        </div>

        {view === 'profiles' ? (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-serif text-rose-50">Fila de aprovaÃ§Ã£o</h2>
          <p className="text-xs text-rose-100/40 mt-1">
            Revise os perfis com cuidado. A aprovaÃ§Ã£o libera o acesso Ã  Ã¡rea de membros.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard
            icon={Clock}
            label="Pendentes"
            value={counts.pending}
            accent="amber"
          />
          <StatCard
            icon={UserCheck}
            label="Aprovados"
            value={counts.approved}
            accent="emerald"
          />
          <StatCard
            icon={UserX}
            label="Recusados"
            value={counts.rejected}
            accent="red"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs transition-colors ${
                tab === item.id
                  ? 'border-rose-400 bg-rose-500/15 text-white'
                  : 'border-white/10 bg-white/[0.03] text-rose-100/45'
              }`}
            >
              {item.label}
              <span className="ml-1.5 opacity-50">{counts[item.id]}</span>
            </button>
          ))}
        </div>

        <div className="relative mb-5">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-100/30"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, cidade ou intenÃ§Ã£o"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-rose-100/25 focus:outline-none focus:border-rose-500/40"
          />
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-4 mb-5">
            <p className="text-sm text-red-200/80">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[0, 1].map((item) => (
              <div
                key={item}
                className="h-56 rounded-3xl border border-white/5 bg-white/[0.035] animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title={
              tab === 'pending'
                ? 'Nenhum perfil pendente'
                : 'Nenhum perfil nesta lista'
            }
            description={
              search
                ? 'Tente outro termo de busca.'
                : tab === 'pending'
                  ? 'Tudo em ordem. Novos cadastros aparecerÃ£o aqui.'
                  : 'Os perfis aparecem aqui conforme o status muda.'
            }
            actionLabel={search ? 'Limpar busca' : 'Atualizar'}
            onAction={search ? () => setSearch('') : loadProfiles}
          />
        ) : (
          <div className="space-y-4">
            {filtered.map((profile) => (
              <article
                key={profile.id}
                className="rounded-3xl border border-white/[0.07] bg-white/[0.035] overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <Avatar
                      src={profile.photo_url}
                      name={profile.full_name}
                      size="lg"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-serif text-xl text-rose-50 truncate">
                            {profile.full_name || 'Sem nome'}
                            {profile.age ? `, ${profile.age}` : ''}
                          </h3>
                          <p className="text-[11px] text-rose-100/40 mt-0.5 truncate">
                            {profile.city || 'Cidade nÃ£o informada'}
                          </p>
                        </div>
                        <StatusBadge status={profile.status} />
                      </div>
                      <p className="text-[10px] text-rose-100/25 mt-2">
                        Cadastro em{' '}
                        {formatDate(profile.created_at, { year: 'numeric' })}
                        {profile.role === 'admin' ? ' Â· admin' : ''}
                      </p>
                    </div>
                  </div>

                  {profile.what_procura && (
                    <div className="mt-4 rounded-2xl border border-rose-800/25 bg-rose-950/25 px-3.5 py-2.5">
                      <p className="text-[9px] uppercase tracking-widest text-rose-300/60 mb-0.5">
                        Busca
                      </p>
                      <p className="text-xs text-rose-100/75">{profile.what_procura}</p>
                    </div>
                  )}

                  <p className="text-xs text-rose-100/50 leading-relaxed mt-3 whitespace-pre-line">
                    {profile.bio || 'Sem descriÃ§Ã£o.'}
                  </p>

                  {asArray(profile.intentions).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {asArray(profile.intentions).map((interest) => (
                        <span
                          key={interest}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] uppercase tracking-wider text-rose-100/45"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  )}

                  {asArray(profile.values_inegotiable).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {asArray(profile.values_inegotiable).map((value) => (
                        <span
                          key={value}
                          className="rounded-full border border-rose-800/25 bg-rose-950/20 px-2.5 py-1 text-[9px] uppercase tracking-wider text-rose-200/50"
                        >
                          {value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-white/[0.06] p-4 flex flex-wrap gap-2.5">
                  {profile.status !== 'approved' && (
                    <button
                      type="button"
                      onClick={() =>
                        requestAction(
                          profile,
                          'approved',
                          'Aprovar perfil',
                          `${profile.full_name || 'Este perfil'} poderÃ¡ acessar o Descobrir, matches e conversas.`,
                        )
                      }
                      disabled={actioningId === profile.id}
                      className="flex-1 min-w-[120px] rounded-full bg-emerald-700 py-2.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                    >
                      <Check size={14} /> Aprovar
                    </button>
                  )}

                  {profile.status !== 'rejected' && (
                    <button
                      type="button"
                      onClick={() =>
                        requestAction(
                          profile,
                          'rejected',
                          'Recusar perfil',
                          `${profile.full_name || 'Este perfil'} nÃ£o poderÃ¡ acessar a Ã¡rea de membros. VocÃª pode reverter depois.`,
                          true,
                        )
                      }
                      disabled={actioningId === profile.id}
                      className="flex-1 min-w-[120px] rounded-full border border-red-900/30 bg-red-950/20 py-2.5 text-xs font-semibold text-red-200/75 hover:bg-red-950/30 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                    >
                      <X size={14} /> Recusar
                    </button>
                  )}

                  {profile.status === 'approved' && (
                    <button
                      type="button"
                      onClick={() =>
                        requestAction(
                          profile,
                          'pending',
                          'Voltar para anÃ¡lise',
                          `${profile.full_name || 'Este perfil'} voltarÃ¡ para a fila de curadoria.`,
                        )
                      }
                      disabled={actioningId === profile.id}
                      className="flex-1 min-w-[120px] rounded-full border border-white/10 bg-white/[0.03] py-2.5 text-xs text-rose-100/55 hover:bg-white/[0.06] disabled:opacity-50 inline-flex items-center justify-center gap-2"
                    >
                      <Clock size={14} /> Revisar
                    </button>
                  )}

                  {profile.status === 'rejected' && (
                    <button
                      type="button"
                      onClick={() =>
                        requestAction(
                          profile,
                          'pending',
                          'Voltar para anÃ¡lise',
                          `${profile.full_name || 'Este perfil'} voltarÃ¡ para a fila de curadoria.`,
                        )
                      }
                      disabled={actioningId === profile.id}
                      className="flex-1 min-w-[120px] rounded-full border border-white/10 bg-white/[0.03] py-2.5 text-xs text-rose-100/55 hover:bg-white/[0.06] disabled:opacity-50 inline-flex items-center justify-center gap-2"
                    >
                      <Clock size={14} /> Reabrir
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
          </>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-serif text-rose-50">DenÃºncias</h2>
              <p className="text-xs text-rose-100/40 mt-1">
                Revise os relatos enviados pelos membros e tome uma aÃ§Ã£o.
              </p>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
              {[
                { id: 'open', label: 'Abertas' },
                { id: 'resolved', label: 'Resolvidas' },
                { id: 'all', label: 'Todas' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setReportFilter(item.id)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-xs transition-colors ${
                    reportFilter === item.id
                      ? 'border-rose-400 bg-rose-500/15 text-white'
                      : 'border-white/10 bg-white/[0.03] text-rose-100/45'
                  }`}
                >
                  {item.label}
                  {item.id === 'open' && (
                    <span className="ml-1.5 opacity-50">{openReports}</span>
                  )}
                </button>
              ))}
            </div>

            {reportsError && (
              <div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-4 mb-5">
                <p className="text-sm text-red-200/80">{reportsError}</p>
              </div>
            )}

            {reportsLoading ? (
              <div className="space-y-4">
                {[0, 1].map((item) => (
                  <div
                    key={item}
                    className="h-40 rounded-3xl border border-white/5 bg-white/[0.035] animate-pulse"
                  />
                ))}
              </div>
            ) : filteredReports.length === 0 ? (
              <EmptyState
                icon={ShieldAlert}
                title="Nenhuma denÃºncia aqui"
                description={
                  reportFilter === 'open'
                    ? 'Nenhum relato aguardando anÃ¡lise. A comunidade estÃ¡ em dia.'
                    : 'As denÃºncias aparecem aqui conforme o status muda.'
                }
                actionLabel="Atualizar"
                onAction={loadReports}
              />
            ) : (
              <div className="space-y-4">
                {filteredReports.map((report) => (
                  <article
                    key={report.id}
                    className="rounded-3xl border border-white/[0.07] bg-white/[0.035] overflow-hidden"
                  >
                    <div className="p-5">
                      <div className="flex items-start gap-3.5">
                        <Avatar
                          src={report.reported?.photo_url}
                          name={report.reported?.full_name}
                          size="md"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="font-serif text-lg text-rose-50 truncate">
                                {report.reported?.full_name || 'Perfil removido'}
                              </h3>
                              <p className="text-[10px] text-rose-100/30 mt-0.5">
                                Denunciado por{' '}
                                {report.reporter?.full_name || 'usuÃ¡rio removido'}{' '}
                                em{' '}
                                {formatDate(report.created_at, {
                                  year: 'numeric',
                                })}
                              </p>
                            </div>
                            <ReportStatusBadge status={report.status} />
                          </div>
                          <p className="mt-3 text-xs font-medium text-rose-100/80">
                            {report.reason}
                          </p>
                          {report.details && (
                            <p className="mt-1 text-xs text-rose-100/45 leading-relaxed whitespace-pre-line">
                              {report.details}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-white/[0.06] p-4 flex flex-wrap gap-2.5">
                      {report.status !== 'resolved' && (
                        <button
                          type="button"
                          onClick={() => resolveReport(report, 'resolved')}
                          disabled={reportActioningId === report.id}
                          className="flex-1 min-w-[130px] rounded-full bg-emerald-700 py-2.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                        >
                          <Check size={14} /> Resolver
                        </button>
                      )}
                      {report.status !== 'dismissed' && (
                        <button
                          type="button"
                          onClick={() => resolveReport(report, 'dismissed')}
                          disabled={reportActioningId === report.id}
                          className="flex-1 min-w-[130px] rounded-full border border-white/10 bg-white/[0.03] py-2.5 text-xs font-semibold text-rose-100/55 hover:bg-white/[0.06] disabled:opacity-50 inline-flex items-center justify-center gap-2"
                        >
                          <X size={14} /> Arquivar
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-5">
          <button
            type="button"
            className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            onClick={() => setConfirmAction(null)}
            aria-label="Fechar"
          />
          <div className="relative w-full max-w-sm rounded-[28px] border border-white/10 bg-[#171719] p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-serif text-rose-50">
                {confirmAction.label}
              </h2>
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="text-rose-100/40 hover:text-white"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-rose-100/50 leading-relaxed">
              {confirmAction.description}
            </p>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="flex-1 rounded-full border border-white/15 py-3 text-sm text-rose-100/70 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() =>
                  updateStatus(confirmAction.profile, confirmAction.status)
                }
                className={`flex-1 rounded-full py-3 text-sm font-semibold text-white ${
                  confirmAction.destructive
                    ? 'bg-red-700 hover:bg-red-600'
                    : 'bg-emerald-700 hover:bg-emerald-600'
                }`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  const accents = {
    amber: 'text-amber-300 bg-amber-950/30 border-amber-800/20',
    emerald: 'text-emerald-300 bg-emerald-950/30 border-emerald-800/20',
    red: 'text-red-300 bg-red-950/30 border-red-900/20',
  };
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3.5">
      <div
        className={`w-8 h-8 rounded-full border flex items-center justify-center mb-2.5 ${
          accents[accent] || accents.amber
        }`}
      >
        <Icon size={14} />
      </div>
      <p className="text-2xl font-serif text-rose-50 leading-none">{value}</p>
      <p className="text-[9px] uppercase tracking-widest text-rose-100/35 mt-1.5">
        {label}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    pending: {
      label: 'Pendente',
      className: 'border-amber-700/30 bg-amber-950/30 text-amber-200/80',
      icon: Clock,
    },
    approved: {
      label: 'Aprovado',
      className: 'border-emerald-700/30 bg-emerald-950/30 text-emerald-200/80',
      icon: CheckCircle2,
    },
    rejected: {
      label: 'Recusado',
      className: 'border-red-800/30 bg-red-950/30 text-red-200/70',
      icon: XCircle,
    },
  }[status] || {
    label: status || 'â€”',
    className: 'border-white/10 bg-white/5 text-rose-100/50',
    icon: Clock,
  };

  const Icon = config.icon;
  return (
    <span
      className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-widest ${config.className}`}
    >
      <Icon size={11} /> {config.label}
    </span>
  );
}

function ReportStatusBadge({ status }) {
  const config = {
    open: {
      label: 'Aberta',
      className: 'border-amber-700/30 bg-amber-950/30 text-amber-200/80',
      icon: Clock,
    },
    resolved: {
      label: 'Resolvida',
      className: 'border-emerald-700/30 bg-emerald-950/30 text-emerald-200/80',
      icon: CheckCircle2,
    },
    dismissed: {
      label: 'Arquivada',
      className: 'border-white/10 bg-white/5 text-rose-100/50',
      icon: XCircle,
    },
  }[status] || {
    label: status || 'Aberta',
    className: 'border-white/10 bg-white/5 text-rose-100/50',
    icon: Clock,
  };

  const Icon = config.icon;
  return (
    <span
      className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-widest ${config.className}`}
    >
      <Icon size={11} /> {config.label}
    </span>
  );
}
