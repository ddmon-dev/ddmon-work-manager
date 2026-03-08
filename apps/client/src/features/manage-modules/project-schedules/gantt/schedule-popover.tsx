import { useState, useRef, useEffect } from "react";
import { Trash2Icon } from "lucide-react";
import { cn } from "@/shared/utils/classnames";
import { Button } from "@/shared/ui/button";
import { useDialog } from "@/shared/ui/app-dialog";
import { TASK_CATEGORIES } from "@packages/schemas";
import type { TaskCategory } from "@packages/schemas";
import { TASK_CATEGORY_CONFIG, getCategoryConfig } from "../constants";
import { useUpdateProjectSchedule, useDeleteProjectSchedule } from "../api";
import type { ProjectScheduleDTO } from "../types";
import { format, parseISO } from "./utils";

const POPOVER_WIDTH = 320;

type SchedulePopoverProps = {
  anchorRect: DOMRect;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
} & (
  | { schedule: ProjectScheduleDTO }
  | { schedule?: undefined; startDate: string; endDate?: string; onCreate: (title: string, category: TaskCategory) => void }
);

export function SchedulePopover(props: SchedulePopoverProps) {
  const { anchorRect, containerRef, onClose } = props;
  const isEdit = !!props.schedule;

  const [title, setTitle] = useState(isEdit ? props.schedule.title : "");
  const [category, setCategory] = useState<TaskCategory>(isEdit ? props.schedule.category : "development");
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const updateSchedule = useUpdateProjectSchedule();
  const deleteSchedule = useDeleteProjectSchedule();
  const dialog = useDialog();

  useEffect(() => {
    if (isEdit) {
      inputRef.current?.select();
    } else {
      inputRef.current?.focus();
    }
  }, []);

  // 외부 클릭: 수정 → 저장, 생성 → 취소
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        if (isEdit) {
          handleSave();
        } else {
          onClose();
        }
      }
    };
    const timer = setTimeout(() => document.addEventListener("mousedown", handleClickOutside), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [title, category, props.schedule]);

  const handleSave = () => {
    if (isEdit) {
      const trimmed = title.trim();
      const changes: Record<string, string> = {};
      if (trimmed && trimmed !== props.schedule.title) changes.title = trimmed;
      if (category !== props.schedule.category) changes.category = category;
      if (Object.keys(changes).length > 0) {
        updateSchedule.mutate({ id: props.schedule.id, data: changes });
      }
      onClose();
    } else {
      const trimmed = title.trim();
      if (!trimmed) {
        onClose();
        return;
      }
      props.onCreate(trimmed, category);
    }
  };

  const handleCategoryChange = (cat: TaskCategory) => {
    setCategory(cat);
    if (isEdit && cat !== props.schedule.category) {
      updateSchedule.mutate({ id: props.schedule.id, data: { category: cat } });
    }
  };

  const handleDelete = () => {
    if (!isEdit) return;
    dialog.confirm({
      title: "일정 삭제",
      description: `"${props.schedule.title}" 일정을 삭제하시겠습니까?`,
      variant: "destructive",
      confirmText: "삭제",
      onConfirm: async () => {
        await deleteSchedule.mutateAsync(props.schedule.id);
        onClose();
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  // 위치 계산
  const containerRect = containerRef.current?.getBoundingClientRect();
  const minLeft = containerRect?.left ?? 0;
  const maxRight = containerRect?.right ?? window.innerWidth;

  const spaceBelow = window.innerHeight - anchorRect.bottom;
  const showAbove = spaceBelow < 200;

  const top = showAbove ? undefined : anchorRect.bottom + 4;
  const bottom = showAbove ? window.innerHeight - anchorRect.top + 4 : undefined;
  const left = Math.max(minLeft, Math.min(anchorRect.left, maxRight - POPOVER_WIDTH));

  // 하단 날짜 표시
  const dateLabel = (() => {
    if (isEdit) {
      const s = props.schedule.startDate;
      const e = props.schedule.endDate;
      return e ? `${s} ~ ${e}` : s;
    }
    const s = parseISO(props.startDate);
    if (props.endDate) {
      const e = parseISO(props.endDate);
      return `${format(s, "M/d")} ~ ${format(e, "M/d")}`;
    }
    return format(s, "M/d");
  })();

  return (
    <div className="fixed inset-0 z-50" data-gantt-bar>
      <div
        ref={popoverRef}
        className="fixed bg-popover border border-border rounded-lg shadow-lg p-3 space-y-3"
        style={{ top, bottom, left, width: POPOVER_WIDTH }}
      >
        {/* 제목 */}
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isEdit ? undefined : "일정 제목 입력 후 Enter"}
          className={cn(
            "w-full text-sm px-2 py-1.5 rounded-md border border-border bg-background outline-none focus:ring-1 focus:ring-primary/30",
            !isEdit && "placeholder:text-muted-foreground/60",
          )}
        />

        {/* 카테고리 선택 */}
        <div className="flex flex-wrap gap-1.5">
          {TASK_CATEGORIES.map((cat) => {
            const config = getCategoryConfig(cat);
            return (
              <button
                key={cat}
                type="button"
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors cursor-pointer",
                  category === cat
                    ? "bg-accent ring-1 ring-primary/30 font-medium"
                    : "hover:bg-accent/50"
                )}
                onClick={() => handleCategoryChange(cat)}
              >
                <span className={cn("size-2.5 rounded-full shrink-0", config.dot)} />
                {config.label}
              </button>
            );
          })}
        </div>

        {/* 하단: 날짜 + 액션 */}
        <div className="flex justify-between items-center pt-1 border-t border-border">
          <span className="text-xs text-muted-foreground">{dateLabel}</span>
          {isEdit && (
            <Button variant="ghost" size="icon-xs" onClick={handleDelete}>
              <Trash2Icon className="size-3.5 text-destructive" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
