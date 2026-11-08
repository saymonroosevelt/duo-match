import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

function ConfigError() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-8 text-center"
      style={{ background: 'linear-gradient(135deg, #1f0408 0%, #0d0103 100%)' }}
    >
      <div className="max-w-sm">
        <h1 className="font-serif text-4xl text-[#f8e3d8] mb-4">Configuração pendente</h1>
        <p className="text-[#e8cbc4]/90 text-base leading-relaxed">
          As variáveis de ambiente do Supabase não foram configuradas no deploy.
          Defina <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> no
          painel da Netlify e faça um novo deploy.
        </p>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  supabaseUrl && supabaseAnonKey ? <App /> : <ConfigError />,
)
