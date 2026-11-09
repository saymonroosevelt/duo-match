import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import MobileGate from './components/MobileGate.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <MobileGate>
      <App />
    </MobileGate>
  </ErrorBoundary>,
)
