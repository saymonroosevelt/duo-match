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

      if (!user) throw new Error('SessÃ£o expirada. Entre novamente.');

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
      setPasswordMessage('As senhas nÃ£o coincidem.');
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
                VocÃª pode baixar uma cÃ³pia dos seus dados ou solicitar a exclusÃ£o
                definitiva da conta. A exclusÃ£o remove perfil, matches e mensagens.
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
                  SeguranÃ§a
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
              Esta aÃ§Ã£o Ã© definitiva. Perfil, foto, matches e mensagens serÃ£o
              removidos. NÃ£o serÃ¡ possÃ­vel recuperar a conta.
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
        title="PolÃ­tica de Privacidade"
        subtitle="Ãšltima atualizaÃ§Ã£o: 08 de novembro de 2026"
      />

      <LegalSection title="1. Quem trata seus dados">
        <p>
          O Duo Match Ã© responsÃ¡vel pelo tratamento dos dados pessoais informados
          nesta plataforma. Encarregado de dados: privacidade@duomatch.app.
        </p>
      </LegalSection>

      <LegalSection title="2. Dados que coletamos">
        <p>
          Nome, idade, cidade, bio, foto, intenÃ§Ã£o de relacionamento, interesses,
          valores, e-mail, mensagens trocadas, registros de acesso e informaÃ§Ãµes
          necessÃ¡rias para seguranÃ§a e curadoria.
        </p>
        <p>
          NÃ£o coletamos dados sensÃ­veis alÃ©m daqueles que vocÃª escolher informar
          voluntariamente na sua bio ou nas conversas.
        </p>
      </LegalSection>

      <LegalSection title="3. Para que usamos">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Criar e exibir seu perfil para outros membros aprovados.</li>
          <li>Realizar a curadoria manual de perfis.</li>
          <li>Calcular matches e permitir conversas.</li>
          <li>Prevenir fraude, assÃ©dio e uso indevido.</li>
          <li>Enviar comunicaÃ§Ãµes essenciais sobre a conta.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Bases legais (LGPD)">
        <p>
          Consentimento (art. 7Âº, I) para a criaÃ§Ã£o do perfil e participaÃ§Ã£o na
          comunidade; execuÃ§Ã£o de contrato (art. 7Âº, V) para a prestaÃ§Ã£o do
          serviÃ§o; legÃ­timo interesse (art. 7Âº, IX) para seguranÃ§a e prevenÃ§Ã£o a
          fraudes; e cumprimento de obrigaÃ§Ã£o legal quando aplicÃ¡vel.
        </p>
      </LegalSection>

      <LegalSection title="5. Compartilhamento">
        <p>
          Usamos a infraestrutura do Supabase para autenticaÃ§Ã£o, banco de dados e
          armazenamento de fotos. NÃ£o vendemos seus dados. O acesso administrativo
          Ã© restrito Ã  equipe de curadoria e protegido por polÃ­ticas de seguranÃ§a.
        </p>
      </LegalSection>

      <LegalSection title="6. RetenÃ§Ã£o e exclusÃ£o">
        <p>
          Seus dados ficam armazenados enquanto sua conta estiver ativa. VocÃª pode
          excluir a conta a qualquer momento nesta tela. A exclusÃ£o remove perfil,
          foto, matches e mensagens, ressalvados registros exigidos por lei.
        </p>
      </LegalSection>

      <LegalSection title="7. Seus direitos">
        <p>
          VocÃª pode solicitar acesso, correÃ§Ã£o, portabilidade, anonimizaÃ§Ã£o,
          bloqueio ou eliminaÃ§Ã£o dos dados, alÃ©m de revogar o consentimento. Use
          a exportaÃ§Ã£o de dados ou fale com privacidade@duomatch.app.
        </p>
      </LegalSection>

      <LegalSection title="8. SeguranÃ§a">
        <p>
          Aplicamos Row Level Security no banco, transmissÃ£o criptografada,
          polÃ­ticas de acesso por perfil e restriÃ§Ã£o de funÃ§Ãµes administrativas.
          Nenhum sistema Ã© 100% imune; em caso de incidente, comunicaremos os
          titulares afetados conforme a LGPD.
        </p>
      </LegalSection>

      <LegalSection title="9. Cookies e armazenamento local">
        <p>
          Utilizamos armazenamento local apenas para manter a sessÃ£o autenticada e
          preferÃªncias bÃ¡sicas do aplicativo. NÃ£o usamos cookies de publicidade.
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
        subtitle="Ãšltima atualizaÃ§Ã£o: 08 de novembro de 2026"
      />

      <LegalSection title="1. Elegibilidade">
        <p>
          O Duo Match Ã© destinado a pessoas maiores de 18 anos. Ao criar a conta,
          vocÃª declara que as informaÃ§Ãµes fornecidas sÃ£o verdadeiras e que possui
          capacidade legal para celebrar este acordo.
        </p>
      </LegalSection>

      <LegalSection title="2. Curadoria e acesso">
        <p>
          Todo perfil passa por anÃ¡lise manual. A aprovaÃ§Ã£o nÃ£o Ã© automÃ¡tica e
          pode ser recusada ou revista para proteger a qualidade e a seguranÃ§a da
          comunidade. O acesso Ã s Ã¡reas de membros sÃ³ existe apÃ³s a aprovaÃ§Ã£o.
        </p>
      </LegalSection>

      <LegalSection title="3. Conduta">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>NÃ£o criar perfis falsos, duplicados ou de terceiros.</li>
          <li>NÃ£o praticar assÃ©dio, discriminaÃ§Ã£o, ameaÃ§a ou violÃªncia.</li>
          <li>NÃ£o enviar conteÃºdo sexual explÃ­cito sem consentimento.</li>
          <li>NÃ£o usar a plataforma para spam, golpes ou fins comerciais.</li>
          <li>Respeitar a privacidade e as escolhas das outras pessoas.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. ConteÃºdo">
        <p>
          VocÃª mantÃ©m a titularidade do conteÃºdo que publica e concede ao Duo Match
          uma licenÃ§a limitada para exibi-lo dentro da plataforma. Podemos remover
          conteÃºdo que viole estes termos ou a lei.
        </p>
      </LegalSection>

      <LegalSection title="5. Planos e pagamento">
        <p>
          A plataforma apresenta o plano Duo Match. Nesta versÃ£o, o
          pagamento ainda nÃ£o estÃ¡ habilitado e nenhuma cobranÃ§a Ã© realizada. A
          seleÃ§Ã£o de plano nÃ£o ativa uma assinatura paga.
        </p>
      </LegalSection>

      <LegalSection title="6. SuspensÃ£o e encerramento">
        <p>
          Podemos suspender ou encerrar contas que violem estes termos, apÃ³s
          anÃ¡lise da curadoria. VocÃª pode encerrar sua conta a qualquer momento na
          tela de Privacidade e dados.
        </p>
      </LegalSection>

      <LegalSection title="7. LimitaÃ§Ã£o de responsabilidade">
        <p>
          O Duo Match facilita conexÃµes, mas nÃ£o garante compatibilidade, encontros
          presenciais ou resultados. Use bom senso e seguranÃ§a ao interagir com
          outras pessoas, especialmente fora da plataforma.
        </p>
      </LegalSection>

      <LegalSection title="8. Contato">
        <p>
          DÃºvidas sobre estes termos: suporte@duomatch.app. Privacidade e dados:
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
