import { useEffect, useEffectEvent, useLayoutEffect, useReducer, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GripHorizontal, X } from "lucide-react";
import { cn } from "@/shared/utils/classnames";

import { useCalculator } from "../context";
import { CalculatorDisplay } from "./calculator-display";
import { CalculatorKeypad } from "./calculator-keypad";
import { initialState, reducer } from "./calculator-reducer";
import { useDrag } from "./use-drag";

export function CalculatorPopup() {
  const { isOpen, close, toggle, triggerRef } = useCalculator();
  const [state, dispatch] = useReducer(reducer, initialState);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasPositioned = useRef(false);
  const [transitionReady, setTransitionReady] = useState(false);
  const { position, setPosition, startDrag, isDragging } = useDrag(containerRef);

  // 최초 오픈 시 트리거 위치 기반 배치 (transition 비활성 상태에서 위치 확정)
  useLayoutEffect(() => {
    if (!isOpen) {
      setTransitionReady(false);
      return;
    }
    if (hasPositioned.current) {
      setTransitionReady(true);
      return;
    }
    const container = containerRef.current;
    if (!container) return;

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
  }, [isOpen, triggerRef, setPosition]);

  // 위치 확정 후 다음 프레임에서 transition 활성화
  useEffect(() => {
    if (isOpen && hasPositioned.current && !transitionReady) {
      requestAnimationFrame(() => setTransitionReady(true));
    }
  }, [isOpen, transitionReady]);

  // Cmd+E 토글
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if (e.metaKey && e.key === "e") {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [toggle]);

  // 오픈 시 포커스
  useEffect(() => {
    if (isOpen) containerRef.current?.focus();
  }, [isOpen]);

  // 복사 툴팁
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const handleCopy = useEffectEvent(() => {
    navigator.clipboard.writeText(state.display);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    setCopied(true);
    copyTimerRef.current = setTimeout(() => setCopied(false), 1500);
  });

  // 통합 디스플레이: 수식을 이어 보여주다 = 누르면 결과값 + 수식 서브타이틀
  const isResult = state.expression.endsWith("=");
  const displayContent = isResult
    ? state.display
    : state.expression
      ? state.waitingForOperand ? state.expression : `${state.expression}${state.display}`
      : state.display;
  const displaySubtitle = isResult ? state.expression : undefined;

  // 포커스 상태 (비활성화 시 opacity 적용)
  const [isFocused, setIsFocused] = useState(false);

  function handleBlur(e: React.FocusEvent) {
    // 내부 요소로의 포커스 이동은 무시
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsFocused(false);
    }
  }

  // 키보드 입력 (window 캡처 페이즈 — Radix UI의 document 캡처보다 먼저 실행)
  const showAC = state.display === "0";
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (!containerRef.current?.contains(e.target as Node)) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "c") {
        e.preventDefault();
        e.stopImmediatePropagation();
        handleCopy();
        return;
      }
      if (e.metaKey || e.ctrlKey) return;

      if (e.key >= "0" && e.key <= "9") {
        dispatch({ type: "DIGIT", digit: e.key });
      } else if (e.key === ".") {
        dispatch({ type: "DECIMAL" });
      } else if (e.key === "+" || e.key === "-") {
        dispatch({ type: "OPERATOR", operator: e.key });
      } else if (e.key === "*") {
        dispatch({ type: "OPERATOR", operator: "*" });
      } else if (e.key === "/") {
        dispatch({ type: "OPERATOR", operator: "/" });
      } else if (e.key === "Enter" || e.key === "=") {
        dispatch({ type: "EQUALS" });
      } else if (e.key === "Backspace" || e.key === "Delete") {
        dispatch({ type: "BACKSPACE" });
      } else if (e.key === "Escape") {
        dispatch({ type: showAC ? "CLEAR" : "CLEAR_ENTRY" });
      } else if (e.key === "%") {
        dispatch({ type: "PERCENT" });
      }
      e.preventDefault();
      e.stopImmediatePropagation();
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, showAC]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={containerRef}
      tabIndex={-1}
      onClick={() => containerRef.current?.focus()}
      onFocus={() => setIsFocused(true)}
      onBlur={handleBlur}
      className="fixed z-[100] select-none outline-none"
      style={{
        left: position.x,
        top: position.y,
        transition: isDragging || !transitionReady ? "none" : "left 0.3s cubic-bezier(0.25, 1, 0.5, 1), top 0.3s cubic-bezier(0.25, 1, 0.5, 1)",
      }}
    >
      <div className={cn(
        "relative w-[260px] rounded-2xl shadow-2xl border border-border transition-all duration-200",
        isFocused
          ? "bg-popover"
          : "bg-popover/50 backdrop-blur-md [&>*]:opacity-50",
      )}>
        {/* 복사 툴팁 */}
        {copied && (
          <span className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-muted text-muted-foreground text-xs px-2.5 py-1 rounded-full backdrop-blur-sm animate-in fade-in duration-200">
            값 복사됨
          </span>
        )}

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

        <CalculatorDisplay content={displayContent} subtitle={displaySubtitle} onCopy={handleCopy} />

        <CalculatorKeypad dispatch={dispatch} showAC={showAC} />
      </div>
    </div>,
    document.body
  );
}
