import { useEffect, useRef } from "react";

interface CalculatorDisplayProps {
  content: string;
  subtitle?: string;
  onCopy: () => void;
}

// 2px 단위로 축소 후 스크롤
const MAX_FONT = 36;
const MIN_FONT = 20;
const FONT_STEP = 2;
const LINE_HEIGHT = 44; // h-11

export function CalculatorDisplay({ content, subtitle, onCopy }: CalculatorDisplayProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
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

  useEffect(() => {
    const el = subtitleRef.current;
    if (!el) return;
    if (el.scrollWidth > el.clientWidth) {
      el.scrollLeft = el.scrollWidth;
    }
  }, [subtitle]);

  return (
    <div
      className="px-5 py-3 cursor-pointer select-none"
      onClick={onCopy}
    >
      <div
        ref={subtitleRef}
        className="h-5 text-right text-muted-foreground text-sm whitespace-nowrap overflow-x-auto hide-scrollbar"
      >
        {subtitle ?? "\u00A0"}
      </div>
      <div
        ref={contentRef}
        className="h-11 leading-[2.75rem] text-right text-foreground font-light tracking-tight whitespace-nowrap overflow-x-auto hide-scrollbar"
      >
        {content}
      </div>
    </div>
  );
}
