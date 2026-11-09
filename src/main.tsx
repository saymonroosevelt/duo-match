import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import MobileGate from './components/MobileGate.tsx'
import './index.css'
import * as Sentry from '@sentry/react'

// Sentry — só ativa quando o DSN está configurado no build/deploy.
// Sem VITE_SENTRY_DSN (máquina local, pré-setup), o SDK vira no-op e nada muda.
const dsn = import.meta.env.VITE_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE === 'development' ? 'development' : 'production',
    release: (import.meta.env.VITE_SENTRY_RELEASE as string) || 'duomatch@0.1.0',
    tracesSampleRate: 0.2,
    ignoreErrors: [
      /Non-Error promise rejection captured/i,
      /ResizeObserver loop/i,
      /chrome-extension/i,
      /moz-extension/i,
    ],
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <MobileGate>
      <App />
    </MobileGate>
  </ErrorBoundary>,
)
