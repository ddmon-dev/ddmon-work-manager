import { useState, useRef, useEffect } from "react";
import { cn } from "@/shared/utils/classnames";
import {
  DAY_WIDTH,
  ROW_HEIGHT,
  BAR_HEIGHT,
  BAR_Y_OFFSET,
  dateToX,
  parseISO,
} from "./utils";

interface InlineCreateRowProps {
  dateStr: string; // yyyy-MM-dd
  rowIndex: number;
  rangeStart: Date;
  onSubmit: (title: string, startDate: string) => void;
  onCancel: () => void;
}

export function InlineCreateRow({
  dateStr,
  rowIndex,
  rangeStart,
  onSubmit,
  onCancel,
}: InlineCreateRowProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const date = parseISO(dateStr);
  const left = dateToX(date, rangeStart);
  const top = rowIndex * ROW_HEIGHT + BAR_Y_OFFSET;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      onCancel();
      return;
    }
    onSubmit(trimmed, dateStr);
    setValue("");
    // 포커스 유지 → 연속 입력
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div
      data-gantt-bar
      className="absolute z-20"
      style={{ left, top, height: BAR_HEIGHT }}
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSubmit}
        placeholder="일정 제목 입력 후 Enter"
        className={cn(
          "h-full px-2 text-xs rounded-md border border-primary/50 bg-primary/5",
          "outline-none focus:ring-1 focus:ring-primary/30",
          "placeholder:text-muted-foreground/60"
        )}
        style={{ width: DAY_WIDTH * 5 }}
      />
    </div>
  );
}
