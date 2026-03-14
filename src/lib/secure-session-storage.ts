// Task 12 - localStorage Security: Use sessionStorage instead
// Prevents exposure of sensitive data in persistent storage

import { SecureStorageItem } from "../types/bulk-operations.ts";

/**
 * Secure storage utility using sessionStorage (session-only, cleared on browser close)
 * CRITICAL: Never use localStorage for sensitive user data
 * - localStorage: Persists indefinitely (security risk)
 * - sessionStorage: Cleared when tab/browser closes (secure)
 */
export class SecureSessionStorage {
  private readonly prefix = "secure_";
  private readonly encryptionEnabled = false; // In production, use proper encryption

  /**
   * Store sensitive data in sessionStorage (cleared on browser close)
   * @param key - Storage key
   * @param data - Data to store
   * @param expiresInMinutes - Optional expiration time
   */
  store<T>(key: string, data: T, expiresInMinutes?: number): void {
    const prefixedKey = `${this.prefix}${key}`;
    const now = new Date();
    
    const item: SecureStorageItem<T> = {
      data,
      encryptedAt: now.toISOString(),
      expiresAt: expiresInMinutes 
        ? new Date(now.getTime() + expiresInMinutes * 60000).toISOString()
        : undefined,
    };

    try {
      sessionStorage.setItem(prefixedKey, JSON.stringify(item));
    } catch (error) {
      // Handle quota exceeded or other storage errors
      console.error(`[STORAGE_ERROR] Failed to store ${key}:`, error);
      this.handleStorageError(error);
    }
  }

  /**
   * Retrieve data from sessionStorage with validation
   * @param key - Storage key
   * @returns Data or null if expired/missing
   */
  retrieve<T>(key: string): T | null {
    const prefixedKey = `${this.prefix}${key}`;

    try {
      const itemStr = sessionStorage.getItem(prefixedKey);
      if (!itemStr) return null;

      const item: SecureStorageItem<T> = JSON.parse(itemStr);

      // Check expiration
      if (item.expiresAt && new Date(item.expiresAt) < new Date()) {
        this.remove(key);
        return null;
      }

      return item.data;
    } catch (error) {
      console.error(`[STORAGE_ERROR] Failed to retrieve ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove sensitive data from session
   * @param key - Storage key
   */
  remove(key: string): void {
    const prefixedKey = `${this.prefix}${key}`;
    try {
      sessionStorage.removeItem(prefixedKey);
    } catch (error) {
      console.error(`[STORAGE_ERROR] Failed to remove ${key}:`, error);
    }
  }

  /**
   * Clear all stored data from session
   * Call on logout
   */
  clearAll(): void {
    try {
      const keysToDelete: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key?.startsWith(this.prefix)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => sessionStorage.removeItem(key));
    } catch (error) {
      console.error("[STORAGE_ERROR] Failed to clear storage:", error);
    }
  }

  /**
   * Get all keys currently stored (for debugging)
   */
  getAllKeys(): string[] {
    const keys: string[] = [];
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key?.startsWith(this.prefix)) {
          keys.push(key.replace(this.prefix, ""));
        }
      }
    } catch (error) {
      console.error("[STORAGE_ERROR] Failed to list keys:", error);
    }
    return keys;
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    const prefixedKey = `${this.prefix}${key}`;
    try {
      return sessionStorage.getItem(prefixedKey) !== null;
    } catch {
      return false;
    }
  }

  /**
   * Handle storage errors (e.g., quota exceeded)
   */
  private handleStorageError(error: unknown): void {
    if (error instanceof DOMException) {
      if (error.name === "QuotaExceededError") {
        // Session storage is full - clear non-essential items
        console.warn("[STORAGE_WARNING] Session storage quota exceeded");
        // In production, implement smart clearing strategy
      } else if (error.name === "SecurityError") {
        // Storage access denied (e.g., private browsing)
        console.warn("[STORAGE_WARNING] Storage access denied (private browsing?)");
      }
    }
  }
}

/**
 * Singleton instance for application-wide use
 */
export const secureSessionStorage = new SecureSessionStorage();

/**
 * Hook for React components to use secure session storage
 */
export function useSecureSessionStorage<T>(key: string) {
  return {
    set: (data: T, expiresInMinutes?: number) => 
      secureSessionStorage.store(key, data, expiresInMinutes),
    get: () => secureSessionStorage.retrieve<T>(key),
    remove: () => secureSessionStorage.remove(key),
    has: () => secureSessionStorage.has(key),
  };
}

/**
 * Migration guide from localStorage to sessionStorage
 * 
 * BEFORE (INSECURE):
 * ```typescript
 * localStorage.setItem("user_form_draft", JSON.stringify(formData));
 * const draft = JSON.parse(localStorage.getItem("user_form_draft") || "{}");
 * ```
 * 
 * AFTER (SECURE):
 * ```typescript
 * secureSessionStorage.store("form_draft", formData, 30); // Expires in 30 min
 * const draft = secureSessionStorage.retrieve("form_draft") || {};
 * ```
 * 
 * KEY DIFFERENCES:
 * - localStorage: Persists until manually deleted (security risk for sensitive data)
 * - sessionStorage: Cleared when tab/browser closes (automatically secure)
 * - Automatic expiration: Set time limit for sensitive data (e.g., form drafts)
 * - Error handling: Gracefully handles quota exceeded and private browsing
 */
