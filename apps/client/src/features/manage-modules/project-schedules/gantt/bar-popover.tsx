import { useState, useRef, useEffect } from "react";
import { Trash2Icon } from "lucide-react";
import { cn } from "@/shared/utils/classnames";
import { Button } from "@/shared/ui/button";
import { useDialog } from "@/shared/ui/app-dialog";
import { TASK_CATEGORIES } from "@packages/schemas";
import { TASK_CATEGORY_CONFIG, getCategoryConfig } from "../constants";
import { useUpdateProjectSchedule, useDeleteProjectSchedule } from "../api";
import type { ProjectScheduleDTO } from "../types";

const POPOVER_WIDTH = 280;

interface BarPopoverProps {
  schedule: ProjectScheduleDTO;
  anchorRect: DOMRect;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

export function BarPopover({ schedule, anchorRect, containerRef, onClose }: BarPopoverProps) {
  const [title, setTitle] = useState(schedule.title);
  const [category, setCategory] = useState(schedule.category);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const updateSchedule = useUpdateProjectSchedule();
  const deleteSchedule = useDeleteProjectSchedule();
  const dialog = useDialog();

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        handleSave();
      }
    };
    const timer = setTimeout(() => document.addEventListener("mousedown", handleClickOutside), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [title, category, schedule]);

  const handleSave = () => {
    const trimmed = title.trim();
    const changes: Record<string, string> = {};
    if (trimmed && trimmed !== schedule.title) changes.title = trimmed;
    if (category !== schedule.category) changes.category = category;

    if (Object.keys(changes).length > 0) {
      updateSchedule.mutate({ id: schedule.id, data: changes });
    }
    onClose();
  };

  const handleCategoryChange = (cat: typeof category) => {
    setCategory(cat);
    if (cat !== schedule.category) {
      updateSchedule.mutate({ id: schedule.id, data: { category: cat } });
    }
  };

  const handleDelete = () => {
    dialog.confirm({
      title: "일정 삭제",
      description: `"${schedule.title}" 일정을 삭제하시겠습니까?`,
      variant: "destructive",
      confirmText: "삭제",
      onConfirm: async () => {
        await deleteSchedule.mutateAsync(schedule.id);
        onClose();
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const containerRect = containerRef.current?.getBoundingClientRect();
  const minLeft = containerRect?.left ?? 0;
  const maxRight = containerRect?.right ?? window.innerWidth;
  const top = anchorRect.bottom + 4;
  const left = Math.max(minLeft, Math.min(anchorRect.left, maxRight - POPOVER_WIDTH));

  return (
    <div className="fixed inset-0 z-50" data-gantt-bar>
      <div
        ref={popoverRef}
        className="fixed bg-popover border border-border rounded-lg shadow-lg p-3 space-y-3"
        style={{ top, left, width: POPOVER_WIDTH }}
      >
        {/* 제목 편집 */}
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full text-sm px-2 py-1.5 rounded-md border border-border bg-background outline-none focus:ring-1 focus:ring-primary/30"
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

        {/* 삭제 */}
        <div className="flex justify-between items-center pt-1 border-t border-border">
          <span className="text-xs text-muted-foreground">
            {schedule.startDate}
            {schedule.endDate && ` ~ ${schedule.endDate}`}
          </span>
          <Button variant="ghost" size="icon-xs" onClick={handleDelete}>
            <Trash2Icon className="size-3.5 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
}
