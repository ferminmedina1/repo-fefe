/**
 * Enterprise Logging & Monitoring System
 * Logging levels, structured logging, error tracking
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  data?: Record<string, any>;
  stack?: string;
  userId?: string;
  sessionId?: string;
  duration?: number; // for performance logs
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  maxLogSize: number;
  onError?: (entry: LogEntry) => void;
}

/**
 * Enterprise Logger
 */
export class EnterpriseLogger {
  private logs: LogEntry[] = [];
  private config: LoggerConfig;
  private sessionId: string;
  private performanceMetrics: Map<string, number> = new Map();

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: process.env.NODE_ENV === "development",
      enableStorage: true,
      maxLogSize: 1000,
      ...config,
    };

    this.sessionId = this.generateSessionId();
    this.loadFromStorage();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private createLogEntry(
    level: LogLevel,
    category: string,
    message: string,
    data?: Record<string, any>,
    stack?: string
  ): LogEntry {
    return {
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      stack,
      sessionId: this.sessionId,
    };
  }

  private writeLog(entry: LogEntry): void {
    this.logs.push(entry);

    // Trim logs if exceeding max size
    if (this.logs.length > this.config.maxLogSize) {
      this.logs = this.logs.slice(-this.config.maxLogSize);
    }

    // Console output
    if (this.config.enableConsole) {
      const logFn = {
        [LogLevel.DEBUG]: console.debug,
        [LogLevel.INFO]: console.info,
        [LogLevel.WARN]: console.warn,
        [LogLevel.ERROR]: console.error,
        [LogLevel.FATAL]: console.error,
      }[entry.level];

      const prefix = `[${entry.timestamp.toISOString()}] [${LogLevel[entry.level]}] [${entry.category}]`;
      logFn(`${prefix} ${entry.message}`, entry.data || "");
    }

    // Local storage
    if (this.config.enableStorage) {
      this.saveToStorage();
    }

    // Error callback
    if (entry.level >= LogLevel.ERROR && this.config.onError) {
      this.config.onError(entry);
    }
  }

  debug(category: string, message: string, data?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.writeLog(this.createLogEntry(LogLevel.DEBUG, category, message, data));
    }
  }

  info(category: string, message: string, data?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.writeLog(this.createLogEntry(LogLevel.INFO, category, message, data));
    }
  }

  warn(category: string, message: string, data?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.writeLog(this.createLogEntry(LogLevel.WARN, category, message, data));
    }
  }

  error(category: string, message: string, error?: Error | Record<string, any>): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const entry = this.createLogEntry(
        LogLevel.ERROR,
        category,
        message,
        error instanceof Error ? { message: error.message } : error,
        error instanceof Error ? error.stack : undefined
      );
      this.writeLog(entry);
    }
  }

  fatal(category: string, message: string, error?: Error): void {
    const entry = this.createLogEntry(
      LogLevel.FATAL,
      category,
      message,
      error ? { message: error.message } : undefined,
      error ? error.stack : undefined
    );
    this.writeLog(entry);
  }

  /**
   * Performance tracking
   */
  startPerformance(label: string): () => number {
    const start = performance.now();
    this.performanceMetrics.set(label, start);

    return () => {
      const end = performance.now();
      const duration = end - start;
      this.performanceMetrics.delete(label);
      this.info("Performance", `${label} took ${duration.toFixed(2)}ms`, { duration });
      return duration;
    };
  }

  /**
   * Get all logs
   */
  getLogs(filter?: { category?: string; level?: LogLevel; hours?: number }): LogEntry[] {
    let filtered = [...this.logs];

    if (filter?.category) {
      filtered = filtered.filter((l) => l.category === filter.category);
    }

    if (filter?.level !== undefined) {
      filtered = filtered.filter((l) => l.level >= filter.level);
    }

    if (filter?.hours) {
      const cutoff = new Date(Date.now() - filter.hours * 3600000);
      filtered = filtered.filter((l) => l.timestamp > cutoff);
    }

    return filtered;
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = [];
    this.saveToStorage();
  }

  /**
   * Generate report
   */
  generateReport(hours: number = 24): string {
    const logs = this.getLogs({ hours });
    const errorLogs = logs.filter((l) => l.level >= LogLevel.ERROR);
    const categories = new Set(logs.map((l) => l.category));

    const logsByLevel = {
      debug: logs.filter((l) => l.level === LogLevel.DEBUG).length,
      info: logs.filter((l) => l.level === LogLevel.INFO).length,
      warn: logs.filter((l) => l.level === LogLevel.WARN).length,
      error: logs.filter((l) => l.level === LogLevel.ERROR).length,
      fatal: logs.filter((l) => l.level === LogLevel.FATAL).length,
    };

    return `
# Logging Report - Last ${hours} hours

## Summary
- Session ID: ${this.sessionId}
- Total Logs: ${logs.length}
- Errors: ${errorLogs.length}
- Categories: ${Array.from(categories).join(", ")}

## Log Levels
- Debug: ${logsByLevel.debug}
- Info: ${logsByLevel.info}
- Warn: ${logsByLevel.warn}
- Error: ${logsByLevel.error}
- Fatal: ${logsByLevel.fatal}

## Recent Errors
${errorLogs
  .slice(-5)
  .reverse()
  .map((l) => `- [${l.timestamp.toISOString()}] ${l.message}`)
  .join("\n")}

## Performance Metrics
${Array.from(this.performanceMetrics.entries())
  .map(([label, start]) => {
    const duration = performance.now() - start;
    return `- ${label}: ${duration.toFixed(2)}ms`;
  })
  .join("\n") || "No active metrics"}
    `;
  }

  /**
   * Storage management
   */
  private saveToStorage(): void {
    try {
      if (!typeof localStorage) return;
      const serialized = JSON.stringify(
        this.logs.map((log) => ({
          ...log,
          timestamp: log.timestamp.toISOString(),
        }))
      );
      localStorage.setItem(`dashboard_logs_${this.sessionId}`, serialized);
    } catch (error) {
      console.warn("Failed to save logs to storage", error);
    }
  }

  private loadFromStorage(): void {
    try {
      if (!typeof localStorage) return;
      const stored = localStorage.getItem(`dashboard_logs_${this.sessionId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.logs = parsed.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp),
        }));
      }
    } catch (error) {
      console.warn("Failed to load logs from storage", error);
    }
  }

  /**
   * Export logs
   */
  exportLogs(format: "json" | "csv" = "json"): string {
    if (format === "json") {
      return JSON.stringify(this.logs, null, 2);
    }

    // CSV format
    const headers = ["Timestamp", "Level", "Category", "Message"];
    const rows = this.logs.map((log) => [
      log.timestamp.toISOString(),
      LogLevel[log.level],
      log.category,
      log.message,
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    return csv;
  }
}

/**
 * Global logger instance
 */
let globalLogger: EnterpriseLogger;

export function getLogger(config?: Partial<LoggerConfig>): EnterpriseLogger {
  if (!globalLogger) {
    globalLogger = new EnterpriseLogger(config);
  }
  return globalLogger;
}
