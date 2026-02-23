// ============================================================
// FocusOverlay — Reusable component that highlights a target
// element with a dark overlay around it.
// Used for onboarding step guidance and module tutorials.
// ============================================================

import { useEffect, useState, useCallback, type ReactNode } from 'react';
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
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function FocusOverlay({
  targetSelector,
  children,
  open,
  onClose,
  tooltipPosition = 'bottom',
  className,
}: FocusOverlayProps) {
  const [rect, setRect] = useState<TargetRect | null>(null);

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
    const r = el.getBoundingClientRect();
    setRect({
      top: r.top + window.scrollY,
      left: r.left + window.scrollX,
      width: r.width,
      height: r.height,
    });
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

  if (!open) return null;

  const padding = 8;

  // Tooltip position calculation
  const getTooltipStyle = (): React.CSSProperties => {
    if (!rect) {
      // Center on screen if no target
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const base: React.CSSProperties = { position: 'fixed' };
    const scrollY = window.scrollY;

    switch (tooltipPosition) {
      case 'bottom':
        return {
          ...base,
          top: rect.top - scrollY + rect.height + padding + 12,
          left: rect.left + rect.width / 2,
          transform: 'translateX(-50%)',
        };
      case 'top':
        return {
          ...base,
          bottom: window.innerHeight - (rect.top - scrollY) + padding + 12,
          left: rect.left + rect.width / 2,
          transform: 'translateX(-50%)',
        };
      case 'right':
        return {
          ...base,
          top: rect.top - scrollY + rect.height / 2,
          left: rect.left + rect.width + padding + 12,
          transform: 'translateY(-50%)',
        };
      case 'left':
        return {
          ...base,
          top: rect.top - scrollY + rect.height / 2,
          right: window.innerWidth - rect.left + padding + 12,
          transform: 'translateY(-50%)',
        };
    }
  };

  return (
    <div className="focus-overlay-root" style={{ position: 'fixed', inset: 0, zIndex: 9998 }}>
      {/* Dark overlay with cutout */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
        onClick={onClose}
      >
        <defs>
          <mask id="focus-overlay-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.left - padding}
                y={rect.top - window.scrollY - padding}
                width={rect.width + padding * 2}
                height={rect.height + padding * 2}
                rx="8"
                fill="black"
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
          mask="url(#focus-overlay-mask)"
        />
      </svg>

      {/* Highlight border around target */}
      {rect && (
        <div
          className="absolute rounded-lg ring-2 ring-primary ring-offset-2 pointer-events-none"
          style={{
            position: 'fixed',
            top: rect.top - window.scrollY - padding,
            left: rect.left - padding,
            width: rect.width + padding * 2,
            height: rect.height + padding * 2,
            zIndex: 9999,
            transition: 'all 200ms ease-out',
          }}
        />
      )}

      {/* Tooltip content */}
      {children && (
        <div
          className={cn(
            'bg-card border border-border rounded-xl shadow-2xl p-4 max-w-sm z-[10000]',
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
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
