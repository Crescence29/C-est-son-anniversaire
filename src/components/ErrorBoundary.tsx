import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

// React render errors don't reliably reach window.onerror in every browser,
// so this is a second, more targeted capture path alongside
// installErrorReporting() — specifically for "an error happened while
// rendering the UI", with a real fallback instead of a blank white screen.
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    fetch('/api/logs/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `Erreur de rendu React : ${error.message}`.slice(0, 500), url: window.location.href }),
      keepalive: true,
    }).catch(() => {});
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-fond text-ink text-center">
          <div>
            <h1 className="text-xl font-bold mb-2">Une erreur est survenue.</h1>
            <p className="text-sm text-ink/70 mb-4">L’équipe technique a été informée. Rechargez la page pour continuer.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-full bg-cortex-red text-white font-semibold text-sm"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
