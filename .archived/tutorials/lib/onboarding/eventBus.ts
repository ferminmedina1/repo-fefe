// ============================================================
// Internal Event Bus — decoupled pub/sub for onboarding events
// Singleton, type-safe, zero-dependency.
// ============================================================

type EventHandler = (payload?: unknown) => void;

class OnboardingEventBus {
  private listeners = new Map<string, Set<EventHandler>>();

  /** Subscribe to an event. Returns unsubscribe function. */
  on(event: string, handler: EventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  /** Emit an event to all subscribers */
  emit(event: string, payload?: unknown): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (e) {
        console.error(`[OnboardingEventBus] Error in handler for "${event}":`, e);
      }
    }
  }

  /** Remove all listeners for an event, or all if no event given */
  off(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

/** Singleton event bus instance */
export const onboardingEventBus = new OnboardingEventBus();
