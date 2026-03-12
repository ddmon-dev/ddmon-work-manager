import { useRef, useLayoutEffect } from "react";
import { cn } from "@/shared/utils/classnames";

let _ctx: CanvasRenderingContext2D | null = null;
function measure(text: string, font: string) {
  if (!_ctx) _ctx = document.createElement("canvas").getContext("2d");
  _ctx!.font = font;
  return _ctx!.measureText(text).width;
}

function computeMiddleTruncation(
  name: string,
  maxWidth: number,
  font: string
): string {
  if (measure(name, font) <= maxWidth) return name;

  const dotIdx = name.lastIndexOf(".");
  const base = dotIdx > 0 ? name.slice(0, dotIdx) : name;
  const ext = dotIdx > 0 ? name.slice(dotIdx) : "";
  const ellipsis = "\u2026"; // …

  // 이진 탐색으로 최적 길이 계산
  let lo = 1;
  let hi = base.length - 1;
  let best = ellipsis + ext;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const headLen = Math.ceil(mid / 2);
    const tailLen = mid - headLen;
    const candidate =
      base.slice(0, headLen) +
      ellipsis +
      (tailLen > 0 ? base.slice(-tailLen) : "") +
      ext;

    if (measure(candidate, font) <= maxWidth) {
      best = candidate;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return best;
}

interface MiddleTruncateProps {
  children: string;
  className?: string;
}

/**
 * macOS 스타일 중간 생략 텍스트.
 * 파일: "긴파일명…보고서.pdf", 폴더: "긴폴더…이름"
 *
 * useLayoutEffect + DOM 직접 조작으로 layout shift 없음.
 */
export function MiddleTruncate({ children: text, className }: MiddleTruncateProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const compute = () => {
      const width = el.clientWidth;
      if (width === 0) return;
      const font = getComputedStyle(el).font;
      el.textContent = computeMiddleTruncation(text, width, font);
    };

    compute();

    const observer = new ResizeObserver(compute);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  return (
    <span
      ref={ref}
      className={cn("block overflow-hidden whitespace-nowrap", className)}
      title={text}
    >
      {text}
    </span>
  );
}
