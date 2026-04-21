/**
 * Enterprise Dashboard Hook
 * Integra seguridad, performance, accesibilidad y logging
 */

import { useEffect, useRef, useState, useCallback } from "react";
import {
  DashboardSecurityManager,
  SecurityAlert,
  SecurityPolicy,
  ValidationResult,
} from "@/lib/dashboard/securityManager";
import { useDashboardPerformance, PerformanceMetrics } from "@/lib/dashboard/performanceOptimization";
import {
  KeyboardNavigationManager,
  A11yAnnouncer,
  FocusManager,
  ContrastModeDetector,
} from "@/lib/dashboard/accessibilityManager";
import { EnterpriseLogger, getLogger } from "@/lib/dashboard/enterpriseLogger";
import { useToast } from "@/hooks/use-toast";

export interface UseEnterpriseDashboardOptions {
  securityPolicy?: Partial<SecurityPolicy>;
  enablePerformanceMonitoring?: boolean;
  enableAccessibility?: boolean;
  enableLogging?: boolean;
  onSecurityAlert?: (alert: SecurityAlert) => void;
}

export function useEnterpriseDashboard(options: UseEnterpriseDashboardOptions = {}) {
  const {
    securityPolicy,
    enablePerformanceMonitoring = true,
    enableAccessibility = true,
    enableLogging = true,
    onSecurityAlert,
  } = options;

  const { toast } = useToast();

  // Initialize services
  const securityManagerRef = useRef<DashboardSecurityManager>(
    new DashboardSecurityManager(securityPolicy)
  );
  const keyboardNavRef = useRef<KeyboardNavigationManager>(new KeyboardNavigationManager());
  const a11yAnnouncerRef = useRef<A11yAnnouncer>(new A11yAnnouncer());
  const focusManagerRef = useRef<FocusManager>(new FocusManager());
  const loggerRef = useRef<EnterpriseLogger>(
    getLogger({
      enableConsole: process.env.NODE_ENV === "development",
      enableStorage: true,
    })
  );

  // Performance monitoring
  const metrics = useDashboardPerformance(enablePerformanceMonitoring);

  // State
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [userPreferences, setUserPreferences] = useState(ContrastModeDetector.getPreferences());

  // Initialize services
  useEffect(() => {
    if (!enableAccessibility) return;

    // Detect preference changes
    const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const contrastQuery = window.matchMedia("(prefers-contrast: more)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const handleChange = () => {
      setUserPreferences(ContrastModeDetector.getPreferences());
      a11yAnnouncerRef.current.announce("Display preferences have changed");
    };

    darkModeQuery.addListener(handleChange);
    contrastQuery.addListener(handleChange);
    motionQuery.addListener(handleChange);

    return () => {
      darkModeQuery.removeListener(handleChange);
      contrastQuery.removeListener(handleChange);
      motionQuery.removeListener(handleChange);
    };
  }, [enableAccessibility]);

  // Setup keyboard shortcuts
  useEffect(() => {
    if (!enableAccessibility) return;

    const unsubscribe = keyboardNavRef.current.onShortcut((shortcut) => {
      loggerRef.current.debug("Keyboard", `Shortcut triggered: ${shortcut.action}`, { shortcut });
      a11yAnnouncerRef.current.announce(`${shortcut.description}`);
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      keyboardNavRef.current.handleKeyDown(e);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      unsubscribe();
    };
  }, [enableAccessibility]);

  // Security validation
  const validateWidget = useCallback(
    (data: any, type: string) => {
      if (enableLogging) {
        loggerRef.current.debug("Security", "Validating widget", { type });
      }

      const typeValidation = securityManagerRef.current.validateWidgetType(type);
      if (!typeValidation.valid) {
        const alert: SecurityAlert = {
          type: "invalid_operation",
          message: typeValidation.errors[0]?.message || "Invalid widget type",
          timestamp: new Date(),
        };
        setSecurityAlerts((prev) => [...prev, alert]);
        onSecurityAlert?.(alert);
        toast({
          title: "Validación fallida",
          description: alert.message,
          variant: "destructive",
        });
        return false;
      }

      const dataValidation = securityManagerRef.current.validateWidgetData(data);
      if (!dataValidation.valid) {
        dataValidation.errors.forEach((error) => {
          const alert: SecurityAlert = {
            type: "invalid_operation",
            message: error.message,
            timestamp: new Date(),
          };
          setSecurityAlerts((prev) => [...prev, alert]);
          onSecurityAlert?.(alert);
        });

        if (enableLogging) {
          loggerRef.current.error("Security", "Widget validation failed", {
            errors: dataValidation.errors,
          });
        }

        return false;
      }

      // Log warnings
      dataValidation.warnings.forEach((warning) => {
        if (enableLogging) {
          loggerRef.current.warn("Security", warning.message, { warning });
        }
        a11yAnnouncerRef.current.announce(warning.message);
      });

      return true;
    },
    [enableLogging, onSecurityAlert, toast]
  );

  // Check rate limits
  const checkRateLimit = useCallback(
    (userId: string) => {
      const result = securityManagerRef.current.checkRateLimit(userId);
      if (!result.valid) {
        result.errors.forEach((error) => {
          const alert: SecurityAlert = {
            type: "rate_limit",
            message: error.message,
            timestamp: new Date(),
          };
          setSecurityAlerts((prev) => [...prev, alert]);
          onSecurityAlert?.(alert);
          toast({
            title: "Límite de operaciones",
            description: error.message,
            variant: "destructive",
          });
        });
        return false;
      }
      return true;
    },
    [onSecurityAlert, toast]
  );

  // Log audit entry
  const logAudit = useCallback(
    (action: string, resourceId: string, resourceType: "widget" | "dashboard") => {
      if (!enableLogging) return;

      securityManagerRef.current.logAudit({
        userId: "current_user", // Should come from context
        action: action as any,
        resourceId,
        resourceType,
        success: true,
      });

      loggerRef.current.info("Audit", `${action} completed`, {
        resourceId,
        resourceType,
      });
    },
    [enableLogging]
  );

  // Trap focus in modals
  const trapFocus = useCallback((container: HTMLElement) => {
    if (!enableAccessibility) return () => {};
    return focusManagerRef.current.trap(container);
  }, [enableAccessibility]);

  // Announce to screen readers
  const announce = useCallback((message: string) => {
    if (enableAccessibility) {
      a11yAnnouncerRef.current.announce(message);
    }
  }, [enableAccessibility]);

  // Generate reports
  const generateSecurityReport = useCallback(() => {
    return securityManagerRef.current.generateSecurityReport();
  }, []);

  const generateAuditLog = useCallback((userId?: string) => {
    return securityManagerRef.current.getAuditLog(userId);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      a11yAnnouncerRef.current.destroy();
    };
  }, []);

  return {
    // Services
    securityManager: securityManagerRef.current,
    keyboardNav: keyboardNavRef.current,
    logger: loggerRef.current,

    // Methods
    validateWidget,
    checkRateLimit,
    logAudit,
    trapFocus,
    announce,
    generateSecurityReport,
    generateAuditLog,

    // State
    metrics,
    securityAlerts,
    userPreferences,
  };
}
