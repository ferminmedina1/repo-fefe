import React, { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { CanvasPosition } from './InfiniteCanvas';

interface CanvasWidgetProps {
  id: string;
  position: CanvasPosition;
  onPositionChange: (position: CanvasPosition) => void;
  isDragging?: boolean;
  children: React.ReactNode;
  className?: string;
}

const RESIZE_HANDLES = [
  'nw', 'n', 'ne',
  'w',       'e',
  'sw', 's', 'se'
] as const;

type ResizeHandle = typeof RESIZE_HANDLES[number];

export function CanvasWidget({
  id,
  position,
  onPositionChange,
  isDragging,
  children,
  className,
}: CanvasWidgetProps) {
  const widgetRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState<ResizeHandle | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0 });

  const handleResizeStart = (handle: ResizeHandle, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(handle);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      w: position.width,
      h: position.height,
    });
  };

  React.useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;

      let newX = position.x;
      let newY = position.y;
      let newWidth = resizeStart.w;
      let newHeight = resizeStart.h;

      const minSize = 200;

      if (isResizing.includes('n')) {
        newY = Math.max(0, position.y + deltaY);
        newHeight = Math.max(minSize, resizeStart.h - deltaY);
      }
      if (isResizing.includes('s')) {
        newHeight = Math.max(minSize, resizeStart.h + deltaY);
      }
      if (isResizing.includes('w')) {
        newX = Math.max(0, position.x + deltaX);
        newWidth = Math.max(minSize, resizeStart.w - deltaX);
      }
      if (isResizing.includes('e')) {
        newWidth = Math.max(minSize, resizeStart.w + deltaX);
      }

      onPositionChange({
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      });
    };

    const handleMouseUp = () => {
      setIsResizing(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, position, resizeStart, onPositionChange]);

  const getResizeHandlePosition = (handle: ResizeHandle): React.CSSProperties => {
    const size = 8;
    const offset = -size / 2;

    const positions: Record<ResizeHandle, React.CSSProperties> = {
      nw: { top: offset, left: offset, cursor: 'nw-resize' },
      n: { top: offset, left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' },
      ne: { top: offset, right: offset, cursor: 'ne-resize' },
      w: { top: '50%', left: offset, transform: 'translateY(-50%)', cursor: 'w-resize' },
      e: { top: '50%', right: offset, transform: 'translateY(-50%)', cursor: 'e-resize' },
      sw: { bottom: offset, left: offset, cursor: 'sw-resize' },
      s: { bottom: offset, left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' },
      se: { bottom: offset, right: offset, cursor: 'se-resize' },
    };

    return positions[handle];
  };

  return (
    <div
      ref={widgetRef}
      className={cn(
        'relative bg-background border border-border/50 rounded-lg overflow-hidden',
        'transition-shadow duration-200',
        isDragging && 'shadow-lg ring-2 ring-primary/50',
        isResizing && 'ring-2 ring-primary',
        className
      )}
    >
      {/* Draggable header handle */}
      <div
        data-draggable-handle
        className="cursor-grab active:cursor-grabbing absolute top-0 left-0 right-0 h-10 z-10"
      />

      {/* Widget content */}
      <div className="h-full w-full overflow-auto">{children}</div>

      {/* Resize handles - only show on hover */}
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity pointer-events-none group">
        {RESIZE_HANDLES.map((handle) => (
          <div
            key={handle}
            className={cn(
              'absolute w-4 h-4 bg-primary rounded-full transition-colors',
              'hover:bg-primary/80 pointer-events-auto'
            )}
            style={getResizeHandlePosition(handle)}
            onMouseDown={(e) => handleResizeStart(handle, e)}
          />
        ))}
      </div>
    </div>
  );
}
