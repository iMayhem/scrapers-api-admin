import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center min-h-screen bg-background text-white p-6 text-center">
            <h1 className="text-3xl font-bold mb-4 text-red-500">Something went wrong</h1>
            <p className="text-zinc-400 mb-6 max-w-md">
              The application encountered an unexpected error. This might be due to a configuration issue or a temporary glitch.
            </p>
            <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 text-left font-mono text-sm overflow-auto max-w-2xl mb-8">
              <p className="text-red-400 font-bold mb-2">Error Details:</p>
              {this.state.error?.message || 'Unknown error'}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="bg-primary hover:bg-accent text-white px-6 py-2 rounded-xl font-bold transition-all"
            >
              Reload Application
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
