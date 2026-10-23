import React, { Component, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            width: '100%',
            padding: '24px',
            textAlign: 'center',
            color: 'var(--text-primary, #fff)',
            backgroundColor: 'var(--bg-reader, #1a1a24)',
          }}
        >
          <AlertCircle size={48} style={{ color: 'var(--error, #ef4444)', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
            Ocorreu um erro ao carregar o leitor
          </h2>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary, #94a3b8)',
              maxWidth: '400px',
              marginBottom: '20px',
              wordBreak: 'break-word',
            }}
          >
            {this.state.error?.message || 'Erro desconhecido na visualização do documento.'}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              backgroundColor: 'var(--accent, #6366f1)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Voltar para a Biblioteca
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

