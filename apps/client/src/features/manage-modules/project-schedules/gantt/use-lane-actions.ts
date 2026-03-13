import { useState, useCallback, useRef } from "react";
import { useDialog } from "@/shared/ui/app-dialog";
import {
  useCreateLane,
  useUpdateLane,
  useDeleteLane,
  useReorderLanes,
} from "../api";

interface LaneBase {
  id: string;
  title: string;
}

export function useLaneActions() {
  const createLane = useCreateLane();
  const updateLane = useUpdateLane();
  const deleteLane = useDeleteLane();
  const reorderLanes = useReorderLanes();
  const dialog = useDialog();

  const [editingLaneId, setEditingLaneId] = useState<string | null>(null);
  const [editingLaneTitle, setEditingLaneTitle] = useState("");
  const editingLaneTitleRef = useRef(editingLaneTitle);
  editingLaneTitleRef.current = editingLaneTitle;

  const startEdit = useCallback((laneId: string, title: string) => {
    setEditingLaneId(laneId);
    setEditingLaneTitle(title);
  }, []);

  const saveEdit = useCallback((laneId: string, originalTitle: string) => {
    const trimmed = editingLaneTitleRef.current.trim();
    if (trimmed !== originalTitle) {
      updateLane.mutate({ id: laneId, data: { title: trimmed } });
    }
    setEditingLaneId(null);
  }, [updateLane]);

  const cancelEdit = useCallback(() => {
    setEditingLaneId(null);
  }, []);

  const handleDelete = useCallback((laneId: string, scheduleCount: number) => {
    if (scheduleCount > 0) {
      dialog.confirm({
        title: "행 삭제",
        description: `이 행에 ${scheduleCount}개의 일정이 있습니다. 행과 함께 모든 일정이 삭제됩니다.`,
        variant: "destructive",
        confirmText: "삭제",
        onConfirm: () => deleteLane.mutate(laneId),
      });
    } else {
      deleteLane.mutate(laneId);
    }
  }, [dialog, deleteLane]);

  const handleAddBelow = useCallback((projectId: string, afterIndex: number, lanes: LaneBase[]) => {
    createLane.mutate({
      projectId,
      title: "",
      sortOrder: afterIndex + 1,
    }, {
      onSuccess: () => {
        const toReorder = lanes
          .filter((_, i) => i > afterIndex)
          .map((l, i) => ({ id: l.id, sortOrder: afterIndex + 2 + i }));
        if (toReorder.length > 0) {
          reorderLanes.mutate(toReorder);
        }
      },
    });
  }, [createLane, reorderLanes]);

  return {
    editingLaneId,
    editingLaneTitle,
    setEditingLaneTitle,
    startEdit,
    saveEdit,
    cancelEdit,
    handleDelete,
    handleAddBelow,
  };
}
