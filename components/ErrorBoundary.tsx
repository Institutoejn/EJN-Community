import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Fix: Using named import 'Component' and removing redundant 'public state' declaration to ensure TypeScript correctly recognizes inherited 'props' from React.Component
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReload = () => {
    // Limpa caches que possam estar corrompidos antes de recarregar
    try {
        localStorage.removeItem('ejn_posts_cache'); 
    } catch(e) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-6 font-sans">
          <div className="bg-white p-8 md:p-10 rounded-[32px] shadow-2xl max-w-md w-full text-center border border-red-50">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-[#1D1D1F] mb-3">Ops! Algo deu errado.</h2>
            <p className="text-[#86868B] text-sm font-medium mb-8 leading-relaxed">
              Não se preocupe, seus dados estão seguros. Ocorreu uma falha técnica momentânea na interface.
            </p>
            <button
              onClick={this.handleReload}
              className="w-full py-4 bg-[#0D4D4D] text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-[#1A7A70] hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
            >
              Recuperar Sessão
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;