import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ReactNode } from "react";
import { GripVertical } from "lucide-react";

interface SortableWidgetProps {
  id: string;
  children: ReactNode;
}

function SortableWidget({ id, children }: SortableWidgetProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div
        className="absolute left-0 top-0 bottom-0 w-1 bg-primary/0 hover:bg-primary/50 transition-colors cursor-grab active:cursor-grabbing flex items-center justify-center group"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 opacity-0 group-hover:opacity-100 text-primary" />
      </div>
      <div className="pl-2">{children}</div>
    </div>
  );
}

interface DragDropWidgetContainerProps {
  widgets: Array<{ id: string }>;
  onReorder: (startIndex: number, endIndex: number) => void;
  children: ReactNode;
}

export function DragDropWidgetContainer({
  widgets,
  onReorder,
  children,
}: DragDropWidgetContainerProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      distance: 8,
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const widgetIds = widgets.map((w) => w.id);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = widgetIds.indexOf(active.id as string);
      const newIndex = widgetIds.indexOf(over.id as string);
      onReorder(oldIndex, newIndex);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={widgetIds} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

export { SortableWidget };
