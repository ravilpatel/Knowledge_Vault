import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    if (
      confirm(
        'Are you sure you want to clear cached session and local application state? Your local notes stored in IndexedDB and Google Drive will remain safe.'
      )
    ) {
      try {
        localStorage.removeItem('kv_supabase_url');
        localStorage.removeItem('kv_supabase_anon_key');
        localStorage.removeItem('notevault_guest_mode');
        localStorage.removeItem('notevault_theme');
        sessionStorage.clear();
      } catch (e) {
        console.warn('Error clearing storage:', e);
      }
      window.location.reload();
    }
  };

  private handleReturnToRoot = () => {
    window.location.href = window.location.pathname;
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100 font-sans select-none">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">Application Encountered an Error</h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  NoteVault caught a runtime exception. Your data remains protected.
                </p>
              </div>
            </div>

            {this.state.error && (
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-rose-300 font-mono overflow-x-auto max-h-36">
                <div className="font-bold text-rose-400 mb-1">
                  {this.state.error.name}: {this.state.error.message}
                </div>
                {this.state.error.stack && (
                  <pre className="text-[10px] text-slate-400 whitespace-pre-wrap leading-relaxed">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>

              <button
                onClick={this.handleResetCache}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition border border-slate-700"
              >
                <Trash2 className="w-4 h-4 text-amber-400" />
                <span>Clear Cache & Reset</span>
              </button>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <button
                onClick={this.handleReturnToRoot}
                className="inline-flex items-center gap-1.5 text-slate-400 hover:text-indigo-400 transition"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Return to Home</span>
              </button>
              <span>NoteVault Resilience Layer</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
