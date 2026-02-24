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
}: FocusOverlayProps) {
  const [rect, setRect] = useState<TargetRect | null>(null);
  const maskId = useId().replace(/:/g, '_');
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Scroll target into view + measure
  const measure = useCallback(() => {
    if (!targetSelector || !open) {
      setRect(null);
      return;
    }
    const el = document.querySelector(targetSelector);
    if (!el) {
      setRect(null);
      return;
    }

    // Scroll into view if not visible
    const r = el.getBoundingClientRect();
    const inViewport =
      r.top >= 0 &&
      r.left >= 0 &&
      r.bottom <= window.innerHeight &&
      r.right <= window.innerWidth;

    if (!inViewport) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      // Re-measure after scroll settles
      setTimeout(() => {
        const r2 = el.getBoundingClientRect();
        setRect({ top: r2.top, left: r2.left, width: r2.width, height: r2.height });
      }, 350);
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

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [measure, open]);

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
      aria-label="Tour step"
    >
      {/* Dark overlay with cutout */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
        onClick={onClose}
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
          fill="rgba(0,0,0,0.6)"
          mask={`url(#${maskId})`}
        />
      </svg>

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
          className={cn(
            'bg-card border border-border rounded-xl shadow-2xl p-4 z-[10000]',
            rect ? 'max-w-[400px]' : 'max-w-md',
            className,
          )}
          style={{
            ...getTooltipStyle(),
            zIndex: 10000,
            animation: 'focusOverlayFadeIn 200ms ease-out',
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
