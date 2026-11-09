import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  KeyRound,
  Loader2,
  Lock,
  Shield,
  Trash2,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { downloadJson, friendlyError } from '../lib/helpers';
import BackButton from '../components/BackButton';

export default function PrivacyScreen({
  onBack,
  standalone = false,
}: {
  onBack?: () => void;
  standalone?: boolean;
}) {
  const [tab, setTab] = useState<'privacy' | 'terms'>(() => {
    const requested = new URLSearchParams(window.location.search).get('tab');
    return requested === 'terms' ? 'terms' : 'privacy';
  });
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<any>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  function goBack() {
    if (onBack) onBack();
    else window.history.back();
  }

  async function exportData() {
    if (exporting) return;
    setExporting(true);
    setMessage(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Sessão expirada. Entre novamente.');

      const [{ data: profile }, { data: matchRows }, { data: subscriptionRows }] =
        await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
          supabase
            .from('matches')
            .select('*')
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`),
          supabase.from('subscriptions').select('*').eq('user_id', user.id),
        ]);

      const matchIds = (matchRows || []).map((match) => match.id);
      let messages = [];
      if (matchIds.length > 0) {
        const { data: messageRows } = await supabase
          .from('messages')
          .select('*')
          .in('match_id', matchIds);
        messages = messageRows || [];
      }

      downloadJson(
        {
          exported_at: new Date().toISOString(),
          profile,
          matches: matchRows || [],
          messages,
          subscriptions: subscriptionRows || [],
        },
        `duo-match-meus-dados-${new Date().toISOString().slice(0, 10)}.json`,
      );

      setMessage({
        type: 'success',
        text: 'Seus dados foram exportados em um arquivo JSON.',
      });
    } catch (error) {
      setMessage({ type: 'error', text: friendlyError(error) });
    } finally {
      setExporting(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    if (changingPassword) return;

    if (newPassword.length < 6) {
      setPasswordMessage('A nova senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage('As senhas não coincidem.');
      return;
    }

    setChangingPassword(true);
    setPasswordMessage('');

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    setChangingPassword(false);

    if (error) {
      setPasswordMessage(friendlyError(error));
      return;
    }

    setNewPassword('');
    setConfirmPassword('');
    setPasswordMessage('Senha alterada com sucesso.');
  }

  async function deleteAccount() {
    if (deleting) return;
    if (deleteConfirm.trim().toUpperCase() !== 'EXCLUIR') return;

    setDeleting(true);
    setMessage(null);

    const { error } = await supabase.rpc('delete_my_account');

    if (error) {
      setDeleting(false);
      setMessage({ type: 'error', text: friendlyError(error) });
      return;
    }

    await supabase.auth.signOut();
    window.location.href = '/';
  }

  return (
    <div className="min-h-[100dvh] text-white">
      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#150408]">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between">
          <BackButton onClick={goBack} />
          <h1 className="text-xl font-serif text-rose-50">
            {standalone ? 'Termos e Privacidade' : 'Privacidade e dados'}
          </h1>
          <div className="w-16" />
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 pt-6 pb-16">
        <div className="flex rounded-full border border-white/[0.08] bg-white/[0.03] p-1 mb-6">
          <button
            type="button"
            onClick={() => setTab('privacy')}
            className={`flex-1 rounded-full py-2.5 text-xs font-medium transition-colors ${
              tab === 'privacy'
                ? 'bg-[#f4ece8] text-[#3a1c1c]'
                : 'text-rose-100/50'
            }`}
          >
            Privacidade
          </button>
          <button
            type="button"
            onClick={() => setTab('terms')}
            className={`flex-1 rounded-full py-2.5 text-xs font-medium transition-colors ${
              tab === 'terms'
                ? 'bg-[#f4ece8] text-[#3a1c1c]'
                : 'text-rose-100/50'
            }`}
          >
            Termos de Uso
          </button>
        </div>

        {!standalone && (
          <div className="space-y-3 mb-8">
            <div className="rounded-3xl border border-white/[0.07] bg-white/[0.035] p-5">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={15} className="text-rose-300/80" />
                <h2 className="text-[10px] uppercase tracking-[0.2em] text-rose-100/45">
                  Seus dados
                </h2>
              </div>
              <p className="text-xs text-rose-100/50 leading-relaxed mb-4">
                Você pode baixar uma cópia dos seus dados ou solicitar a exclusão
                definitiva da conta. A exclusão remove perfil, matches e mensagens.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={exportData}
                  disabled={exporting}
                  className="w-full rounded-full border border-white/15 py-3 text-xs text-rose-100/70 hover:bg-white/5 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {exporting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Download size={14} />
                  )}
                  {exporting ? 'Preparando arquivo...' : 'Baixar meus dados'}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="w-full rounded-full border border-red-900/30 bg-red-950/20 py-3 text-xs text-red-200/70 hover:bg-red-950/30 inline-flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} /> Excluir minha conta
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-white/[0.07] bg-white/[0.035] p-5">
              <div className="flex items-center gap-2 mb-3">
                <KeyRound size={15} className="text-rose-300/80" />
                <h2 className="text-[10px] uppercase tracking-[0.2em] text-rose-100/45">
                  Segurança
                </h2>
              </div>
              <form onSubmit={changePassword} className="space-y-2.5">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Nova senha"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-rose-100/25 focus:outline-none focus:border-rose-500/40"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirmar nova senha"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-rose-100/25 focus:outline-none focus:border-rose-500/40"
                />
                {passwordMessage && (
                  <p
                    className={`text-[11px] ${
                      passwordMessage.includes('sucesso')
                        ? 'text-emerald-300/80'
                        : 'text-red-300/80'
                    }`}
                  >
                    {passwordMessage}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="w-full rounded-full bg-white/[0.06] border border-white/10 py-3 text-xs text-rose-100/70 hover:bg-white/10 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {changingPassword ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Lock size={14} />
                  )}
                  Alterar senha
                </button>
              </form>
            </div>

            {message && (
              <div
                className={`rounded-2xl border px-4 py-3 text-xs leading-relaxed ${
                  message.type === 'success'
                    ? 'border-emerald-700/30 bg-emerald-950/20 text-emerald-200/80'
                    : 'border-red-500/20 bg-red-950/20 text-red-200/80'
                }`}
              >
                {message.text}
              </div>
            )}
          </div>
        )}

        {tab === 'privacy' ? <PrivacyText /> : <TermsText />}
      </div>

      {deleteOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-5">
          <button
            type="button"
            className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            onClick={() => !deleting && setDeleteOpen(false)}
            aria-label="Fechar"
          />
          <div className="relative w-full max-w-sm rounded-[28px] border border-red-900/30 bg-[#171719] p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-300" />
                <h2 className="text-xl font-serif text-rose-50">Excluir conta</h2>
              </div>
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
                className="text-rose-100/40 hover:text-white disabled:opacity-40"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-rose-100/50 leading-relaxed mb-4">
              Esta ação é definitiva. Perfil, foto, matches e mensagens serão
              removidos. Não será possível recuperar a conta.
            </p>
            <p className="text-[10px] uppercase tracking-widest text-rose-100/35 mb-2">
              Digite EXCLUIR para confirmar
            </p>
            <input
              value={deleteConfirm}
              onChange={(event) => setDeleteConfirm(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/40"
              placeholder="EXCLUIR"
            />
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
                className="flex-1 rounded-full border border-white/15 py-3 text-sm text-rose-100/70 hover:bg-white/5 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={deleteAccount}
                disabled={deleting || deleteConfirm.trim().toUpperCase() !== 'EXCLUIR'}
                className="flex-1 rounded-full bg-red-700 py-3 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-40 inline-flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Trash2 size={15} />
                )}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PrivacyText() {
  return (
    <article className="space-y-6 text-rose-100/55">
      <LegalHeader
        icon={Shield}
        title="Política de Privacidade"
        subtitle="Última atualização: 08 de novembro de 2026"
      />

      <LegalSection title="1. Quem trata seus dados">
        <p>
          O Duo Match é responsável pelo tratamento dos dados pessoais informados
          nesta plataforma. Encarregado de dados: privacidade@duomatch.app.
        </p>
      </LegalSection>

      <LegalSection title="2. Dados que coletamos">
        <p>
          Nome, idade, cidade, bio, foto, intenção de relacionamento, interesses,
          valores, e-mail, mensagens trocadas, registros de acesso e informações
          necessárias para segurança e curadoria.
        </p>
        <p>
          Também coletamos dados técnicos de funcionamento do app (preferência
          de uso e erros ocorridos) por meio de uma ferramenta de monitoramento
          (Sentry), contendo apenas o id técnico da conta e detalhes do erro —
          sem nome, e-mail ou conteúdo das suas mensagens. Servem para corrigir
          defeitos mais rápido e não são usados para publicidade.
        </p>
        <p>
          Não coletamos dados sensíveis além daqueles que você escolher informar
          voluntariamente na sua bio ou nas conversas.
        </p>
      </LegalSection>

      <LegalSection title="3. Para que usamos">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Criar e exibir seu perfil para outros membros aprovados.</li>
          <li>Realizar a curadoria manual de perfis.</li>
          <li>Calcular matches e permitir conversas.</li>
          <li>Prevenir fraude, assédio e uso indevido.</li>
          <li>Enviar comunicações essenciais sobre a conta.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Bases legais (LGPD)">
        <p>
          Consentimento (art. 7º, I) para a criação do perfil e participação na
          comunidade; execução de contrato (art. 7º, V) para a prestação do
          serviço; legítimo interesse (art. 7º, IX) para segurança e prevenção a
          fraudes; e cumprimento de obrigação legal quando aplicável.
        </p>
      </LegalSection>

      <LegalSection title="5. Compartilhamento">
        <p>
          Usamos a infraestrutura do Supabase para autenticação, banco de dados e
          armazenamento de fotos. Não vendemos seus dados. O acesso administrativo
          é restrito à equipe de curadoria e protegido por políticas de segurança.
        </p>
      </LegalSection>

      <LegalSection title="6. Retenção e exclusão">
        <p>
          Seus dados ficam armazenados enquanto sua conta estiver ativa. Você pode
          excluir a conta a qualquer momento nesta tela. A exclusão remove perfil,
          foto, matches e mensagens, ressalvados registros exigidos por lei.
        </p>
      </LegalSection>

      <LegalSection title="7. Seus direitos">
        <p>
          Você pode solicitar acesso, correção, portabilidade, anonimização,
          bloqueio ou eliminação dos dados, além de revogar o consentimento. Use
          a exportação de dados ou fale com privacidade@duomatch.app.
        </p>
      </LegalSection>

      <LegalSection title="8. Segurança">
        <p>
          Aplicamos Row Level Security no banco, transmissão criptografada,
          políticas de acesso por perfil e restrição de funções administrativas.
          Nenhum sistema é 100% imune; em caso de incidente, comunicaremos os
          titulares afetados conforme a LGPD.
        </p>
      </LegalSection>

      <LegalSection title="9. Cookies e armazenamento local">
        <p>
          Utilizamos armazenamento local apenas para manter a sessão autenticada e
          preferências básicas do aplicativo. Não usamos cookies de publicidade.
        </p>
      </LegalSection>
    </article>
  );
}

function TermsText() {
  return (
    <article className="space-y-6 text-rose-100/55">
      <LegalHeader
        icon={CheckCircle2}
        title="Termos de Uso"
        subtitle="Última atualização: 08 de novembro de 2026"
      />

      <LegalSection title="1. Elegibilidade">
        <p>
          O Duo Match é destinado a pessoas maiores de 18 anos. Ao criar a conta,
          você declara que as informações fornecidas são verdadeiras e que possui
          capacidade legal para celebrar este acordo.
        </p>
      </LegalSection>

      <LegalSection title="2. Curadoria e acesso">
        <p>
          Todo perfil passa por análise manual. A aprovação não é automática e
          pode ser recusada ou revista para proteger a qualidade e a segurança da
          comunidade. O acesso às áreas de membros só existe após a aprovação.
        </p>
      </LegalSection>

      <LegalSection title="3. Conduta">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Não criar perfis falsos, duplicados ou de terceiros.</li>
          <li>Não praticar assédio, discriminação, ameaça ou violência.</li>
          <li>Não enviar conteúdo sexual explícito sem consentimento.</li>
          <li>Não usar a plataforma para spam, golpes ou fins comerciais.</li>
          <li>Respeitar a privacidade e as escolhas das outras pessoas.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Conteúdo">
        <p>
          Você mantém a titularidade do conteúdo que publica e concede ao Duo Match
          uma licença limitada para exibi-lo dentro da plataforma. Podemos remover
          conteúdo que viole estes termos ou a lei.
        </p>
      </LegalSection>

      <LegalSection title="5. Planos e pagamento">
        <p>
          A plataforma apresenta o plano Duo Match. Nesta versão, o
          pagamento ainda não está habilitado e nenhuma cobrança é realizada. A
          seleção de plano não ativa uma assinatura paga.
        </p>
      </LegalSection>

      <LegalSection title="6. Suspensão e encerramento">
        <p>
          Podemos suspender ou encerrar contas que violem estes termos, após
          análise da curadoria. Você pode encerrar sua conta a qualquer momento na
          tela de Privacidade e dados.
        </p>
      </LegalSection>

      <LegalSection title="7. Limitação de responsabilidade">
        <p>
          O Duo Match facilita conexões, mas não garante compatibilidade, encontros
          presenciais ou resultados. Use bom senso e segurança ao interagir com
          outras pessoas, especialmente fora da plataforma.
        </p>
      </LegalSection>

      <LegalSection title="8. Contato">
        <p>
          Dúvidas sobre estes termos: suporte@duomatch.app. Privacidade e dados:
          privacidade@duomatch.app.
        </p>
      </LegalSection>
    </article>
  );
}

function LegalHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="rounded-3xl border border-white/[0.07] bg-white/[0.035] p-5">
      <div className="w-10 h-10 rounded-full bg-rose-950/60 border border-rose-800/30 flex items-center justify-center mb-3">
        <Icon size={18} className="text-rose-300" />
      </div>
      <h2 className="text-2xl font-serif text-rose-50">{title}</h2>
      <p className="text-[10px] uppercase tracking-widest text-rose-100/30 mt-1">
        {subtitle}
      </p>
    </div>
  );
}

function LegalSection({ title, children }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-rose-100/80 mb-2">{title}</h3>
      <div className="space-y-2 text-xs leading-relaxed">{children}</div>
    </section>
  );
}
