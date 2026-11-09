import { useCallback, useEffect, useState } from 'react';
import {
  Compass,
  Heart,
  MessageCircle,
  ShieldAlert,
  User,
  Users,
} from 'lucide-react';
import { supabase } from './lib/supabase';
import WelcomeScreen from './WelcomeScreen';
import AuthScreen from './AuthScreen';
import OnboardingScreen from './OnboardingScreen';
import PendingApproval from './pages/PendingApproval';
import RejectedApproval from './pages/RejectedApproval';
import AdminPanel from './pages/AdminPanel';
import Explore from './pages/Explore';
import Matches from './pages/Matches';
import Messages from './pages/Messages';
import ProfileView from './pages/ProfileView';
import Interests from './pages/Interests';
import Chat from './pages/Chat';
import EditProfile from './pages/EditProfile';
import PlansScreen from './pages/PlansScreen';
import PrivacyScreen from './pages/PrivacyScreen';

// Dedupe global: o mesmo userId nunca dispara 2 queries de perfil em paralelo
// (getSession + evento SIGNED_IN chegavam juntos e duplicavam a espera).
const profileRequests = new Map();

function fetchProfileOnce(userId) {
  if (!profileRequests.has(userId)) {
    const req = supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error('Erro ao carregar perfil:', error.message);
        }
        return data ?? null;
      })
      .finally(() => profileRequests.delete(userId));
    profileRequests.set(userId, req);
  }
  return profileRequests.get(userId);
}

// Corrida contra o tempo: nenhuma espera de rede pode travar o app para sempre.
function withTimeout(promise, ms, fallback) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('explore');
  const [activeChat, setActiveChat] = useState(null);
  const [overlay, setOverlay] = useState(null);
  const [exploreInterest, setExploreInterest] = useState('');
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [authMode, setAuthMode] = useState('login');
  const [profileStuck, setProfileStuck] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const isAdminRoute = params.get('admin') === 'true';
  const isLegalRoute = params.get('legal') === '1' || params.get('legal') === 'true';

  const fetchProfile = useCallback((userId) => fetchProfileOnce(userId), []);

  useEffect(() => {
    let active = true;
    let lastSessionId = null;

    async function syncSession(nextSession) {
      if (!active) return;

      if (!nextSession) {
        lastSessionId = null;
        setSession(null);
        setProfile(null);
        setActiveTab('explore');
        setActiveChat(null);
        setOverlay(null);
        setExploreInterest('');
        setCurrentScreen('welcome');
        setLoading(false);
        return;
      }

      setSession(nextSession);

      if (lastSessionId === nextSession.user.id && profile) {
        setLoading(false);
        return;
      }

      lastSessionId = nextSession.user.id;
      // Splash visível enquanto o perfil é buscado — nunca mais tela preta.
      // Teto de 8s: se a rede do aparelho travar, o app não fica preso para sempre.
      setLoading(true);
      // undefined = timeout de rede; null = perfil realmente não existe (onboarding)
      const nextProfile = await withTimeout(fetchProfile(nextSession.user.id), 8000, undefined);

      if (!active) return;

      if (nextProfile === undefined) {
        setProfile(null);
        setProfileStuck(true);
        setLoading(false);
        return;
      }

      setProfileStuck(false);
      setProfile(nextProfile);
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      syncSession(currentSession);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'SIGNED_OUT') {
        syncSession(null);
        return;
      }
      if (event === 'TOKEN_REFRESHED' && lastSessionId === nextSession?.user?.id) {
        return;
      }
      syncSession(nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
    // O perfil é lido apenas na troca de sessão; edições usam refreshProfile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (!session?.user?.id) return;
    const nextProfile = await fetchProfile(session.user.id);
    setProfile(nextProfile);
  }, [session, fetchProfile]);

  async function retryLoad() {
    const userId = session?.user?.id;
    if (!userId || loading) return;
    setProfileStuck(false);
    setLoading(true);
    const nextProfile = await withTimeout(fetchProfile(userId), 8000, undefined);
    if (nextProfile === undefined) {
      setProfileStuck(true);
      setLoading(false);
      return;
    }
    setProfile(nextProfile);
    setLoading(false);
  }

  if (isLegalRoute) {
    return (
      <PrivacyScreen
        standalone
        onBack={() => {
          window.location.href = window.location.pathname;
        }}
      />
    );
  }

  if (loading) {
    return (
      <div
        className="min-h-screen text-[#f8e3d8] flex flex-col items-center justify-center gap-5"
        role="status"
        aria-label="Carregando o Duo Match"
      >
        <Heart
          size={64}
          strokeWidth={1.6}
          className="text-rose-200/90 animate-pulse"
          fill="rgba(244,236,232,0.12)"
        />
        <span className="font-logo italic text-5xl leading-none tracking-[-0.04em]">
          match
        </span>
        <span className="text-[11px] uppercase tracking-[0.3em] text-[#e8cbc4]/60">
          Carregando
        </span>
      </div>
    );
  }

  if (session && profileStuck) {
    return (
      <div className="min-h-screen text-[#f8e3d8] flex flex-col items-center justify-center gap-6 px-8 text-center">
        <Heart
          size={56}
          strokeWidth={1.6}
          className="text-rose-200/90"
          fill="rgba(244,236,232,0.12)"
        />
        <h1 className="font-serif text-2xl text-rose-50">
          Não foi possível carregar seus dados
        </h1>
        <p className="text-sm text-rose-100/60 max-w-xs leading-relaxed">
          A conexão com o servidor demorou demais. Verifique sua internet (ou
          tente pela rede celular) e toque em tentar novamente.
        </p>
        <button
          type="button"
          onClick={retryLoad}
          className="rounded-full bg-[#f4ece8] px-8 py-3.5 text-sm font-semibold text-[#3a1c1c] hover:bg-white transition-colors"
        >
          Tentar novamente
        </button>
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="text-xs text-rose-200/55 underline underline-offset-4 hover:text-rose-100"
        >
          Sair da conta
        </button>
      </div>
    );
  }

  // Fluxo 1: visitante
  if (!session) {
    return (
      <div className="font-sans antialiased">
        {currentScreen === 'welcome' ? (
          <WelcomeScreen
            onStart={() => {
              setAuthMode('signup');
              setCurrentScreen('auth');
            }}
            onEnterAccount={() => {
              setAuthMode('login');
              setCurrentScreen('auth');
            }}
          />
        ) : (
          <AuthScreen onBack={() => setCurrentScreen('welcome')} initialMode={authMode} />
        )}
      </div>
    );
  }

  // Fluxo 2: perfil incompleto
  if (!profile || !profile.full_name) {
    return <OnboardingScreen session={session} />;
  }

  // Fluxo 3: curadoria
  if (profile.status === 'pending') {
    return <PendingApproval />;
  }

  if (profile.status === 'rejected') {
    return <RejectedApproval />;
  }

  if (profile.status !== 'approved') {
    return <PendingApproval />;
  }

  // Rota administrativa direta
  if (isAdminRoute) {
    if (profile.role === 'admin') {
      return (
        <AdminPanel
          onBack={() => {
            window.location.href = '/';
          }}
        />
      );
    }
    return <AdminDenied />;
  }

  // Conversa aberta
  if (activeChat) {
    return (
      <Chat
        matchId={activeChat.matchId}
        otherUser={activeChat.otherUser}
        onBack={() => setActiveChat(null)}
      />
    );
  }

  // Telas sobrepostas (planos, privacidade, edição, comunidades, admin)
  if (overlay) {
    if (overlay === 'interests') {
      return (
        <Interests
          onBack={() => setOverlay(null)}
          onSelectInterest={(interest) => {
            setExploreInterest(interest);
            setOverlay(null);
            setActiveTab('explore');
            window.scrollTo(0, 0);
          }}
        />
      );
    }

    if (overlay === 'plans') {
      return <PlansScreen user={session.user} onBack={() => setOverlay(null)} />;
    }

    if (overlay === 'privacy') {
      return <PrivacyScreen onBack={() => setOverlay(null)} />;
    }

    if (overlay === 'editProfile') {
      return (
        <EditProfile
          profile={profile}
          onBack={() => setOverlay(null)}
          onSaved={(updatedProfile) => {
            setProfile(updatedProfile);
            setOverlay(null);
          }}
        />
      );
    }

    if (overlay === 'admin' && profile.role === 'admin') {
      return <AdminPanel onBack={() => setOverlay(null)} />;
    }
  }

  function renderTab() {
    switch (activeTab) {
      case 'matches':
        return (
          <Matches
            onSelectMatch={(matchId, otherUser) =>
              setActiveChat({ matchId, otherUser })
            }
            onOpenPlans={() => setOverlay('plans')}
            onGoExplore={() => setActiveTab('explore')}
          />
        );
      case 'messages':
        return (
          <Messages
            onSelectMatch={(matchId, otherUser) =>
              setActiveChat({ matchId, otherUser })
            }
            onGoExplore={() => setActiveTab('explore')}
          />
        );
      case 'profile':
        return (
          <ProfileView
            profile={profile}
            onEdit={() => setOverlay('editProfile')}
            onOpenPlans={() => setOverlay('plans')}
            onOpenInterests={() => setOverlay('interests')}
            onOpenPrivacy={() => setOverlay('privacy')}
            onOpenAdmin={
              profile.role === 'admin'
                ? () => setOverlay('admin')
                : undefined
            }
          />
        );
      default:
        return (
          <Explore
            initialInterest={exploreInterest}
            onInitialInterestApplied={() => setExploreInterest('')}
            onOpenChat={(matchId, otherUser) =>
              setActiveChat({ matchId, otherUser })
            }
            onOpenInterests={() => setOverlay('interests')}
          />
        );
    }
  }

  return (
    <div
      className="font-sans antialiased min-h-screen text-white"
    >
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#150408]">
        <div className="max-w-md mx-auto px-5 h-16 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              setActiveTab('explore');
              setExploreInterest('');
              window.scrollTo(0, 0);
            }}
            className="flex items-baseline gap-1.5"
            aria-label="Duo Match"
          >
            <span className="font-serif text-2xl tracking-tighter text-rose-50">
              match
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500/80 mb-1" />
          </button>

          <div className="flex items-center gap-2">
            {profile.role === 'admin' && (
              <button
                type="button"
                onClick={() => setOverlay('admin')}
                className="w-10 h-10 rounded-full border border-amber-800/20 bg-amber-950/20 flex items-center justify-center text-amber-200/70 hover:bg-amber-950/30 transition-colors"
                aria-label="Painel de curadoria"
              >
                <ShieldAlert size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setOverlay('interests')}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[10px] uppercase tracking-widest text-rose-100/55 hover:bg-white/[0.07] transition-colors"
            >
              <Users size={14} /> Comunidades
            </button>
          </div>
        </div>
      </header>

      <main className="pb-nav">{renderTab()}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.07] bg-[#150408] pb-safe shadow-[0_-8px_24px_rgba(0,0,0,0.35)]">
        <div className="max-w-md mx-auto flex justify-around px-2 py-2">
          <TabButton
            icon={Compass}
            label="Descobrir"
            active={activeTab === 'explore'}
            onClick={() => {
              setActiveTab('explore');
              window.scrollTo(0, 0);
            }}
          />
          <TabButton
            icon={Heart}
            label="Matches"
            active={activeTab === 'matches'}
            onClick={() => {
              setActiveTab('matches');
              window.scrollTo(0, 0);
            }}
          />
          <TabButton
            icon={MessageCircle}
            label="Mensagens"
            active={activeTab === 'messages'}
            onClick={() => {
              setActiveTab('messages');
              window.scrollTo(0, 0);
            }}
          />
          <TabButton
            icon={User}
            label="Perfil"
            active={activeTab === 'profile'}
            onClick={() => {
              setActiveTab('profile');
              window.scrollTo(0, 0);
            }}
          />
        </div>
      </nav>
    </div>
  );
}

function TabButton({ icon: Icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1 px-4 py-1.5 transition-colors ${
        active ? 'text-rose-300' : 'text-rose-100/25 hover:text-rose-100/50'
      }`}
    >
      <Icon size={21} strokeWidth={active ? 2.2 : 1.8} />
      <span className="text-[9px] font-semibold uppercase tracking-tight">
        {label}
      </span>
      {active && (
        <span className="absolute -top-1 w-1 h-1 rounded-full bg-rose-400" />
      )}
    </button>
  );
}

function AdminDenied() {
  return (
    <div className="min-h-screen text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full border border-red-900/30 bg-red-950/20 flex items-center justify-center mb-5">
        <ShieldAlert size={26} className="text-red-300/70" />
      </div>
      <h1 className="text-3xl font-serif text-rose-50 mb-2">Acesso restrito</h1>
      <p className="text-sm text-rose-100/45 max-w-xs leading-relaxed mb-7">
        Esta área é exclusiva da equipe de curadoria do Duo Match.
      </p>
      <button
        type="button"
        onClick={() => {
          window.location.href = '/';
        }}
        className="rounded-full border border-white/15 px-6 py-3 text-sm text-rose-100/70 hover:bg-white/5 transition-colors"
      >
        Voltar para o app
      </button>
    </div>
  );
}

export default App;
