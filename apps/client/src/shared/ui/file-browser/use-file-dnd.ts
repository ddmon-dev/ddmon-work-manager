import { useState, useCallback } from "react";
import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { uploadFiles } from "@/shared/ui/file-upload-zone";
import { useUploadFile } from "@/shared/lib/file-api";
import type { FileItem } from "@/shared/lib/file-types";

interface UseFileDndOptions {
  items: FileItem[] | undefined;
  selectedIds: Set<string>;
  clearSelection: () => void;
  handleDragDrop: (
    itemId: string,
    targetFolderId: string | null
  ) => Promise<void>;
  uploadFile: ReturnType<typeof useUploadFile>;
  onTrashDrop?: (itemId: string) => void;
}

export interface UseFileDndReturn {
  draggedItem: FileItem | null;
  dragRowWidth: number | null;
  dragCount: number;
  movingId: string | null;
  sensors: ReturnType<typeof useSensors>;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  handleDropUpload: (fileList: FileList, folderId: string) => Promise<void>;
}

export function useFileDnd({
  items,
  selectedIds,
  clearSelection,
  handleDragDrop,
  uploadFile,
  onTrashDrop,
}: UseFileDndOptions): UseFileDndReturn {
  const [draggedItem, setDraggedItem] = useState<FileItem | null>(null);
  const [dragRowWidth, setDragRowWidth] = useState<number | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  const dragCount =
    draggedItem && selectedIds.has(draggedItem.id) ? selectedIds.size : 1;

  const handleDropUpload = useCallback(
    async (fileList: FileList, targetFolderId: string) => {
      await uploadFiles(Array.from(fileList), targetFolderId, uploadFile);
    },
    [uploadFile]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const item = items?.find((i) => i.id === event.active.id);
      if (item) {
        setDraggedItem(item);
        if (!selectedIds.has(item.id)) clearSelection();
        const width = event.active.rect.current?.initial?.width;
        if (width) setDragRowWidth(width);
      }
    },
    [items, selectedIds, clearSelection]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDraggedItem(null);
      setDragRowWidth(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      // 휴지통 드롭
      if (onTrashDrop && over.data.current?.isTrash === true) {
        onTrashDrop(active.id as string);
        return;
      }

      const targetFolderId = over.data.current?.folderId as
        | string
        | null
        | undefined;
      if (targetFolderId === undefined) return;
      if (targetFolderId === active.id) return;
      if (
        selectedIds.has(active.id as string) &&
        targetFolderId &&
        selectedIds.has(targetFolderId)
      )
        return;
      setMovingId(active.id as string);
      handleDragDrop(active.id as string, targetFolderId).then(() =>
        setMovingId(null)
      );
    },
    [handleDragDrop, onTrashDrop, selectedIds]
  );

  return {
    draggedItem,
    dragRowWidth,
    dragCount,
    movingId,
    sensors,
    handleDragStart,
    handleDragEnd,
    handleDropUpload,
  };
}
