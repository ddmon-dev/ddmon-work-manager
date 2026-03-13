import { useState, useEffect, useCallback } from "react";
import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

interface UseSortableReorderOptions<T extends { id: string }> {
  serverData: T[] | undefined;
  onReorder: (ids: string[]) => void;
}

export function useSortableReorder<T extends { id: string }>({
  serverData,
  onReorder,
}: UseSortableReorderOptions<T>) {
  const [items, setItems] = useState<T[]>([]);

  useEffect(() => {
    if (serverData) setItems(serverData);
  }, [serverData]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setItems((prev) => {
        const oldIndex = prev.findIndex((item) => item.id === active.id);
        const newIndex = prev.findIndex((item) => item.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        const reordered = arrayMove(prev, oldIndex, newIndex);
        onReorder(reordered.map((item) => item.id));
        return reordered;
      });
    },
    [onReorder]
  );

  return { items, sensors, handleDragEnd };
}
