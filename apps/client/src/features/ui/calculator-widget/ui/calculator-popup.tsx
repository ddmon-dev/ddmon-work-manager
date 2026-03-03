import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GripHorizontal, X } from "lucide-react";
import { cn } from "@/shared/utils/classnames";

import { useCalculator } from "../context";
import { CalculatorDisplay } from "./calculator-display";
import { CalculatorKeypad } from "./calculator-keypad";

// --- Calculator State & Reducer ---

interface CalculatorState {
  display: string;
  expression: string;
  previousValue: number | null;
  operator: string | null;
  waitingForOperand: boolean;
}

type CalculatorAction =
  | { type: "DIGIT"; digit: string }
  | { type: "DECIMAL" }
  | { type: "OPERATOR"; operator: string }
  | { type: "EQUALS" }
  | { type: "CLEAR" }
  | { type: "NEGATE" }
  | { type: "PERCENT" };

const initialState: CalculatorState = {
  display: "0",
  expression: "",
  previousValue: null,
  operator: null,
  waitingForOperand: false,
};

function calculate(a: number, op: string, b: number): number {
  switch (op) {
    case "+": return a + b;
    case "-": return a - b;
    case "*": return a * b;
    case "/": return b === 0 ? 0 : a / b;
    default: return b;
  }
}

const operatorSymbol: Record<string, string> = {
  "+": "+",
  "-": "-",
  "*": "×",
  "/": "÷",
};

function formatDisplay(value: number): string {
  if (!Number.isFinite(value)) return "오류";

  if (Number.isInteger(value) && Math.abs(value) < 1e15) {
    return value.toLocaleString("ko-KR");
  }

  const str = parseFloat(value.toPrecision(10)).toString();
  const parts = str.split(".");
  parts[0] = Number(parts[0]).toLocaleString("ko-KR");
  return parts.join(".");
}

function reducer(state: CalculatorState, action: CalculatorAction): CalculatorState {
  switch (action.type) {
    case "DIGIT": {
      if (state.waitingForOperand) {
        return {
          ...state,
          display: action.digit,
          waitingForOperand: false,
        };
      }
      const newDisplay = state.display === "0" ? action.digit : state.display + action.digit;
      // 입력 제한 없음 (폰트 축소 + 스크롤로 처리)
      return { ...state, display: newDisplay };
    }

    case "DECIMAL": {
      if (state.waitingForOperand) {
        return { ...state, display: "0.", waitingForOperand: false };
      }
      if (state.display.includes(".")) return state;
      return { ...state, display: state.display + "." };
    }

    case "OPERATOR": {
      const currentValue = parseFloat(state.display);
      const sym = operatorSymbol[action.operator] ?? action.operator;

      if (state.operator && !state.waitingForOperand) {
        const result = calculate(state.previousValue!, state.operator, currentValue);
        return {
          display: formatDisplay(result),
          expression: `${formatDisplay(result)} ${sym}`,
          previousValue: result,
          operator: action.operator,
          waitingForOperand: true,
        };
      }

      return {
        ...state,
        expression: `${state.waitingForOperand && state.previousValue !== null ? formatDisplay(state.previousValue) : state.display} ${sym}`,
        previousValue: state.waitingForOperand && state.previousValue !== null ? state.previousValue : currentValue,
        operator: action.operator,
        waitingForOperand: true,
      };
    }

    case "EQUALS": {
      if (state.operator === null || state.previousValue === null) return state;
      const currentValue = parseFloat(state.display);
      const result = calculate(state.previousValue, state.operator, currentValue);
      const prevSym = operatorSymbol[state.operator] ?? state.operator;
      return {
        display: formatDisplay(result),
        expression: `${formatDisplay(state.previousValue)} ${prevSym} ${state.display} =`,
        previousValue: null,
        operator: null,
        waitingForOperand: true,
      };
    }

    case "CLEAR":
      return initialState;

    case "NEGATE": {
      if (state.display === "0") return state;
      const negated = state.display.startsWith("-")
        ? state.display.slice(1)
        : "-" + state.display;
      return { ...state, display: negated };
    }

    case "PERCENT": {
      const value = parseFloat(state.display) / 100;
      return { ...state, display: formatDisplay(value) };
    }

    default:
      return state;
  }
}

// --- Drag Hook (document-level move/up) ---

function useDrag() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
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
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: positionRef.current.x,
      origY: positionRef.current.y,
    };
  }, []);

  useEffect(() => {
    function handleMove(e: PointerEvent) {
      if (!dragRef.current) return;
      setPosition({
        x: dragRef.current.origX + (e.clientX - dragRef.current.startX),
        y: dragRef.current.origY + (e.clientY - dragRef.current.startY),
      });
    }

    function handleUp() {
      dragRef.current = null;
    }

    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
    return () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
    };
  }, []);

  return { position, setPosition, startDrag };
}

// --- Component ---

export function CalculatorPopup() {
  const { isOpen, close, triggerRef } = useCalculator();
  const [state, dispatch] = useReducer(reducer, initialState);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasPositioned = useRef(false);
  const { position, setPosition, startDrag } = useDrag();

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
      style={{ left: position.x, top: position.y }}
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
