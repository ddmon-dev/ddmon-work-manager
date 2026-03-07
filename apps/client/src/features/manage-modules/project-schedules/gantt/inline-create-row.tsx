import { useState, useRef, useEffect } from "react";
import { cn } from "@/shared/utils/classnames";
import { TASK_CATEGORIES } from "@packages/schemas";
import type { TaskCategory } from "@packages/schemas";
import { TASK_CATEGORY_CONFIG } from "../constants";
import {
  DAY_WIDTH,
  ROW_HEIGHT,
  BAR_HEIGHT,
  BAR_Y_OFFSET,
  dateToX,
  parseISO,
} from "./utils";

interface InlineCreateRowProps {
  dateStr: string;
  rowIndex: number;
  rangeStart: Date;
  onSubmit: (title: string, startDate: string, category: TaskCategory) => void;
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
  const [category, setCategory] = useState<TaskCategory>("development");
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
    onSubmit(trimmed, dateStr, category);
    setValue("");
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
      className="absolute z-20 flex items-center gap-1"
      style={{ left, top, height: BAR_HEIGHT }}
    >
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as TaskCategory)}
        className={cn(
          "h-full px-1.5 text-xs rounded-md border border-primary/50 bg-primary/5",
          "outline-none focus:ring-1 focus:ring-primary/30 cursor-pointer"
        )}
      >
        {TASK_CATEGORIES.map((cat) => (
          <option key={cat} value={cat}>
            {TASK_CATEGORY_CONFIG[cat].label}
          </option>
        ))}
      </select>
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
        style={{ width: DAY_WIDTH * 4 }}
      />
    </div>
  );
}
