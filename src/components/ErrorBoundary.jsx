import { Component } from 'react';

// Captura qualquer erro de renderização do React e evita tela preta/branca vazia.
// Detalhes do erro ficam salvos para copiar e enviar à curadoria.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      message: '',
      componentStack: '',
      copied: false,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: String(error?.message || error || 'Erro inesperado'),
    };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary capturou:', error, info?.componentStack);
    this.setState({
      componentStack: String(info?.componentStack || ''),
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.assign('/');
  };

  handleCopyDetails = async () => {
    const details = [
      'Duo Match — detalhes do erro',
      `Mensagem: ${this.state.message || '(sem mensagem)'}`,
      '',
      `Componentes:\n${this.state.componentStack || '(não disponível)'}`,
      '',
      `URL: ${window.location.href}`,
      `User-Agent: ${navigator.userAgent}`,
    ].join('\n');

    try {
      await navigator.clipboard?.writeText(details);
    } catch {
      const input = document.createElement('textarea');
      input.value = details;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    this.setState({ copied: true });
    window.setTimeout(() => this.setState({ copied: false }), 2500);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center gap-6 px-8 text-center"
          style={{ backgroundColor: '#120306', color: '#f8e3d8' }}
          role="alert"
        >
          <svg width="64" height="64" viewBox="0 0 120 120" fill="none" aria-hidden="true">
            <path
              d="M60 102C38 82 14 70 13 52C12 38 23 27 36 26C50 25 55 33 60 43C65 33 72 25 90 26C100 27 108 38 107 52C106 70 89 80 71 98"
              stroke="#f4ece8"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h1 className="font-serif text-2xl text-rose-50">Algo deu errado</h1>
          <p className="text-sm text-rose-100/60 max-w-xs leading-relaxed">
            Não foi possível exibir esta tela. Recarregue o app — seus dados estão seguros.
          </p>
          {this.state.message ? (
            <p className="text-[10px] text-rose-100/35 max-w-xs break-words">
              {this.state.message}
            </p>
          ) : null}
          <button
            type="button"
            onClick={this.handleReload}
            className="rounded-full bg-[#f4ece8] px-8 py-3.5 text-sm font-semibold text-[#3a1c1c] hover:bg-white transition-colors"
          >
            Recarregar o app
          </button>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={this.handleGoHome}
              className="text-xs text-rose-200/55 underline underline-offset-4 hover:text-rose-100"
            >
              Voltar ao início
            </button>
            <span className="text-rose-100/15">·</span>
            <button
              type="button"
              onClick={this.handleCopyDetails}
              className="text-xs text-rose-200/55 underline underline-offset-4 hover:text-rose-100"
            >
              {this.state.copied ? 'Detalhes copiados' : 'Copiar detalhes'}
            </button>
          </div>
        </div>
      );
    }
    return this.props?.children ?? null;
  }
}
