import { useEffect, useRef } from "react";

interface CalculatorDisplayProps {
  expression: string;
  display: string;
  onCopy: () => void;
}

// 2px 단위로 축소 후 스크롤
const MAX_FONT = 36;
const MIN_FONT = 24;
const FONT_STEP = 2;
const LINE_HEIGHT = 44; // h-11

export function CalculatorDisplay({ expression, display, onCopy }: CalculatorDisplayProps) {
  const valueRef = useRef<HTMLDivElement>(null);
  const exprRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = valueRef.current;
    if (!el) return;

    let size = MAX_FONT;
    while (size >= MIN_FONT) {
      el.style.fontSize = `${size}px`;
      el.style.lineHeight = `${LINE_HEIGHT}px`;
      if (el.scrollWidth <= el.clientWidth) break;
      size -= FONT_STEP;
    }

    if (el.scrollWidth > el.clientWidth) {
      el.scrollLeft = el.scrollWidth;
    }
  }, [display]);

  // 수식도 넘치면 우측 끝 스크롤
  useEffect(() => {
    const el = exprRef.current;
    if (!el) return;

    if (el.scrollWidth > el.clientWidth) {
      el.scrollLeft = el.scrollWidth;
    }
  }, [expression]);

  return (
    <div
      className="px-5 py-3 cursor-pointer select-none space-y-0.5"
      onClick={onCopy}
    >
      <div
        ref={exprRef}
        className="h-5 text-right text-muted-foreground text-sm whitespace-nowrap overflow-x-auto hide-scrollbar"
      >
        {expression}
      </div>
      <div
        ref={valueRef}
        className="h-11 leading-[2.75rem] text-right text-foreground font-light tracking-tight whitespace-nowrap overflow-x-auto hide-scrollbar"
      >
        {display}
      </div>
    </div>
  );
}
