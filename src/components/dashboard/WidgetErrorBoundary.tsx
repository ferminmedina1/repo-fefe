import React, { ReactNode, ErrorInfo } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  widgetName?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Error Boundary for individual widgets
 * Catches errors and displays user-friendly error UI
 * Prevents one widget error from crashing entire dashboard
 */
export class WidgetErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console for debugging
    console.error(`Widget error (${this.props.widgetName}):`, error, errorInfo);

    // Update state with error info
    this.setState({ errorInfo });

    // Optional callback for error tracking/logging
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 rounded-lg border border-red-500/30 bg-red-50 dark:bg-red-950/20 dark:border-red-500/40 flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-red-800 dark:text-red-300">
                Error en {this.props.widgetName || 'widget'}
              </h3>
              <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                {this.state.error?.message || 'Error desconocido'}
              </p>
            </div>
          </div>

          {/* Error Details (Dev mode) */}
          {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
            <details className="text-xs">
              <summary className="cursor-pointer text-red-600 dark:text-red-400 hover:underline">
                Detalles técnicos
              </summary>
              <pre className="mt-2 p-2 bg-red-100/50 dark:bg-red-950/40 rounded text-xs overflow-auto max-h-40 text-red-900 dark:text-red-200">
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}

          {/* Action */}
          <button
            onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
            className="text-xs px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white transition-colors self-start"
          >
            Intentar de nuevo
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
