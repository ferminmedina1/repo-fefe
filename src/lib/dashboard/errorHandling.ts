/**
 * Enterprise Error Handling & Recovery
 * Manejo robusto de errores con recuperación
 */

import { getLogger, LogLevel } from "@/lib/dashboard/enterpriseLogger";
import { getConfigManager } from "@/lib/dashboard/enterpriseConfig";

export interface ErrorRecoveryStrategy {
  name: string;
  canHandle: (error: Error) => boolean;
  recover: (error: Error) => Promise<void> | void;
  retry?: boolean;
  maxRetries?: number;
}

export interface ErrorHandler {
  context: string;
  error: Error;
  severity: "low" | "medium" | "high" | "critical";
  timestamp: Date;
  userMessage: string;
  technicalMessage: string;
}

/**
 * Enterprise Error Handler
 */
export class EnterpriseErrorHandler {
  private logger = getLogger();
  private configManager = getConfigManager();
  private strategies: ErrorRecoveryStrategy[] = [];
  private errorHistory: ErrorHandler[] = [];

  constructor() {
    this.registerDefaultStrategies();
  }

  /**
   * Register recovery strategy
   */
  registerStrategy(strategy: ErrorRecoveryStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * Handle error with logging and recovery
   */
  async handleError(
    error: Error,
    context: string,
    userMessage?: string
  ): Promise<ErrorHandler | null> {
    const logLevel = this.config.logging.logLevel;
    const severity = this.determineSeverity(error);

    const handler: ErrorHandler = {
      context,
      error,
      severity,
      timestamp: new Date(),
      userMessage:
        userMessage ||
        this.getDefaultUserMessage(error),
      technicalMessage: error.message,
    };

    // Log the error
    this.logger.error(context, handler.userMessage, error);

    // Store in history
    this.errorHistory.push(handler);
    if (this.errorHistory.length > 100) {
      this.errorHistory = this.errorHistory.slice(-100);
    }

    // Try to recover
    await this.attemptRecovery(error);

    return handler;
  }

  /**
   * Attempt recovery using registered strategies
   */
  private async attemptRecovery(error: Error): Promise<void> {
    for (const strategy of this.strategies) {
      if (strategy.canHandle(error)) {
        try {
          await strategy.recover(error);
          this.logger.info("ErrorRecovery", `Successfully recovered using strategy: ${strategy.name}`);
          return;
        } catch (recoveryError) {
          this.logger.warn(
            "ErrorRecovery",
            `Recovery strategy ${strategy.name} failed`,
            recoveryError as Error
          );
        }
      }
    }
  }

  /**
   * Get user-friendly message
   */
  private getDefaultUserMessage(error: Error): string {
    if (error.message.includes("rate limit")) {
      return "Demasiadas operaciones. Por favor espera un momento.";
    }
    if (error.message.includes("network") || error.message.includes("fetch")) {
      return "Error de conexión. Verifica tu internet.";
    }
    if (error.message.includes("unauthorized") || error.message.includes("403")) {
      return "No tienes permisos para hacer esto.";
    }
    if (error.message.includes("404") || error.message.includes("not found")) {
      return "El recurso no fue encontrado.";
    }
    return "Algo salió mal. Por favor intenta nuevamente.";
  }

  /**
   * Determine error severity
   */
  private determineSeverity(error: Error): "low" | "medium" | "high" | "critical" {
    if (error.message.includes("critical")) return "critical";
    if (error.message.includes("fatal")) return "high";
    if (error.message.includes("error")) return "medium";
    return "low";
  }

  /**
   * Get error history
   */
  getErrorHistory(context?: string): ErrorHandler[] {
    if (context) {
      return this.errorHistory.filter((h) => h.context === context);
    }
    return [...this.errorHistory];
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Generate error report
   */
  generateErrorReport(): string {
    const grouped = new Map<string, ErrorHandler[]>();

    for (const error of this.errorHistory) {
      if (!grouped.has(error.context)) {
        grouped.set(error.context, []);
      }
      grouped.get(error.context)!.push(error);
    }

    let report = `# Error Report - ${new Date().toISOString()}\n\n`;
    report += `Total Errors: ${this.errorHistory.length}\n\n`;

    for (const [context, errors] of grouped) {
      report += `## ${context}\n`;
      report += `- Count: ${errors.length}\n`;
      report += `- Severity Levels: ${new Set(errors.map((e) => e.severity)).size}\n`;
      report += `- Recent: ${errors[errors.length - 1]?.timestamp.toISOString()}\n\n`;
    }

    return report;
  }

  /**
   * Private getter for config
   */
  private get config() {
    return this.configManager.getConfig();
  }

  /**
   * Register default strategies
   */
  private registerDefaultStrategies(): void {
    // Network error recovery
    this.registerStrategy({
      name: "NetworkRetry",
      canHandle: (error) => error.message.includes("network") || error.message.includes("fetch"),
      recover: async () => {
        this.logger.info("Recovery", "Attempting network recovery");
        // Wait a bit and let the app retry
        await new Promise((resolve) => setTimeout(resolve, 1000));
      },
      retry: true,
      maxRetries: 3,
    });

    // Rate limit recovery
    this.registerStrategy({
      name: "RateLimitBackoff",
      canHandle: (error) => error.message.includes("rate limit") || error.message.includes("429"),
      recover: async () => {
        this.logger.info("Recovery", "Rate limit detected, backing off");
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 5000));
      },
      retry: true,
      maxRetries: 1,
    });

    // Authentication recovery
    this.registerStrategy({
      name: "AuthRefresh",
      canHandle: (error) => error.message.includes("unauthorized") || error.message.includes("401"),
      recover: async () => {
        this.logger.info("Recovery", "Authentication failed, redirecting to login");
        window.location.href = "/auth/login";
      },
    });
  }
}

/**
 * Global error handler instance
 */
let globalErrorHandler: EnterpriseErrorHandler;

export function getErrorHandler(): EnterpriseErrorHandler {
  if (!globalErrorHandler) {
    globalErrorHandler = new EnterpriseErrorHandler();
  }
  return globalErrorHandler;
}

/**
 * React Hook for error handling
 */
import { useCallback } from "react";

export function useErrorHandler(context: string) {
  const handler = getErrorHandler();

  const handleError = useCallback(
    async (error: Error, userMessage?: string) => {
      return handler.handleError(error, context, userMessage);
    },
    [context, handler]
  );

  const getHistory = useCallback(() => {
    return handler.getErrorHistory(context);
  }, [context, handler]);

  return {
    handleError,
    getHistory,
    clearHistory: () => handler.clearErrorHistory(),
  };
}
