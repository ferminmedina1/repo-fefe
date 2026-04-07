// Task 17 - Unsaved Changes: Add confirmation dialogs and tracking
// Prevents accidental loss of user data when navigating away

import { UnsavedChanges } from "../types/bulk-operations.ts";

/**
 * Tracks unsaved changes to prevent data loss
 */
export class UnsavedChangesTracker {
  private changes: Map<string, UnsavedChanges> = new Map();
  private listeners: Set<(key: string, isDirty: boolean) => void> = new Set();

  /**
   * Start tracking changes for a form/entity
   */
  startTracking(key: string, initialData: Record<string, unknown> = {}): void {
    this.changes.set(key, {
      key,
      changes: initialData,
      timestamps: {
        createdAt: new Date().toISOString(),
        lastModifiedAt: new Date().toISOString(),
      },
      isDirty: false,
    });
  }

  /**
   * Record a change
   */
  recordChange(key: string, fieldName: string, value: unknown): void {
    const tracked = this.changes.get(key);
    if (!tracked) {
      this.startTracking(key);
    }

    const updatedTracked = this.changes.get(key)!;
    updatedTracked.changes[fieldName] = value;
    updatedTracked.isDirty = true;
    updatedTracked.timestamps.lastModifiedAt = new Date().toISOString();

    this.notifyListeners(key, true);
  }

  /**
   * Record multiple changes at once
   */
  recordBatchChanges(
    key: string,
    changes: Record<string, unknown>
  ): void {
    const tracked = this.changes.get(key);
    if (!tracked) {
      this.startTracking(key);
    }

    const updatedTracked = this.changes.get(key)!;
    Object.assign(updatedTracked.changes, changes);
    updatedTracked.isDirty = true;
    updatedTracked.timestamps.lastModifiedAt = new Date().toISOString();

    this.notifyListeners(key, true);
  }

  /**
   * Check if there are unsaved changes
   */
  isDirty(key: string): boolean {
    return this.changes.get(key)?.isDirty ?? false;
  }

  /**
   * Check if ANY tracked item has unsaved changes
   */
  hasAnyChanges(): boolean {
    return Array.from(this.changes.values()).some(t => t.isDirty);
  }

  /**
   * Get all unsaved changes for an entity
   */
  getChanges(key: string): Record<string, unknown> | null {
    const tracked = this.changes.get(key);
    return tracked?.isDirty ? tracked.changes : null;
  }

  /**
   * Get tracking info for debugging
   */
  getTrackingInfo(key: string): UnsavedChanges | null {
    return this.changes.get(key) ?? null;
  }

  /**
   * Mark as saved (clear dirty flag)
   */
  markAsSaved(key: string): void {
    const tracked = this.changes.get(key);
    if (tracked) {
      tracked.isDirty = false;
      tracked.timestamps.lastModifiedAt = new Date().toISOString();
      this.notifyListeners(key, false);
    }
  }

  /**
   * Clear tracking for entity
   */
  clear(key: string): void {
    this.changes.delete(key);
    this.notifyListeners(key, false);
  }

  /**
   * Clear all tracking
   */
  clearAll(): void {
    this.changes.clear();
  }

  /**
   * Subscribe to changes
   */
  subscribe(
    callback: (key: string, isDirty: boolean) => void
  ): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify listeners of changes
   */
  private notifyListeners(key: string, isDirty: boolean): void {
    this.listeners.forEach(listener => listener(key, isDirty));
  }
}

/**
 * Singleton instance
 */
export const unsavedChangesTracker = new UnsavedChangesTracker();

/**
 * Browser beforeunload handler for unsaved changes warning
 */
export function setupBeforeUnloadHandler(): () => void {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (unsavedChangesTracker.hasAnyChanges()) {
      e.preventDefault();
      e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
      return e.returnValue;
    }
  };

  window.addEventListener("beforeunload", handleBeforeUnload);

  // Return cleanup function
  return () => {
    window.removeEventListener("beforeunload", handleBeforeUnload);
  };
}

/**
 * Confirmation dialog for unsaved changes
 */
export function showUnsavedChangesDialog(
  onDiscard: () => void,
  onCancel: () => void
): void {
  if (typeof window === "undefined") return;

  const message =
    "You have unsaved changes. Would you like to save them before leaving?";

  const response = window.confirm(
    `${message}\n\nClick OK to go back and save, or Cancel to discard changes.`
  );

  if (response) {
    onCancel();
  } else {
    onDiscard();
  }
}

/**
 * React hook for tracking unsaved changes
 */
export function useUnsavedChanges(formKey: string) {
  const [isDirty, setIsDirty] = React.useState(false);

  React.useEffect(() => {
    // Setup tracking for this form
    unsavedChangesTracker.startTracking(formKey);

    // Subscribe to changes
    const unsubscribe = unsavedChangesTracker.subscribe((key, dirty) => {
      if (key === formKey) {
        setIsDirty(dirty);
      }
    });

    // Setup browser warning
    const cleanupBeforeUnload = setupBeforeUnloadHandler();

    return () => {
      unsubscribe();
      cleanupBeforeUnload();
      unsavedChangesTracker.clear(formKey);
    };
  }, [formKey]);

  return {
    isDirty,
    recordChange: (fieldName: string, value: unknown) =>
      unsavedChangesTracker.recordChange(formKey, fieldName, value),
    recordBatchChanges: (changes: Record<string, unknown>) =>
      unsavedChangesTracker.recordBatchChanges(formKey, changes),
    getChanges: () => unsavedChangesTracker.getChanges(formKey),
    markAsSaved: () => unsavedChangesTracker.markAsSaved(formKey),
  };
}

/**
 * React hook for form navigation with unsaved changes warning
 */
export function useFormNavigation(formKey: string) {
  const router = useRouter();
  const { isDirty, markAsSaved } = useUnsavedChanges(formKey);

  const navigateTo = (path: string) => {
    if (isDirty) {
      showUnsavedChangesDialog(
        () => {
          markAsSaved();
          router.push(path);
        },
        () => {
          // User chose to stay on page
        }
      );
    } else {
      router.push(path);
    }
  };

  return {
    isDirty,
    navigateTo,
    canNavigate: !isDirty,
  };
}

/**
 * Confirmation dialog for bulk operations with unsaved changes
 */
export function showBulkOperationWarning(
  itemCount: number,
  onConfirm: () => void,
  onCancel: () => void
): void {
  const hasUnsaved = unsavedChangesTracker.hasAnyChanges();

  let message = `This action will ${itemCount === 1 ? "modify" : `modify ${itemCount} items`}.`;

  if (hasUnsaved) {
    message += "\n\n⚠️ Warning: You also have unsaved changes in other forms.";
  }

  message += "\n\nAre you sure you want to continue?";

  if (window.confirm(message)) {
    onConfirm();
  } else {
    onCancel();
  }
}

/**
 * Auto-save mechanism for forms
 */
export class FormAutoSaver {
  private saveFunction: (data: Record<string, unknown>) => Promise<void>;
  private saveInterval: number;
  private intervalId?: NodeJS.Timeout;

  constructor(
    saveFunction: (data: Record<string, unknown>) => Promise<void>,
    saveIntervalMs: number = 30000 // Auto-save every 30 seconds
  ) {
    this.saveFunction = saveFunction;
    this.saveInterval = saveIntervalMs;
  }

  startAutoSave(formKey: string): void {
    this.intervalId = setInterval(() => {
      const changes = unsavedChangesTracker.getChanges(formKey);

      if (changes) {
        this.saveFunction(changes)
          .then(() => {
            unsavedChangesTracker.markAsSaved(formKey);
            console.log(`[AUTO_SAVE] Form ${formKey} saved successfully`);
          })
          .catch(error => {
            console.error(`[AUTO_SAVE_ERROR] Failed to save ${formKey}:`, error);
          });
      }
    }, this.saveInterval);
  }

  stopAutoSave(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }
}

// Import React hook types (would normally import from react)
declare namespace React {
  function useState<T>(initialState: T): [T, (value: T) => void];
  function useEffect(effect: () => () => void, deps: any[]): void;
}

// Import router types (would normally import from next/router)
declare function useRouter(): {
  push: (path: string) => void;
};
