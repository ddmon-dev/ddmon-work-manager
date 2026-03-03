import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GripHorizontal, X } from "lucide-react";
import { cn } from "@/shared/utils/classnames";

import { useCalculator } from "../context";
import { CalculatorDisplay } from "./calculator-display";
import { CalculatorKeypad } from "./calculator-keypad";
import { initialState, reducer } from "./calculator-reducer";

// --- Drag Hook (document-level move/up) ---

function useDrag(containerRef: React.RefObject<HTMLDivElement | null>) {
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

// --- Component ---

export function CalculatorPopup() {
  const { isOpen, close, triggerRef } = useCalculator();
  const [state, dispatch] = useReducer(reducer, initialState);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasPositioned = useRef(false);
  const { position, setPosition, startDrag, isDragging } = useDrag(containerRef);

  // 최초 오픈 시에만 트리거 위치 기반 배치, 이후에는 마지막 위치 유지
  useEffect(() => {
    if (!isOpen) return;

    requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;

      if (!hasPositioned.current) {
        const trigger = triggerRef.current;
        if (trigger) {
          const triggerRect = trigger.getBoundingClientRect();
          const calcHeight = container.offsetHeight;
          setPosition({
            x: triggerRect.left,
            y: Math.max(8, triggerRect.top - calcHeight - 8),
          });
        }
        hasPositioned.current = true;
      }

      container.focus();
    });
  }, [isOpen, triggerRef, setPosition]);

  // 복사 툴팁
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(state.display);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    setCopied(true);
    copyTimerRef.current = setTimeout(() => setCopied(false), 1500);
  }, [state.display]);

  const handleDigit = useCallback((digit: string) => dispatch({ type: "DIGIT", digit }), []);
  const handleDecimal = useCallback(() => dispatch({ type: "DECIMAL" }), []);
  const handleOperator = useCallback((operator: string) => dispatch({ type: "OPERATOR", operator }), []);
  const handleEquals = useCallback(() => dispatch({ type: "EQUALS" }), []);
  const handleClear = useCallback(() => dispatch({ type: "CLEAR" }), []);
  const handleNegate = useCallback(() => dispatch({ type: "NEGATE" }), []);
  const handlePercent = useCallback(() => dispatch({ type: "PERCENT" }), []);

  // 키보드 입력 (컨테이너에 포커스가 있을 때만 onKeyDown으로 수신)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      dispatch({ type: "DIGIT", digit: e.key });
    } else if (e.key === ".") {
      e.preventDefault();
      dispatch({ type: "DECIMAL" });
    } else if (e.key === "+" || e.key === "-") {
      e.preventDefault();
      dispatch({ type: "OPERATOR", operator: e.key });
    } else if (e.key === "*") {
      e.preventDefault();
      dispatch({ type: "OPERATOR", operator: "*" });
    } else if (e.key === "/") {
      e.preventDefault();
      dispatch({ type: "OPERATOR", operator: "/" });
    } else if (e.key === "Enter" || e.key === "=") {
      e.preventDefault();
      dispatch({ type: "EQUALS" });
    } else if (e.key === "Backspace") {
      e.preventDefault();
      dispatch({ type: "CLEAR" });
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "%") {
      e.preventDefault();
      dispatch({ type: "PERCENT" });
    }
  }, [close]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={containerRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onClick={() => containerRef.current?.focus()}
      className="fixed z-[100] select-none outline-none"
      style={{
        left: position.x,
        top: position.y,
        transition: isDragging ? "none" : "left 0.3s cubic-bezier(0.25, 1, 0.5, 1), top 0.3s cubic-bezier(0.25, 1, 0.5, 1)",
      }}
    >
      <div className="relative w-[260px] bg-popover rounded-2xl shadow-2xl border border-border">
        {/* 복사 툴팁 */}
        <span
          className={cn(
            "absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-muted text-muted-foreground text-xs px-2.5 py-1 rounded-full backdrop-blur-sm transition-opacity duration-200",
            copied ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          값 복사됨
        </span>

        {/* Drag Handle + Header */}
        <div
          className="flex items-center justify-between px-4 pt-3 pb-0 cursor-grab active:cursor-grabbing"
          onPointerDown={startDrag}
        >
          <span className="text-muted-foreground text-xs font-medium flex items-center gap-1.5">
            <GripHorizontal className="size-3" />
            계산기
          </span>
          <button
            type="button"
            onClick={close}
            onPointerDown={(e) => e.stopPropagation()}
            className="group size-3.5 rounded-full bg-[#ff5f57] cursor-pointer flex items-center justify-center"
          >
            <X className="size-2.5 text-[#4a0002] opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={3} />
          </button>
        </div>

        <CalculatorDisplay expression={state.expression} display={state.display} onCopy={handleCopy} />

        <CalculatorKeypad
          onDigit={handleDigit}
          onDecimal={handleDecimal}
          onOperator={handleOperator}
          onEquals={handleEquals}
          onClear={handleClear}
          onNegate={handleNegate}
          onPercent={handlePercent}
        />
      </div>
    </div>,
    document.body
  );
}
