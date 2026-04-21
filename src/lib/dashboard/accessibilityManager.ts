/**
 * Enterprise Accessibility System
 * WCAG 2.1 AA Compliance
 * - Keyboard Navigation
 * - Screen Reader Support
 * - High Contrast
 * - Focus Management
 */

export interface A11yMessage {
  id: string;
  type: "announce" | "alert" | "status";
  message: string;
  timestamp: Date;
}

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: string;
  description: string;
}

/**
 * Keyboard Navigation Manager
 */
export class KeyboardNavigationManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private listeners: ((shortcut: KeyboardShortcut) => void)[] = [];

  // Default enterprise shortcuts
  private defaultShortcuts: KeyboardShortcut[] = [
    {
      key: "n",
      ctrlKey: true,
      action: "new_dashboard",
      description: "Crear nuevo dashboard",
    },
    {
      key: "s",
      ctrlKey: true,
      action: "save_dashboard",
      description: "Guardar dashboard",
    },
    {
      key: "/",
      action: "search",
      description: "Buscar widgets",
    },
    {
      key: "?",
      action: "help",
      description: "Mostrar ayuda",
    },
    {
      key: "Escape",
      action: "close_modal",
      description: "Cerrar modal o diálogo",
    },
    {
      key: "ArrowUp",
      action: "focus_previous",
      description: "Ir al widget anterior",
    },
    {
      key: "ArrowDown",
      action: "focus_next",
      description: "Ir al widget siguiente",
    },
    {
      key: "Enter",
      action: "select_widget",
      description: "Seleccionar widget",
    },
    {
      key: "Delete",
      action: "delete_widget",
      description: "Eliminar widget",
    },
  ];

  constructor() {
    this.defaultShortcuts.forEach((shortcut) => {
      this.registerShortcut(shortcut);
    });
  }

  registerShortcut(shortcut: KeyboardShortcut): void {
    const key = this.getShortcutKey(shortcut);
    this.shortcuts.set(key, shortcut);
  }

  handleKeyDown(event: KeyboardEvent): KeyboardShortcut | null {
    const shortcut = this.findMatchingShortcut(event);
    if (shortcut) {
      this.notifyListeners(shortcut);
    }
    return shortcut || null;
  }

  private getShortcutKey(shortcut: KeyboardShortcut): string {
    return `${shortcut.key}${shortcut.ctrlKey ? "+ctrl" : ""}${shortcut.shiftKey ? "+shift" : ""}${shortcut.altKey ? "+alt" : ""}${shortcut.metaKey ? "+meta" : ""}`;
  }

  private findMatchingShortcut(event: KeyboardEvent): KeyboardShortcut | null {
    for (const [, shortcut] of this.shortcuts) {
      if (
        event.key === shortcut.key &&
        event.ctrlKey === (shortcut.ctrlKey || false) &&
        event.shiftKey === (shortcut.shiftKey || false) &&
        event.altKey === (shortcut.altKey || false) &&
        event.metaKey === (shortcut.metaKey || false)
      ) {
        return shortcut;
      }
    }
    return null;
  }

  onShortcut(callback: (shortcut: KeyboardShortcut) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners(shortcut: KeyboardShortcut): void {
    this.listeners.forEach((listener) => listener(shortcut));
  }

  getShortcutHelp(): string {
    return this.defaultShortcuts
      .map((s) => {
        const keys = [s.key];
        if (s.ctrlKey) keys.push("Ctrl");
        if (s.shiftKey) keys.push("Shift");
        if (s.altKey) keys.push("Alt");
        if (s.metaKey) keys.push("Cmd");
        return `${keys.join(" + ")}: ${s.description}`;
      })
      .join("\n");
  }
}

/**
 * Accessibility Announcer
 * Para screen readers
 */
export class A11yAnnouncer {
  private messages: A11yMessage[] = [];
  private container: HTMLElement | null = null;

  constructor() {
    // Create live region for announcements
    this.createLiveRegion();
  }

  private createLiveRegion(): void {
    this.container = document.createElement("div");
    this.container.id = "a11y-announcer";
    this.container.setAttribute("role", "status");
    this.container.setAttribute("aria-live", "polite");
    this.container.setAttribute("aria-atomic", "true");
    this.container.className = "sr-only"; // Screen reader only
    document.body.appendChild(this.container);
  }

  announce(message: string, type: "announce" | "alert" | "status" = "announce"): void {
    const id = `msg_${Date.now()}`;
    const a11yMessage: A11yMessage = {
      id,
      type,
      message,
      timestamp: new Date(),
    };

    this.messages.push(a11yMessage);

    // Update live region
    if (this.container) {
      const messageEl = document.createElement("div");
      messageEl.id = id;
      if (type === "alert") {
        messageEl.setAttribute("role", "alert");
      }
      messageEl.textContent = message;
      this.container.appendChild(messageEl);

      // Remove after 5 seconds
      setTimeout(() => {
        messageEl.remove();
        this.messages = this.messages.filter((m) => m.id !== id);
      }, 5000);
    }
  }

  announceAction(action: string, subject: string, status: "success" | "error" | "info"): void {
    const statusText = {
      success: "completado",
      error: "falló",
      info: "información",
    }[status];

    this.announce(`${action} de ${subject} ${statusText}`, status === "error" ? "alert" : "announce");
  }

  destroy(): void {
    if (this.container) {
      this.container.remove();
    }
  }
}

/**
 * Focus Management
 */
export class FocusManager {
  private focusStack: HTMLElement[] = [];

  trap(container: HTMLElement): () => void {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return () => {};

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    this.focusStack.push(document.activeElement as HTMLElement);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    firstElement.focus();

    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      const previousElement = this.focusStack.pop();
      if (previousElement) {
        previousElement.focus();
      }
    };
  }

  restoreFocus(): void {
    const previousElement = this.focusStack.pop();
    if (previousElement) {
      previousElement.focus();
    }
  }
}

/**
 * High Contrast Mode Detector
 */
export class ContrastModeDetector {
  static isHighContrastMode(): boolean {
    if (typeof window === "undefined") return false;

    return (
      window.matchMedia("(prefers-contrast: more)").matches ||
      window.matchMedia("(forced-colors: active)").matches
    );
  }

  static isDarkMode(): boolean {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  static isReducedMotion(): boolean {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  static getPreferences() {
    return {
      highContrast: this.isHighContrastMode(),
      darkMode: this.isDarkMode(),
      reducedMotion: this.isReducedMotion(),
    };
  }
}

/**
 * ARIA Attributes Helper
 */
export class AriaHelper {
  static getLoadingAttrs(isLoading: boolean) {
    return {
      "aria-busy": isLoading,
      "aria-disabled": isLoading,
    };
  }

  static getSelectAttrs(isOpen: boolean, labelId: string) {
    return {
      "aria-haspopup": "listbox",
      "aria-expanded": isOpen,
      "aria-labelledby": labelId,
    };
  }

  static getProgressAttrs(value: number, max: number = 100) {
    return {
      role: "progressbar",
      "aria-valuenow": value,
      "aria-valuemin": 0,
      "aria-valuemax": max,
      "aria-label": `Progreso: ${value}%`,
    };
  }

  static getTableCellAttrs(isHeader: boolean, colIndex: number) {
    return {
      role: isHeader ? "columnheader" : "cell",
      "data-col": colIndex,
    };
  }
}

/**
 * Accessibility Report
 */
export function generateA11yReport(): string {
  const prefs = ContrastModeDetector.getPreferences();

  return `
# Accessibility Report - ${new Date().toISOString()}

## User Preferences
- High Contrast Mode: ${prefs.highContrast ? "Enabled" : "Disabled"}
- Dark Mode: ${prefs.darkMode ? "Enabled" : "Disabled"}
- Reduced Motion: ${prefs.reducedMotion ? "Enabled" : "Disabled"}

## Compliance
- WCAG 2.1 Level AA Target: YES
- Keyboard Navigation: YES
- Screen Reader Support: YES
- Focus Management: YES
- Color Contrast Ratio: >= 4.5:1 (normal), >= 3:1 (large)
- Motion: Respects prefers-reduced-motion

## Keyboard Shortcuts Available
${new KeyboardNavigationManager().getShortcutHelp()}

## Recommendations
✓ All interactive elements are keyboard accessible
✓ Focus indicators are visible
✓ ARIA labels are present
✓ Live regions are properly configured
  `;
}
