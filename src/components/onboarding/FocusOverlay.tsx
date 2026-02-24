// ============================================================
// FocusOverlay — Reusable component that highlights a target
// element with a dark overlay around it.
// Used for onboarding step guidance and module tutorials.
//
// Features:
// - Viewport-clamped tooltips (never overflow screen)
// - Scroll target into view automatically
// - Smooth cutout transitions between steps
// - Keyboard: Escape to dismiss
// ============================================================

import { useEffect, useState, useCallback, useId, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FocusOverlayProps {
  /** CSS selector or ref callback to the target element */
  targetSelector?: string;
  /** Content to show next to the focused element */
  children?: ReactNode;
  /** Whether the overlay is visible */
  open: boolean;
  /** Called when user clicks the overlay (dismiss) */
  onClose?: () => void;
  /** Position of the tooltip relative to target */
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
  /** Extra CSS class for the tooltip container */
  className?: string;
  /** Called on ArrowRight / Enter */
  onNext?: () => void;
  /** Called on ArrowLeft */
  onPrev?: () => void;
  /** Accessible label for the dialog (defaults to 'Tutorial') */
  ariaLabel?: string;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;
const TOOLTIP_GAP = 14;
const VIEWPORT_MARGIN = 12; // min space from screen edges

export function FocusOverlay({
  targetSelector,
  children,
  open,
  onClose,
  tooltipPosition = 'bottom',
  className,
  onNext,
  onPrev,
  ariaLabel,
}: FocusOverlayProps) {
  const [rect, setRect] = useState<TargetRect | null>(null);
  const maskId = useId().replace(/:/g, '_');
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Track whether the target was expected but not found (vs. intentionally omitted)
  const [targetNotFound, setTargetNotFound] = useState(false);

  // Scroll target into view + measure
  const measure = useCallback(() => {
    if (!targetSelector || !open) {
      setRect(null);
      setTargetNotFound(false);
      return;
    }
    const el = document.querySelector(targetSelector);
    if (!el) {
      setRect(null);
      setTargetNotFound(true);
      return;
    }
    setTargetNotFound(false);

    // Check visibility: element must be inside the viewport AND inside its
    // nearest scroll parent's visible bounds (e.g. sidebar with overflow-y: auto).
    const r = el.getBoundingClientRect();

    const isVisibleInViewport =
      r.top >= 0 &&
      r.left >= 0 &&
      r.bottom <= window.innerHeight &&
      r.right <= window.innerWidth;

    // Also check if the element is clipped by a scroll parent
    const isVisibleInScrollParent = (() => {
      let parent = el.parentElement;
      while (parent) {
        const style = getComputedStyle(parent);
        const overflowY = style.overflowY;
        const overflowX = style.overflowX;
        if (overflowY === 'auto' || overflowY === 'scroll' || overflowX === 'auto' || overflowX === 'scroll') {
          const parentRect = parent.getBoundingClientRect();
          // Element must be within scroll parent's visible area (with some tolerance)
          if (
            r.bottom < parentRect.top + 4 ||
            r.top > parentRect.bottom - 4 ||
            r.right < parentRect.left + 4 ||
            r.left > parentRect.right - 4
          ) {
            return false;
          }
        }
        parent = parent.parentElement;
      }
      return true;
    })();

    if (!isVisibleInViewport || !isVisibleInScrollParent) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      // Re-measure after scroll settles
      setTimeout(() => {
        const r2 = el.getBoundingClientRect();
        setRect({ top: r2.top, left: r2.left, width: r2.width, height: r2.height });
      }, 400);
      return;
    }

    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [targetSelector, open]);

  useEffect(() => {
    measure();
    if (!open) return;

    const handleResize = () => measure();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    // Retry measuring if target wasn't found yet (DOM may still be loading)
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;
    const MAX_RETRIES = 5;
    if (targetSelector && !document.querySelector(targetSelector) && retryCount < MAX_RETRIES) {
      const retry = () => {
        retryCount++;
        if (document.querySelector(targetSelector)) {
          measure();
        } else if (retryCount < MAX_RETRIES) {
          retryTimer = setTimeout(retry, 300);
        }
      };
      retryTimer = setTimeout(retry, 300);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [measure, open, targetSelector]);

  // Lock body scroll while overlay is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Keyboard support
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        onNext?.();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onPrev?.();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose, onNext, onPrev]);

  // Auto-focus the tooltip when overlay opens or step changes
  useEffect(() => {
    if (open && tooltipRef.current) {
      // Small delay to let the animation start before focusing
      const timer = setTimeout(() => tooltipRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [open, targetSelector]);

  if (!open) return null;

  // ── Tooltip position with viewport clamping ──────────────
  const getTooltipStyle = (): React.CSSProperties => {
    if (!rect) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const base: React.CSSProperties = { position: 'fixed' };
    // Estimate tooltip size (will be refined after render)
    const tooltipW = tooltipRef.current?.offsetWidth ?? 380;
    const tooltipH = tooltipRef.current?.offsetHeight ?? 200;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top: number;
    let left: number;

    switch (tooltipPosition) {
      case 'bottom':
        top = rect.top + rect.height + PADDING + TOOLTIP_GAP;
        left = rect.left + rect.width / 2 - tooltipW / 2;
        // Flip to top if overflows bottom
        if (top + tooltipH > vh - VIEWPORT_MARGIN) {
          top = rect.top - PADDING - TOOLTIP_GAP - tooltipH;
        }
        break;
      case 'top':
        top = rect.top - PADDING - TOOLTIP_GAP - tooltipH;
        left = rect.left + rect.width / 2 - tooltipW / 2;
        // Flip to bottom if overflows top
        if (top < VIEWPORT_MARGIN) {
          top = rect.top + rect.height + PADDING + TOOLTIP_GAP;
        }
        break;
      case 'right':
        top = rect.top + rect.height / 2 - tooltipH / 2;
        left = rect.left + rect.width + PADDING + TOOLTIP_GAP;
        // Flip to left if overflows right
        if (left + tooltipW > vw - VIEWPORT_MARGIN) {
          left = rect.left - PADDING - TOOLTIP_GAP - tooltipW;
        }
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltipH / 2;
        left = rect.left - PADDING - TOOLTIP_GAP - tooltipW;
        // Flip to right if overflows left
        if (left < VIEWPORT_MARGIN) {
          left = rect.left + rect.width + PADDING + TOOLTIP_GAP;
        }
        break;
    }

    // Clamp to viewport bounds
    left = Math.max(VIEWPORT_MARGIN, Math.min(left, vw - tooltipW - VIEWPORT_MARGIN));
    top = Math.max(VIEWPORT_MARGIN, Math.min(top, vh - tooltipH - VIEWPORT_MARGIN));

    return { ...base, top, left };
  };

  return (
    <div
      className="focus-overlay-root"
      style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || 'Tutorial'}
    >
      {/* Dark overlay with cutout — pointer-events:none so clicks pass through the cutout to the highlighted element */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none' }}
      >
        <defs>
          <mask id={maskId}>
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.left - PADDING}
                y={rect.top - PADDING}
                width={rect.width + PADDING * 2}
                height={rect.height + PADDING * 2}
                rx="8"
                fill="black"
                style={{ transition: 'all 300ms ease-out' }}
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill={rect ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.45)'}
          mask={`url(#${maskId})`}
        />
      </svg>

      {/* Clickable backdrop around the cutout — dismiss on click outside highlighted area */}
      {rect ? (
        <>
          {/* Top region */}
          <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, height: Math.max(0, rect.top - PADDING), zIndex: 9998, cursor: 'pointer' }}
            onClick={onClose}
          />
          {/* Bottom region */}
          <div
            style={{ position: 'fixed', top: rect.top + rect.height + PADDING, left: 0, right: 0, bottom: 0, zIndex: 9998, cursor: 'pointer' }}
            onClick={onClose}
          />
          {/* Left region */}
          <div
            style={{ position: 'fixed', top: rect.top - PADDING, left: 0, width: Math.max(0, rect.left - PADDING), height: rect.height + PADDING * 2, zIndex: 9998, cursor: 'pointer' }}
            onClick={onClose}
          />
          {/* Right region */}
          <div
            style={{ position: 'fixed', top: rect.top - PADDING, left: rect.left + rect.width + PADDING, right: 0, height: rect.height + PADDING * 2, zIndex: 9998, cursor: 'pointer' }}
            onClick={onClose}
          />
        </>
      ) : (
        /* No target — full backdrop click dismisses */
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9998, cursor: 'pointer' }}
          onClick={onClose}
        />
      )}

      {/* Highlight border around target */}
      {rect && (
        <div
          className="rounded-lg ring-2 ring-primary ring-offset-2 pointer-events-none"
          style={{
            position: 'fixed',
            top: rect.top - PADDING,
            left: rect.left - PADDING,
            width: rect.width + PADDING * 2,
            height: rect.height + PADDING * 2,
            zIndex: 9999,
            transition: 'all 300ms ease-out',
          }}
        />
      )}

      {/* Tooltip content */}
      {children && (
        <div
          ref={tooltipRef}
          tabIndex={-1}
          className={cn(
            'bg-card border border-border rounded-xl shadow-2xl p-4 z-[10000] focus:outline-none',
            rect ? 'max-w-[400px]' : 'max-w-md w-[95vw] sm:w-auto',
            className,
          )}
          style={{
            ...getTooltipStyle(),
            zIndex: 10000,
            animation: 'focusOverlayFadeIn 200ms ease-out',
          }}
          onKeyDown={(e) => {
            // Focus trap: prevent Tab from leaving the tooltip
            if (e.key === 'Tab') {
              const focusable = tooltipRef.current?.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
              );
              if (!focusable || focusable.length === 0) {
                e.preventDefault();
                return;
              }
              const first = focusable[0];
              const last = focusable[focusable.length - 1];
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
              }
            }
          }}
        >
          {children}
        </div>
      )}

      <style>{`
        @keyframes focusOverlayFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
