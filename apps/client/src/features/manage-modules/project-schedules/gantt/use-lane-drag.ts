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
  laneCount: number | ((projectId?: string) => number);
  onReorder: (fromLocal: number, toLocal: number, projectId?: string) => void;
}

function resolveLaneCount(laneCount: number | ((projectId?: string) => number), projectId?: string): number {
  return typeof laneCount === "function" ? laneCount(projectId) : laneCount;
}

export function useLaneDrag({ laneCount, onReorder }: UseLaneDragParams) {
  const [laneDrag, setLaneDrag] = useState<LaneDragState | null>(null);
  const laneDragRef = useRef(laneDrag);
  laneDragRef.current = laneDrag;

  // ref로 최신 값 유지 — effect 재등록 없이 안정적 참조
  const laneCountRef = useRef(laneCount);
  laneCountRef.current = laneCount;
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;

  const laneDropLocal = useMemo(() => {
    if (!laneDrag?.moved) return -1;
    const count = resolveLaneCount(laneCount, laneDrag.projectId);
    const delta = Math.round((laneDrag.currentY - laneDrag.startY) / ROW_HEIGHT);
    return Math.max(0, Math.min(count - 1, laneDrag.fromLocal + delta));
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
        const count = resolveLaneCount(laneCountRef.current, prev.projectId);
        const delta = Math.round((prev.currentY - prev.startY) / ROW_HEIGHT);
        const toLocal = Math.max(0, Math.min(count - 1, prev.fromLocal + delta));
        if (toLocal !== prev.fromLocal) {
          onReorderRef.current(prev.fromLocal, toLocal, prev.projectId);
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
  }, [!!laneDrag]);

  return { laneDrag, laneDropLocal, handleLanePointerDown };
}
