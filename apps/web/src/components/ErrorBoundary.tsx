import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    // TODO: Send to error tracking service (e.g., Sentry) in production
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-950 to-orange-950 p-4">
          <div className="bg-dark-card rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
            <div className="text-6xl mb-4">😵</div>
            <h1 className="text-2xl font-bold text-zinc-100 mb-2">Something went wrong</h1>
            <p className="text-zinc-400 mb-6">
              We encountered an unexpected error. Don&apos;t worry, your progress is saved!
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div className="bg-red-950 border border-red-800 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm font-mono text-red-400 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleRetry}
                className="flex-1 py-3 bg-mint-500 hover:bg-mint-600 text-white font-bold rounded-lg transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 py-3 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 font-bold rounded-lg transition-colors"
              >
                Reload Page
              </button>
            </div>

            <p className="mt-6 text-sm text-zinc-500">
              If this keeps happening, please{' '}
              <a
                href="https://github.com/anthropics/claude-code/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-mint-400 hover:underline"
              >
                report the issue
              </a>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
