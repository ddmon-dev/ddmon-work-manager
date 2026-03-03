import { useEffect, useRef } from "react";

interface CalculatorDisplayProps {
  content: string;
  onCopy: () => void;
}

// 2px 단위로 축소 후 스크롤
const MAX_FONT = 36;
const MIN_FONT = 20;
const FONT_STEP = 2;
const LINE_HEIGHT = 44; // h-11

export function CalculatorDisplay({ content, onCopy }: CalculatorDisplayProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
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
  }, [content]);

  return (
    <div
      className="px-5 py-3 cursor-pointer select-none"
      onClick={onCopy}
    >
      <div
        ref={ref}
        className="h-11 leading-[2.75rem] text-right text-foreground font-light tracking-tight whitespace-nowrap overflow-x-auto hide-scrollbar"
      >
        {content}
      </div>
    </div>
  );
}
