/**
 * Enhanced Drag & Drop Container - Enterprise Grade
 * Características:
 * - Feedback visual mejorado
 * - Animaciones suaves
 * - Validación de seguridad
 * - Logging de auditoría
 * - Accesibilidad completa (ARIA, keyboard)
 */

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragCancelEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ReactNode, useState, useCallback, useEffect } from "react";
import { GripVertical, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SortableWidgetProps {
  id: string;
  children: ReactNode;
  isDraggingAny?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

/**
 * Enterprise Sortable Widget with enhanced feedback
 */
function EnterpriseSortableWidget({
  id,
  children,
  isDraggingAny,
  onDragStart,
  onDragEnd,
}: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
    isSorting,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 200ms cubic-bezier(0.2, 0, 0, 1)",
    opacity: isDragging ? 0.4 : isDraggingAny && !isOver ? 0.6 : 1,
    zIndex: isDragging ? 1000 : isSorting ? 100 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative transition-all duration-200",
        isDragging && "ring-2 ring-primary ring-offset-2 shadow-2xl",
        isOver && "ring-2 ring-primary/50 bg-primary/5",
        isSorting && "opacity-75"
      )}
      data-drag-id={id}
      role="button"
      aria-pressed={isDragging}
      aria-label={`Widget ${id}, drag to reorder`}
    >
      {/* Grip Handle */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1.5 bg-transparent hover:bg-primary/40 transition-colors duration-200 cursor-grab active:cursor-grabbing flex items-center justify-center group z-10",
          isDragging && "bg-primary/60 w-1",
          isDraggingAny && "visible"
        )}
        {...attributes}
        {...listeners}
        role="slider"
        aria-valuetext={`Widget ${id}`}
        aria-label="Drag handle"
        onMouseDown={() => onDragStart?.()}
        onMouseUp={() => onDragEnd?.()}
        onTouchStart={() => onDragStart?.()}
        onTouchEnd={() => onDragEnd?.()}
      >
        <GripVertical
          className={cn(
            "h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-primary",
            isDragging && "opacity-100"
          )}
          aria-hidden="true"
        />
      </div>

      {/* Indicator de drop zone */}
      {isOver && (
        <div className="absolute inset-0 rounded-lg border-2 border-primary border-dashed pointer-events-none animate-pulse" />
      )}

      {/* Content */}
      <div className="pl-2">{children}</div>
    </div>
  );
}

interface EnterpriseDragDropContainerProps {
  widgets: Array<{ id: string }>;
  onReorder: (startIndex: number, endIndex: number) => void;
  children: ReactNode;
  onSecurityAlert?: (alert: SecurityAlert) => void;
  enableLogging?: boolean;
  maxReordersPerMinute?: number;
}

export interface SecurityAlert {
  type: "suspicious_activity" | "rate_limit" | "invalid_operation";
  message: string;
  timestamp: Date;
  widgetId?: string;
}

/**
 * Enterprise Drag & Drop Container with Security & Logging
 */
export function EnterpriseDragDropContainer({
  widgets,
  onReorder,
  children,
  onSecurityAlert,
  enableLogging = false,
  maxReordersPerMinute = 60,
}: EnterpriseDragDropContainerProps) {
  const { toast } = useToast();
  const [isDraggingAny, setIsDraggingAny] = useState(false);
  const [reorderCount, setReorderCount] = useState(0);
  const [lastReorderTime, setLastReorderTime] = useState<Date | null>(null);

  // Rate limiting check
  const checkRateLimit = useCallback(() => {
    if (!lastReorderTime) return true;

    const now = new Date();
    const timeDiffMs = now.getTime() - lastReorderTime.getTime();
    const timeDiffMin = timeDiffMs / 1000 / 60;

    if (timeDiffMin >= 1) {
      // Reset counter after 1 minute
      setReorderCount(0);
      return true;
    }

    if (reorderCount >= maxReordersPerMinute) {
      const alert: SecurityAlert = {
        type: "rate_limit",
        message: `Rate limit exceeded: ${maxReordersPerMinute} reorders per minute`,
        timestamp: now,
      };
      onSecurityAlert?.(alert);
      return false;
    }

    return true;
  }, [lastReorderTime, reorderCount, maxReordersPerMinute, onSecurityAlert]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      distance: 8, // 8px drag threshold
      activationConstraint: {
        delay: 100,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const widgetIds = widgets.map((w) => w.id);

  const handleDragStart = (event: DragStartEvent) => {
    setIsDraggingAny(true);
    if (enableLogging) {
      console.log("[Dashboard] Drag started:", event.active.id);
    }
  };

  const handleDragCancel = (event: DragCancelEvent) => {
    setIsDraggingAny(false);
    if (enableLogging) {
      console.log("[Dashboard] Drag cancelled:", event.active.id);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDraggingAny(false);
    const { active, over } = event;

    if (!over) {
      toast({
        title: "Operación cancelada",
        description: "El widget no fue reordenado.",
        variant: "default",
      });
      return;
    }

    // Validar que los IDs existan en la lista
    if (!widgetIds.includes(active.id as string) || !widgetIds.includes(over.id as string)) {
      const alert: SecurityAlert = {
        type: "invalid_operation",
        message: "Intento de reordenar widget inválido",
        timestamp: new Date(),
        widgetId: active.id as string,
      };
      onSecurityAlert?.(alert);
      toast({
        title: "Error de validación",
        description: "El widget no es válido.",
        variant: "destructive",
      });
      return;
    }

    // Check rate limit
    if (!checkRateLimit()) {
      toast({
        title: "Demasiados cambios",
        description: "Por favor, espera un momento antes de reordenar nuevamente.",
        variant: "destructive",
      });
      return;
    }

    if (active.id !== over.id) {
      const oldIndex = widgetIds.indexOf(active.id as string);
      const newIndex = widgetIds.indexOf(over.id as string);

      // Update rate limit counters
      setReorderCount((prev) => prev + 1);
      setLastReorderTime(new Date());

      if (enableLogging) {
        console.log("[Dashboard] Reorder:", {
          from: oldIndex,
          to: newIndex,
          widgetId: active.id,
          timestamp: new Date().toISOString(),
        });
      }

      // Call the reorder callback
      onReorder(oldIndex, newIndex);

      // Toast feedback
      toast({
        title: "Widget reordenado",
        description: `Widget movido a posición ${newIndex + 1}`,
      });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
      accessibility={{
        announcements: {
          onDragStart({ active }) {
            return `Picked up ${active.id} from position`;
          },
          onDragOver({ active, over }) {
            return `${active.id} was moved to position ${over?.id}`;
          },
          onDragEnd({ active, over }) {
            return `${active.id} was dropped to position ${over?.id}`;
          },
          onDragCancel({ active }) {
            return `Dragging ${active.id} was cancelled`;
          },
        },
      }}
    >
      <SortableContext items={widgetIds} strategy={verticalListSortingStrategy}>
        <div role="region" aria-label="Draggable widgets container" aria-live="polite">
          {typeof children === "function"
            ? (children as any)(isDraggingAny)
            : children}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export { EnterpriseSortableWidget };
