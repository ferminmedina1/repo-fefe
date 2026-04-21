/**
 * Enterprise Configuration System
 * Manejo centralizado de configuraciones
 */

export interface DashboardConfig {
  // Security
  security: {
    maxWidgetsPerDashboard: number;
    maxDashboardsPerUser: number;
    maxDataSizePerWidget: number; // in MB
    rateLimitOperationsPerMinute: number;
    requireAuditLog: boolean;
  };

  // Performance
  performance: {
    enableMemoization: boolean;
    enableVirtualization: boolean;
    virtualizationOverscan: number;
    debounceDelay: number; // ms
    throttleDelay: number; // ms
    lazyLoadThreshold: number; // 0-1
  };

  // Accessibility
  accessibility: {
    enableKeyboardNavigation: boolean;
    enableScreenReader: boolean;
    enableHighContrast: boolean;
    enableReducedMotion: boolean;
  };

  // Logging
  logging: {
    enableConsole: boolean;
    enableStorage: boolean;
    maxLogSize: number;
    logLevel: "debug" | "info" | "warn" | "error";
  };

  // UI/UX
  ui: {
    theme: "light" | "dark" | "auto";
    animationsEnabled: boolean;
    toastDuration: number; // ms
    dialogBackdropBlur: boolean;
  };

  // Features
  features: {
    dragDropEnabled: boolean;
    widgetHealthMonitoring: boolean;
    performanceReporting: boolean;
    securityAlerts: boolean;
  };
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: DashboardConfig = {
  security: {
    maxWidgetsPerDashboard: 50,
    maxDashboardsPerUser: 100,
    maxDataSizePerWidget: 10, // 10MB
    rateLimitOperationsPerMinute: 60,
    requireAuditLog: true,
  },

  performance: {
    enableMemoization: true,
    enableVirtualization: true,
    virtualizationOverscan: 3,
    debounceDelay: 300,
    throttleDelay: 100,
    lazyLoadThreshold: 0.1,
  },

  accessibility: {
    enableKeyboardNavigation: true,
    enableScreenReader: true,
    enableHighContrast: true,
    enableReducedMotion: true,
  },

  logging: {
    enableConsole: process.env.NODE_ENV === "development",
    enableStorage: true,
    maxLogSize: 1000,
    logLevel: process.env.NODE_ENV === "development" ? "debug" : "info",
  },

  ui: {
    theme: "auto",
    animationsEnabled: true,
    toastDuration: 3000,
    dialogBackdropBlur: true,
  },

  features: {
    dragDropEnabled: true,
    widgetHealthMonitoring: true,
    performanceReporting: true,
    securityAlerts: true,
  },
};

/**
 * Configuration Manager
 */
class ConfigurationManager {
  private config: DashboardConfig;
  private listeners: ((config: DashboardConfig) => void)[] = [];

  constructor(initialConfig: Partial<DashboardConfig> = {}) {
    this.config = this.mergeConfig(DEFAULT_CONFIG, initialConfig);
    this.loadFromStorage();
  }

  /**
   * Get current configuration
   */
  getConfig(): DashboardConfig {
    return { ...this.config };
  }

  /**
   * Get specific config section
   */
  getSection<K extends keyof DashboardConfig>(section: K): DashboardConfig[K] {
    return { ...this.config[section] };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<DashboardConfig>): void {
    const oldConfig = { ...this.config };
    this.config = this.mergeConfig(this.config, updates);

    // Persist to storage
    this.saveToStorage();

    // Notify listeners
    this.notifyListeners();

    console.debug("Config updated", {
      old: oldConfig,
      new: this.config,
    });
  }

  /**
   * Update specific section
   */
  updateSection<K extends keyof DashboardConfig>(
    section: K,
    updates: Partial<DashboardConfig[K]>
  ): void {
    this.updateConfig({
      [section]: {
        ...this.config[section],
        ...updates,
      },
    } as Partial<DashboardConfig>);
  }

  /**
   * Reset to defaults
   */
  resetToDefaults(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Subscribe to config changes
   */
  onChange(callback: (config: DashboardConfig) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  /**
   * Get boolean config value
   */
  isFeatureEnabled(feature: keyof DashboardConfig["features"]): boolean {
    return this.config.features[feature];
  }

  /**
   * Export configuration
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration
   */
  importConfig(json: string): void {
    try {
      const imported = JSON.parse(json);
      this.updateConfig(imported);
    } catch (error) {
      console.error("Failed to import config", error);
      throw new Error("Invalid configuration JSON");
    }
  }

  /**
   * Private methods
   */

  private mergeConfig(
    base: DashboardConfig,
    updates: Partial<DashboardConfig>
  ): DashboardConfig {
    return {
      security: { ...base.security, ...updates.security },
      performance: { ...base.performance, ...updates.performance },
      accessibility: { ...base.accessibility, ...updates.accessibility },
      logging: { ...base.logging, ...updates.logging },
      ui: { ...base.ui, ...updates.ui },
      features: { ...base.features, ...updates.features },
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.getConfig()));
  }

  private saveToStorage(): void {
    try {
      if (typeof localStorage === "undefined") return;
      localStorage.setItem("dashboard_config", JSON.stringify(this.config));
    } catch (error) {
      console.warn("Failed to save config to storage", error);
    }
  }

  private loadFromStorage(): void {
    try {
      if (typeof localStorage === "undefined") return;
      const stored = localStorage.getItem("dashboard_config");
      if (stored) {
        const parsed = JSON.parse(stored);
        this.config = this.mergeConfig(this.config, parsed);
      }
    } catch (error) {
      console.warn("Failed to load config from storage", error);
    }
  }
}

/**
 * Global configuration instance
 */
let globalConfigManager: ConfigurationManager;

export function getConfigManager(
  initialConfig?: Partial<DashboardConfig>
): ConfigurationManager {
  if (!globalConfigManager) {
    globalConfigManager = new ConfigurationManager(initialConfig);
  }
  return globalConfigManager;
}

/**
 * React Hook for configuration
 */
import { useEffect, useState } from "react";

export function useConfig(): DashboardConfig {
  const configManager = getConfigManager();
  const [config, setConfig] = useState(configManager.getConfig());

  useEffect(() => {
    const unsubscribe = configManager.onChange(setConfig);
    return unsubscribe;
  }, [configManager]);

  return config;
}

/**
 * React Hook for specific section
 */
export function useConfigSection<K extends keyof DashboardConfig>(
  section: K
): DashboardConfig[K] {
  const config = useConfig();
  return config[section];
}
