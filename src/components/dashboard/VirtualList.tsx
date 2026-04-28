/**
 * VirtualList Component
 * Manual virtual scrolling for large lists
 * Renders only visible items to optimize performance
 * 
 * Performance improvement: 100+ items → renders only ~8-10 visible items
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';

export interface VirtualListProps<T> {
  items: T[];
  itemHeight: number; // Fixed height of each item in pixels
  containerHeight: number; // Container height in pixels
  renderItem: (item: T, index: number) => React.ReactNode;
  gap?: number; // Gap between items (default: 6)
}

/**
 * VirtualList: Renders only visible items in a scrollable container
 * 
 * @example
 * ```tsx
 * <VirtualList
 *   items={bigArray}
 *   itemHeight={48}
 *   containerHeight={400}
 *   renderItem={(item, idx) => <ItemRow key={idx} item={item} />}
 * />
 * ```
 */
export const VirtualList = React.forwardRef(
  <T,>(
    {
      items,
      itemHeight,
      containerHeight,
      renderItem,
      gap = 6,
    }: VirtualListProps<T>,
    ref: React.ForwardedRef<HTMLDivElement>
  ) => {
    const [scrollTop, setScrollTop] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const itemSpacing = itemHeight + gap;

    // Calculate which items should be rendered (with buffer for smooth scrolling)
    const visibleRange = useMemo(() => {
      const startIndex = Math.max(0, Math.floor(scrollTop / itemSpacing) - 1);
      const endIndex = Math.min(
        items.length,
        Math.ceil((scrollTop + containerHeight) / itemSpacing) + 1
      );

      return { startIndex, endIndex };
    }, [scrollTop, itemHeight, containerHeight, items.length, gap]);

    // Calculate total height of list
    const totalHeight = items.length * itemSpacing;

    // Calculate offset of visible items
    const offsetY = visibleRange.startIndex * itemSpacing;

    // Visible items
    const visibleItems = items.slice(visibleRange.startIndex, visibleRange.endIndex);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      setScrollTop(target.scrollTop);
    };

    return (
      <div
        ref={ref || containerRef}
        onScroll={handleScroll}
        style={{
          height: `${containerHeight}px`,
          overflow: 'auto',
          position: 'relative',
        }}
        className="border rounded-lg bg-card"
      >
        {/* Spacer to maintain scroll position */}
        <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
          {/* Visible items container */}
          <div
            style={{
              transform: `translateY(${offsetY}px)`,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              willChange: 'transform',
            }}
          >
            {visibleItems.map((item, visibleIndex) => (
              <div
                key={visibleRange.startIndex + visibleIndex}
                style={{
                  height: `${itemHeight}px`,
                  marginBottom: `${gap}px`,
                }}
              >
                {renderItem(item, visibleRange.startIndex + visibleIndex)}
              </div>
            ))}
          </div>
        </div>

        {/* Item count indicator */}
        {items.length > 20 && (
          <div
            style={{
              position: 'sticky',
              bottom: 0,
              right: 0,
              padding: '0.25rem 0.5rem',
              fontSize: '0.7rem',
              backgroundColor: 'rgba(0,0,0,0.05)',
              borderTop: '1px solid var(--border)',
            }}
            className="text-muted-foreground text-right"
          >
            {visibleRange.startIndex + 1}-{visibleRange.endIndex} of {items.length}
          </div>
        )}
      </div>
    );
  }
);

VirtualList.displayName = 'VirtualList';
