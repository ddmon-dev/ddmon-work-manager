import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ROW_HEIGHT, CLICK_THRESHOLD } from "./utils";

interface LaneDragState {
  laneId: string;
  projectId?: string;
  startY: number;
  currentY: number;
  fromLocal: number;
  moved: boolean;
}

interface UseLaneDragParams {
  laneCount: number;
  onReorder: (fromLocal: number, toLocal: number) => void;
}

export function useLaneDrag({ laneCount, onReorder }: UseLaneDragParams) {
  const [laneDrag, setLaneDrag] = useState<LaneDragState | null>(null);
  const laneDragRef = useRef(laneDrag);
  laneDragRef.current = laneDrag;

  const laneDropLocal = useMemo(() => {
    if (!laneDrag?.moved) return -1;
    const delta = Math.round((laneDrag.currentY - laneDrag.startY) / ROW_HEIGHT);
    return Math.max(0, Math.min(laneCount - 1, laneDrag.fromLocal + delta));
  }, [laneDrag, laneCount]);

  const handleLanePointerDown = useCallback((e: React.PointerEvent, laneId: string, fromLocal: number, projectId?: string) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setLaneDrag({ laneId, projectId, startY: e.clientY, currentY: e.clientY, fromLocal, moved: false });
  }, []);

  useEffect(() => {
    if (!laneDrag) return;

    const handleMove = (e: PointerEvent) => {
      setLaneDrag((prev) => {
        if (!prev) return null;
        const moved = prev.moved || Math.abs(e.clientY - prev.startY) > CLICK_THRESHOLD;
        return { ...prev, currentY: e.clientY, moved };
      });
    };

    const handleUp = () => {
      const prev = laneDragRef.current;
      if (!prev) return;

      if (prev.moved) {
        const delta = Math.round((prev.currentY - prev.startY) / ROW_HEIGHT);
        const toLocal = Math.max(0, Math.min(laneCount - 1, prev.fromLocal + delta));
        if (toLocal !== prev.fromLocal) {
          onReorder(prev.fromLocal, toLocal);
        }
      }

      setLaneDrag(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [!!laneDrag, laneCount, onReorder]);

  return { laneDrag, laneDropLocal, handleLanePointerDown };
}
