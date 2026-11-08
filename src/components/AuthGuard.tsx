import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export default function AuthGuard({ children }: { children: (session: any) => React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="min-h-screen bg-cream flex items-center justify-center">Carregando Duo Match...</div>;

  return <>{children(session)}</>;
}
