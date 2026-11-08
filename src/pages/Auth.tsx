import { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Heart } from 'lucide-react';

export default function Auth() {
  const [view, setView] = useState<'splash' | 'login' | 'signup'>('splash');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (isSignUp: boolean) => {
    setLoading(true);
    const { error } = isSignUp 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    
    if (error) alert(error.message);
    else if (isSignUp) alert('Verifique seu e-mail para confirmar o cadastro!');
    setLoading(false);
  };

  if (view === 'splash') {
    return (
      <div className="min-h-screen bg-wine-gradient flex flex-col items-center justify-between p-8 text-center text-white">
        <div className="mt-32 flex flex-col items-center">
          <div className="relative mb-4">
             <Heart size={64} strokeWidth={1} className="text-white opacity-80" />
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-1">
               <Heart size={20} fill="white" className="text-white" />
             </div>
          </div>
          <h1 className="text-6xl font-serif lowercase tracking-tighter">match</h1>
          <div className="mt-8 space-y-1">
            <p className="text-stone-300 font-light tracking-widest text-sm uppercase">Conexões reais.</p>
            <p className="text-stone-300 font-light tracking-widest text-sm uppercase">Relacionamentos de verdade.</p>
          </div>
        </div>

        <div className="w-full max-w-xs space-y-4 mb-12">
          <button 
            onClick={() => setView('signup')}
            className="w-full bg-white text-black py-4 rounded-full font-semibold text-lg hover:bg-stone-200 transition-all active:scale-95"
          >
            Começar
          </button>
          <button 
            onClick={() => setView('login')}
            className="w-full border border-white text-white py-4 rounded-full font-semibold text-lg hover:bg-white/10 transition-all active:scale-95"
          >
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col p-8">
      <button onClick={() => setView('splash')} className="text-stone-400 mb-12 self-start">&larr; Voltar</button>
      
      <h2 className="text-4xl font-serif text-wine mb-2">
        {view === 'login' ? 'Bem-vindo de volta' : 'Criar sua conta'}
      </h2>
      <p className="text-stone-500 mb-12">
        {view === 'login' ? 'Entre para continuar suas conexões.' : 'Inicie sua jornada para uma conexão real.'}
      </p>

      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400 ml-1">E-mail</label>
          <input 
            type="email"
            className="w-full bg-white p-4 border border-stone-200 rounded-2xl focus:ring-1 focus:ring-wine outline-none transition-all" 
            placeholder="seu@email.com" 
            onChange={(e) => setEmail(e.target.value)} 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400 ml-1">Senha</label>
          <input 
            type="password"
            className="w-full bg-white p-4 border border-stone-200 rounded-2xl focus:ring-1 focus:ring-wine outline-none transition-all" 
            placeholder="••••••••" 
            onChange={(e) => setPassword(e.target.value)} 
          />
        </div>
        
        <button 
          onClick={() => handleAuth(view === 'signup')}
          disabled={loading}
          className="w-full bg-wine text-white py-5 rounded-full font-bold text-lg mt-8 shadow-xl shadow-wine/20 hover:bg-stone-800 transition-all active:scale-95 disabled:opacity-50"
        >
          {loading ? 'Processando...' : view === 'login' ? 'Entrar' : 'Continuar'}
        </button>
      </div>
    </div>
  );
}
