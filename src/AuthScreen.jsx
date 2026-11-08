import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Heart, Loader2, Lock, Mail } from 'lucide-react';
import { supabase } from './lib/supabase';

function translateAuthError(message) {
  if (/invalid login credentials/i.test(message)) {
    return 'E-mail ou senha incorretos.';
  }
  if (/user already registered/i.test(message)) {
    return 'Este e-mail já tem uma conta. Use "Já tenho conta".';
  }
  if (/password should be at least/i.test(message)) {
    return 'A senha precisa ter pelo menos 6 caracteres.';
  }
  if (/email not confirmed/i.test(message)) {
    return 'Confirme seu e-mail antes de entrar.';
  }
  if (/invalid email/i.test(message)) {
    return 'Informe um e-mail válido.';
  }
  if (/rate limit/i.test(message)) {
    return 'Muitas tentativas. Aguarde alguns instantes e tente novamente.';
  }
  return message;
}

export default function AuthScreen({ onBack, initialMode = 'login' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('error');
  const [resetLoading, setResetLoading] = useState(false);

  async function handleAuth(isLogin) {
    if (loading) return;
    setMessage('');

    if (!email.trim()) {
      setMessage('Informe seu e-mail.');
      setMessageType('error');
      return;
    }
    if (!password) {
      setMessage('Informe sua senha.');
      setMessageType('error');
      return;
    }
    if (!isLogin && password.length < 6) {
      setMessage('A senha precisa ter pelo menos 6 caracteres.');
      setMessageType('error');
      return;
    }
    if (!isLogin && !accepted) {
      setMessage('Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.');
      setMessageType('error');
      return;
    }

    setLoading(true);

    const result = isLogin
      ? await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
      : await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              lgpd_accepted_at: new Date().toISOString(),
            },
          },
        });

    setLoading(false);

    if (result.error) {
      setMessage(translateAuthError(result.error.message));
      setMessageType('error');
      return;
    }

    if (!isLogin) {
      if (result.data.session) {
        setMessage('Conta criada! Vamos completar seu perfil.');
      } else {
        setMessage(
          'Conta criada! Enviamos um link de confirmação para o seu e-mail. Depois de confirmar, volte e entre.',
        );
      }
      setMessageType('success');
    } else {
      setMessage('Login realizado. Bem-vindo de volta.');
      setMessageType('success');
    }
  }

  async function handleReset() {
    if (resetLoading) return;
    if (!email.trim()) {
      setMessage('Digite seu e-mail para receber o link de recuperação.');
      setMessageType('error');
      return;
    }

    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    setResetLoading(false);

    if (error) {
      setMessage(translateAuthError(error.message));
      setMessageType('error');
      return;
    }

    setMessage(
      'Enviamos um link de recuperação para o seu e-mail. Ao voltar, altere a senha em Perfil > Privacidade e dados.',
    );
    setMessageType('success');
  }

  return (
    <main className="min-h-[100dvh] text-white p-6 flex flex-col relative overflow-hidden">

      <button
        type="button"
        onClick={onBack}
        className="mt-4 mb-8 z-10 w-fit text-rose-200/70 hover:text-rose-100 transition-colors"
        aria-label="Voltar"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>

      <div className="flex-1 flex flex-col z-10 max-w-md w-full mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Heart className="w-5 h-5 text-rose-300/80" />
            <span className="font-logo text-xl font-medium tracking-[-0.04em] text-rose-50/90">
              match
            </span>
            <span className="ml-auto rounded-full border border-rose-800/30 bg-rose-950/30 px-2.5 py-1 text-[9px] uppercase tracking-widest text-rose-200/60">
              18+
            </span>
          </div>
          <h2 className="text-3xl font-serif mb-2 text-rose-50">{initialMode === 'login' ? 'Entre na sua conta.' : 'Criar sua conta.'}</h2>
          <p className="text-sm text-rose-100/50 leading-relaxed">
            {initialMode === 'login'
              ? 'Entre na sua conta. A curadoria aprova cada perfil antes de liberar o acesso às conexões.'
              : 'Criar sua conta. A curadoria aprova cada perfil antes de liberar o acesso às conexões.'}
          </p>
        </div>

        <div className="flex flex-col gap-3.5">
          <label className="block">
            <span className="text-xs text-rose-100/55 ml-1">E-mail</span>
            <div className="relative mt-1.5">
              <Mail
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-100/30"
              />
              <input
                type="email"
                placeholder="Seu melhor e-mail"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                autoFocus
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-4 pl-11 pr-4 text-sm text-rose-50 placeholder:text-rose-100/25 focus:outline-none focus:border-rose-500/60 transition-colors"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs text-rose-100/55 ml-1">Senha</span>
            <div className="relative mt-1.5">
              <Lock
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-100/30"
              />
              <input
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-4 pl-11 pr-4 text-sm text-rose-50 placeholder:text-rose-100/25 focus:outline-none focus:border-rose-500/60 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-100/40 hover:text-rose-100 transition-colors"
                aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleReset}
              disabled={resetLoading}
              className="text-[11px] text-rose-300/70 hover:text-rose-200 transition-colors"
            >
              {resetLoading ? 'Enviando...' : 'Esqueci minha senha'}
            </button>
            <span className="text-[10px] text-rose-100/55">Conexão segura</span>
          </div>

          <label className="flex items-start gap-3 mt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/5 accent-rose-600"
            />
            <span className="text-[11px] text-rose-100/60 leading-relaxed">
              Li e aceito os{' '}
              <a
                href="/?legal=1&tab=terms"
                target="_blank"
                rel="noreferrer"
                className="text-rose-200/80 underline decoration-rose-400/30 underline-offset-2"
              >
                Termos de Uso
              </a>{' '}
              e a{' '}
              <a
                href="/?legal=1&tab=privacy"
                target="_blank"
                rel="noreferrer"
                className="text-rose-200/80 underline decoration-rose-400/30 underline-offset-2"
              >
                Política de Privacidade
              </a>
              . Tenho 18 anos ou mais.
            </span>
          </label>

          {message && (
            <div
              className={`rounded-xl border px-4 py-3 text-xs leading-relaxed ${
                messageType === 'success'
                  ? 'border-emerald-700/30 bg-emerald-950/20 text-emerald-200/80'
                  : 'border-red-500/20 bg-red-950/20 text-red-200/80'
              }`}
            >
              {message}
            </div>
          )}

          <div className="mt-5 flex flex-col gap-3">
            {initialMode === 'login' ? (
              <button
                type="button"
                onClick={() => handleAuth(true)}
                disabled={loading}
                className="w-full rounded-full border border-white/20 bg-transparent py-4 text-sm font-medium text-[#f4ece8] hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                Entrar na sua conta
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleAuth(false)}
                disabled={loading}
                className="w-full rounded-full bg-[#f4ece8] py-4 text-sm font-semibold text-[#3a1c1c] hover:bg-white transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                Criar sua conta
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

