import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const notConfiguredError = () =>
  new Error(
    'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no deploy da Netlify.',
  );

function createNotConfiguredClient() {
  const error = notConfiguredError();

  const builder = () => {
    const b = {
      select: () => b,
      insert: () => b,
      update: () => b,
      delete: () => b,
      eq: () => b,
      neq: () => b,
      is: () => b,
      in: () => b,
      not: () => b,
      gte: () => b,
      lte: () => b,
      gt: () => b,
      lt: () => b,
      like: () => b,
      ilike: () => b,
      contains: () => b,
      match: () => b,
      filter: () => b,
      order: () => b,
      limit: () => b,
      range: () => b,
      maybeSingle: () => b,
      single: () => b,
      upsert: () => b,
      then: (resolve, reject) =>
        Promise.resolve({ data: null, error }).then(resolve, reject),
    };
    return b;
  };

  const channel = () => {
    const c = {
      on: () => c,
      subscribe: () => Promise.resolve('SUBSCRIBED'),
      unsubscribe: () => Promise.resolve('CLOSED'),
    };
    return c;
  };

  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe() {} } },
      }),
      signUp: () => Promise.resolve({ data: { user: null, session: null }, error }),
      signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error }),
      signInWithOAuth: () => Promise.resolve({ data: { url: null }, error }),
      signInWithOtp: () => Promise.resolve({ data: null, error }),
      resetPasswordForEmail: () => Promise.resolve({ error }),
      signOut: () => Promise.resolve({ error: null }),
    },
    from: () => builder(),
    rpc: () => Promise.resolve({ data: null, error }),
    channel,
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error }),
        remove: () => Promise.resolve({ data: null, error }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
  };
}

// Nunca lança erro no momento do import: o app sempre renderiza,
// mesmo em builds sem as variáveis do Supabase.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createNotConfiguredClient();
