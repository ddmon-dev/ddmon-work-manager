import { useCallback, useEffect, useRef, useState } from "react";

export function useDrag(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const positionRef = useRef(position);
  positionRef.current = position;

  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const startDrag = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: positionRef.current.x,
      origY: positionRef.current.y,
    };
  }, []);

  useEffect(() => {
    const DAMPING = 0.15;

    function rubberBand(value: number, min: number, max: number) {
      if (value < min) return min + (value - min) * DAMPING;
      if (value > max) return max + (value - max) * DAMPING;
      return value;
    }

    function getBounds() {
      const el = containerRef.current;
      if (!el) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
      return {
        minX: 0,
        minY: 0,
        maxX: window.innerWidth - el.offsetWidth,
        maxY: window.innerHeight - el.offsetHeight,
      };
    }

    function handleMove(e: PointerEvent) {
      if (!dragRef.current) return;
      const rawX = dragRef.current.origX + (e.clientX - dragRef.current.startX);
      const rawY = dragRef.current.origY + (e.clientY - dragRef.current.startY);
      const { minX, minY, maxX, maxY } = getBounds();

      setPosition({
        x: rubberBand(rawX, minX, maxX),
        y: rubberBand(rawY, minY, maxY),
      });
    }

    function handleUp() {
      if (!dragRef.current) return;
      dragRef.current = null;
      setIsDragging(false);

      // 경계 밖이면 안쪽으로 스냅백
      const { minX, minY, maxX, maxY } = getBounds();
      setPosition((prev) => {
        const clampedX = Math.max(minX, Math.min(maxX, prev.x));
        const clampedY = Math.max(minY, Math.min(maxY, prev.y));
        if (clampedX === prev.x && clampedY === prev.y) return prev;
        return { x: clampedX, y: clampedY };
      });
    }

    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
    return () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
    };
  }, [containerRef]);

  return { position, setPosition, startDrag, isDragging };
}
