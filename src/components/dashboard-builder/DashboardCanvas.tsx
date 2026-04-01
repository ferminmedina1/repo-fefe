// DashboardCanvas - Editable dashboard with drag-drop widgets

import React, { useState, useCallback } from 'react';
import { DashboardConfig, DashboardWidget } from '@/types/dashboard';
import { Trash2, Copy, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface DashboardCanvasProps {
  config: DashboardConfig;
  selectedWidgetId: string | null;
  onSelectWidget: (widgetId: string | null) => void;
  onUpdateWidget: (widgetId: string, updates: Partial<DashboardWidget>) => void;
  onRemoveWidget: (widgetId: string) => void;
  readOnly?: boolean;
}

interface WidgetGridPos {
  x: number;
  y: number;
  width: number;
  height: number;
}

const DashboardCanvas: React.FC<DashboardCanvasProps> = ({
  config,
  selectedWidgetId,
  onSelectWidget,
  onUpdateWidget,
  onRemoveWidget,
  readOnly = false
}) => {
  const [draggingWidget, setDraggingWidget] = useState<string | null>(null);
  const [resizingWidget, setResizingWidget] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Get grid position from widget
  const getGridPos = (widget: DashboardWidget): WidgetGridPos => ({
    x: widget.position?.x || 0,
    y: widget.position?.y || 0,
    width: widget.size?.width || 4,
    height: widget.size?.height || 3
  });

  // Calculate pixel position from grid
  const getPixelPos = (gridX: number, gridY: number): { x: number; y: number } => {
    const colWidth = (window.innerWidth - 400) / config.layout.columns;
    const rowHeight = 100; // pixels

    return {
      x: gridX * colWidth + config.layout.padding,
      y: gridY * rowHeight + config.layout.padding
    };
  };

  // Calculate grid position from pixel
  const getGridFromPixel = (pixelX: number, pixelY: number): { x: number; y: number } => {
    const colWidth = (window.innerWidth - 400) / config.layout.columns;
    const rowHeight = 100;

    return {
      x: Math.max(0, Math.floor((pixelX - config.layout.padding) / colWidth)),
      y: Math.max(0, Math.floor((pixelY - config.layout.padding) / rowHeight))
    };
  };

  // Start drag
  const handleWidgetDragStart = (e: React.MouseEvent, widgetId: string) => {
    if (readOnly || e.button !== 0) return;

    const widget = config.widgets.find(w => w.id === widgetId);
    if (!widget) return;

    const pos = getPixelPos(
      widget.position?.x || 0,
      widget.position?.y || 0
    );

    setDraggingWidget(widgetId);
    setDragOffset({
      x: e.clientX - pos.x,
      y: e.clientY - pos.y
    });

    onSelectWidget(widgetId);
  };

  // Handle drag
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingWidget) return;

    const newPos = getGridFromPixel(
      e.clientX - dragOffset.x,
      e.clientY - dragOffset.y
    );

    onUpdateWidget(draggingWidget, {
      position: {
        x: Math.max(0, newPos.x),
        y: Math.max(0, newPos.y)
      }
    });
  };

  // End drag
  const handleMouseUp = () => {
    setDraggingWidget(null);
  };

  // Duplicate widget
  const duplicateWidget = (widget: DashboardWidget) => {
    if (readOnly) return;

    const newWidget = {
      ...widget,
      id: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: {
        x: (widget.position?.x || 0) + 1,
        y: (widget.position?.y || 0) + 1
      }
    };

    onUpdateWidget(widget.id, newWidget);
  };

  return (
    <div
      className="relative w-full h-full overflow-auto"
      style={{
        backgroundColor: config.theme.background,
        backgroundImage: `
          linear-gradient(
            0deg,
            ${config.theme.border} 1px,
            transparent 1px
          ),
          linear-gradient(
            90deg,
            ${config.theme.border} 1px,
            transparent 1px
          )
        `,
        backgroundSize: `${(window.innerWidth - 400) / config.layout.columns}px 100px`
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="p-4 space-y-4">
        {config.widgets.length === 0 ? (
          <div className="flex items-center justify-center h-96 text-gray-400">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">No widgets yet</p>
              <p className="text-sm">Click "Add Widget" to start building your dashboard</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {config.widgets.map(widget => {
              const pos = getGridPos(widget);
              const isSelected = selectedWidgetId === widget.id;
              const isDragging = draggingWidget === widget.id;

              return (
                <div
                  key={widget.id}
                  className={`
                    absolute bg-white rounded-lg border-2 transition-all cursor-move
                    ${isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'}
                    ${isDragging ? 'opacity-75' : 'opacity-100'}
                  `}
                  style={{
                    left: `calc(${pos.x * (100 / config.layout.columns)}% + ${config.layout.padding}px)`,
                    top: `${pos.y * 100 + config.layout.padding}px`,
                    width: `${pos.width * (100 / config.layout.columns)}%`,
                    height: `${pos.height * 100}px`
                  }}
                  onMouseDown={(e) => handleWidgetDragStart(e, widget.id)}
                  onClick={() => onSelectWidget(widget.id)}
                >
                  {/* Widget Header */}
                  <div className="p-3 border-b border-gray-200 bg-gray-50 rounded-t flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{widget.name}</h4>
                      <p className="text-xs text-gray-500">{widget.type}</p>
                    </div>

                    {!readOnly && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateWidget(widget);
                          }}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectWidget(widget.id);
                          }}
                        >
                          <Settings className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveWidget(widget.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Widget Content */}
                  <div className="p-4 overflow-auto flex-1 bg-white rounded-b text-sm text-gray-600">
                    <div className="space-y-2">
                      <div>
                        <span className="text-gray-500">Type:</span> {widget.type}
                      </div>
                      {widget.config?.metric && (
                        <div>
                          <span className="text-gray-500">Metric:</span> {widget.config.metric}
                        </div>
                      )}
                      {widget.config?.formula && (
                        <div className="text-xs bg-gray-50 p-2 rounded font-mono">
                          {widget.config.formula}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Resize Handle */}
                  {!readOnly && (
                    <div
                      className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 rounded cursor-se-resize hover:bg-blue-600"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setResizingWidget(widget.id);
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardCanvas;
