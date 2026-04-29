import React, { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface CanvasPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasItem {
  id: string;
  position: CanvasPosition;
  children: React.ReactNode;
}

interface InfiniteCanvasProps {
  items: CanvasItem[];
  onItemPositionChange: (itemId: string, position: CanvasPosition) => void;
  className?: string;
  canvasHeight?: number;
  canvasWidth?: number;
}

export function InfiniteCanvas({
  items,
  onItemPositionChange,
  className,
  canvasHeight = 2000,
  canvasWidth = 2000,
}: InfiniteCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Handle dragging
  const handleMouseDown = useCallback((e: React.MouseEvent, itemId: string) => {
    // Only drag from header area (check if coming from widget header)
    const target = e.target as HTMLElement;
    if (!target.closest('[data-draggable-handle]')) {
      return;
    }

    setIsDragging(itemId);
    
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const rect = containerRef.current?.getBoundingClientRect();
    const scrollLeft = containerRef.current?.scrollLeft || 0;
    const scrollTop = containerRef.current?.scrollTop || 0;

    setDragOffset({
      x: e.clientX + scrollLeft - (rect?.left || 0) - item.position.x,
      y: e.clientY + scrollTop - (rect?.top || 0) - item.position.y,
    });
  }, [items]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;

    const rect = containerRef.current?.getBoundingClientRect();
    const scrollLeft = containerRef.current?.scrollLeft || 0;
    const scrollTop = containerRef.current?.scrollTop || 0;

    const newX = e.clientX + scrollLeft - (rect?.left || 0) - dragOffset.x;
    const newY = e.clientY + scrollTop - (rect?.top || 0) - dragOffset.y;

    const item = items.find(i => i.id === isDragging);
    if (item) {
      onItemPositionChange(isDragging, {
        ...item.position,
        x: Math.max(0, newX),
        y: Math.max(0, newY),
      });
    }
  }, [isDragging, dragOffset, items, onItemPositionChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    document.addEventListener('mousemove', handleMouseMove as any);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove as any);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'dashboard-infinite-canvas relative overflow-auto rounded-lg select-none',
        'border border-cyan-400/20 bg-slate-950 text-slate-50',
        className
      )}
      style={{
        height: '100vh',
        cursor: isDragging ? 'grabbing' : isHovered ? 'grab' : 'default',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Canvas background */}
      <div
        className="absolute inset-0 pointer-events-none dashboard-infinite-canvas__bg"
        style={{
          backgroundImage: [
            'radial-gradient(circle at 20% 20%, rgba(34,211,238,0.12) 0, rgba(34,211,238,0) 34%)',
            'radial-gradient(circle at 80% 10%, rgba(59,130,246,0.14) 0, rgba(59,130,246,0) 30%)',
            'radial-gradient(circle at 50% 80%, rgba(14,165,233,0.10) 0, rgba(14,165,233,0) 36%)',
            'radial-gradient(circle, rgba(148,163,184,0.14) 1px, transparent 1px)'
          ].join(', '),
          backgroundSize: '100% 100%, 100% 100%, 100% 100%, 40px 40px',
          backgroundPosition: '0 0',
        }}
      />

      {/* Items container */}
      <div
        className="relative"
        style={{
          width: `${canvasWidth}px`,
          height: `${canvasHeight}px`,
        }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'absolute transition-colors',
              isDragging === item.id && 'z-50'
            )}
            style={{
              left: `${item.position.x}px`,
              top: `${item.position.y}px`,
              width: `${item.position.width}px`,
              height: `${item.position.height}px`,
            }}
            onMouseDown={(e) => handleMouseDown(e, item.id)}
          >
            {item.children}
          </div>
        ))}
      </div>
    </div>
  );
}
