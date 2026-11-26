import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

// Captcha Cloudflare Turnstile (gratuito, quase sempre invisível para humanos).
// Só liga quando VITE_TURNSTILE_SITE_KEY está configurada — sem ela, nada muda.
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
export const CAPTCHA_ENABLED = Boolean(TURNSTILE_SITE_KEY);

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptPromise = null;

function loadScript() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SCRIPT_SRC;
      s.async = true;
      s.onload = () => resolve(window.turnstile);
      s.onerror = () => {
        scriptPromise = null;
        reject(new Error('turnstile_load_failed'));
      };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

const Turnstile = forwardRef(function Turnstile({ onToken }, ref) {
  const box = useRef(null);
  const widgetId = useRef(null);

  useImperativeHandle(ref, () => ({
    // Cada token vale uma única vez: zera depois de cada tentativa.
    reset() {
      onToken('');
      if (widgetId.current != null) window.turnstile?.reset(widgetId.current);
    },
  }));

  useEffect(() => {
    if (!CAPTCHA_ENABLED) return undefined;
    let cancelled = false;
    loadScript()
      .then((ts) => {
        if (cancelled || !box.current || !ts) return;
        widgetId.current = ts.render(box.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: 'dark',
          language: 'pt-br',
          callback: (token) => onToken(token),
          'expired-callback': () => onToken(''),
          'error-callback': () => onToken(''),
        });
      })
      .catch(() => onToken(''));
    return () => {
      cancelled = true;
      if (widgetId.current != null) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!CAPTCHA_ENABLED) return null;
  return <div ref={box} className="mt-3 flex justify-center min-h-[65px]" />;
});

export default Turnstile;
