import React, { ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

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
        <div className="p-4 rounded-lg border border-border/60 bg-background/80 flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-foreground">
                No se pudo cargar {this.props.widgetName || 'este widget'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Intentá recargar el bloque o reemplazarlo por otro más adecuado.
              </p>
            </div>
          </div>

          {/* Error Details (Dev mode) */}
          {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground hover:underline">
                Detalles técnicos
              </summary>
              <pre className="mt-2 p-2 bg-muted/50 rounded text-xs overflow-auto max-h-40 text-foreground">
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}

          {/* Action */}
          <button
            onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
            className="text-xs px-3 py-1 rounded bg-primary hover:bg-primary/90 text-primary-foreground transition-colors self-start inline-flex items-center gap-2"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Intentar de nuevo
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
