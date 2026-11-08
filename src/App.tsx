import { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { Search, Heart, MessageCircle, User } from 'lucide-react';
import Auth from './pages/Auth';
import CompleteProfile from './pages/CompleteProfile';
import PendingApproval from './pages/PendingApproval';
import AdminPanel from './pages/AdminPanel';
import Explore from './pages/Explore';
import Matches from './pages/Matches';
import ProfileView from './pages/ProfileView';

function App() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('explore');

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        setProfile(data);
      }
      setSession(session);
      setLoading(false);
    }
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
         supabase.from('profiles').select('*').eq('id', session.user.id).single()
            .then(({ data }) => setProfile(data));
      } else { setProfile(null); }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdminRoute = new URLSearchParams(window.location.search).get('admin') === 'true';
  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white font-serif">Carregando...</div>;

  const showNav = session && profile?.status === 'approved' && !isAdminRoute;

  const renderContent = () => {
    if (!session) return <Auth />;
    if (isAdminRoute && profile?.role === 'admin') return <AdminPanel />;
    if (!profile || !profile.full_name) return <CompleteProfile />;
    if (profile.status === 'pending') return <PendingApproval />;
    
    switch (activeTab) {
      case 'matches': return <Matches />;
      case 'messages': return <div className="p-8 text-center text-white/50">Mensagens em breve</div>;
      case 'profile': return <ProfileView />;
      default: return <Explore />;
    }
  };

  return (
    <div className="font-sans text-white min-h-screen bg-[#0F0F10] pb-24">
      <main>{renderContent()}</main>

      {showNav && (
        <nav className="fixed bottom-0 left-0 w-full bg-[#1C1C1E]/95 backdrop-blur-lg border-t border-white/10 flex justify-around p-3 z-50">
          <button onClick={() => setActiveTab('explore')} className={`flex flex-col items-center gap-1 ${activeTab === 'explore' ? 'text-wine-bright' : 'text-stone-500'}`}>
            <Search size={24} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Descobrir</span>
          </button>
          <button onClick={() => setActiveTab('matches')} className={`flex flex-col items-center gap-1 ${activeTab === 'matches' ? 'text-wine-bright' : 'text-stone-500'}`}>
            <Heart size={24} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Matches</span>
          </button>
          <button onClick={() => setActiveTab('messages')} className={`flex flex-col items-center gap-1 ${activeTab === 'messages' ? 'text-wine-bright' : 'text-stone-500'}`}>
            <MessageCircle size={24} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Mensagens</span>
          </button>
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-wine-bright' : 'text-stone-500'}`}>
            <User size={24} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Perfil</span>
          </button>
        </nav>
      )}
    </div>
  );
}

export default App;
