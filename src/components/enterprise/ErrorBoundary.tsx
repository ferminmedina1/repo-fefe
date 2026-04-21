/**
 * Enterprise Error Boundary Component
 * Captura errores en React con logging automático
 */

import React, { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { getLogger } from "@/lib/dashboard/enterpriseLogger";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  componentName?: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary with enterprise logging
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private logger = getLogger();

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log the error
    this.logger.error("ErrorBoundary", `Error in ${this.props.componentName || "component"}`, error);

    // Store error info
    this.setState({
      errorInfo,
    });

    // Call custom handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Log recovery
    this.logger.info("ErrorBoundary", `Recovered from error in ${this.props.componentName || "component"}`);
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background p-4 flex items-center justify-center">
          <div className="max-w-md w-full space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error en {this.props.componentName || "la aplicación"}</AlertTitle>
              <AlertDescription className="mt-2">
                Algo salió mal. Por favor intenta recargar la página o contacta soporte.
              </AlertDescription>
            </Alert>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="bg-muted p-4 rounded-lg text-sm font-mono text-muted-foreground overflow-auto max-h-48">
                <div className="font-bold mb-2">Error Details:</div>
                <div>{this.state.error.toString()}</div>
                {this.state.errorInfo && (
                  <div className="mt-2">
                    <div className="font-bold mb-1">Stack:</div>
                    <div className="text-xs">{this.state.errorInfo.componentStack}</div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={this.handleReset} variant="outline" className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
              <Button
                onClick={() => window.location.href = "/"}
                variant="default"
                className="flex-1"
              >
                Ir al inicio
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
