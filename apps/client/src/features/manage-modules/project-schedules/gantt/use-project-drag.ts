import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ROW_HEIGHT, CLICK_THRESHOLD } from "./utils";

interface ProjectDragState {
  projectId: string;
  startY: number;
  currentY: number;
  fromIndex: number;
  moved: boolean;
}

interface UseProjectDragParams {
  projectRowIndices: { index: number; globalRow: number; projectId: string }[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onToggle: (projectId: string) => void;
}

function findClosestIndex(
  projectRowIndices: { globalRow: number }[],
  targetGlobalRow: number,
  fallback: number,
): number {
  let closest = fallback;
  let minDist = Infinity;
  for (let i = 0; i < projectRowIndices.length; i++) {
    const dist = Math.abs(projectRowIndices[i].globalRow - targetGlobalRow);
    if (dist < minDist) { minDist = dist; closest = i; }
  }
  return closest;
}

export function useProjectDrag({ projectRowIndices, onReorder, onToggle }: UseProjectDragParams) {
  const [projectDrag, setProjectDrag] = useState<ProjectDragState | null>(null);
  const projectDragRef = useRef(projectDrag);
  projectDragRef.current = projectDrag;

  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;
  const onToggleRef = useRef(onToggle);
  onToggleRef.current = onToggle;
  const projectRowIndicesRef = useRef(projectRowIndices);
  projectRowIndicesRef.current = projectRowIndices;

  const dropIndex = useMemo(() => {
    if (!projectDrag?.moved) return -1;
    const fromGlobalRow = projectRowIndices[projectDrag.fromIndex]?.globalRow ?? 0;
    const targetGlobalRow = fromGlobalRow + Math.round((projectDrag.currentY - projectDrag.startY) / ROW_HEIGHT);
    return findClosestIndex(projectRowIndices, targetGlobalRow, projectDrag.fromIndex);
  }, [projectDrag, projectRowIndices]);

  const handleProjectPointerDown = useCallback((e: React.PointerEvent, projectId: string, fromIndex: number) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setProjectDrag({ projectId, startY: e.clientY, currentY: e.clientY, fromIndex, moved: false });
  }, []);

  useEffect(() => {
    if (!projectDrag) return;

    const handleMove = (e: PointerEvent) => {
      setProjectDrag((prev) => {
        if (!prev) return null;
        const moved = prev.moved || Math.abs(e.clientY - prev.startY) > CLICK_THRESHOLD;
        return { ...prev, currentY: e.clientY, moved };
      });
    };

    const handleUp = () => {
      const prev = projectDragRef.current;
      if (!prev) return;

      if (prev.moved) {
        const indices = projectRowIndicesRef.current;
        const fromGlobalRow = indices[prev.fromIndex]?.globalRow ?? 0;
        const targetGlobalRow = fromGlobalRow + Math.round((prev.currentY - prev.startY) / ROW_HEIGHT);
        const closest = findClosestIndex(indices, targetGlobalRow, prev.fromIndex);
        if (closest !== prev.fromIndex) {
          onReorderRef.current(prev.fromIndex, closest);
        }
      } else {
        onToggleRef.current(prev.projectId);
      }

      setProjectDrag(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [!!projectDrag]);

  return { projectDrag, dropIndex, handleProjectPointerDown };
}
