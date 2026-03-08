import { useState, useRef, useEffect } from "react";
import { Trash2Icon } from "lucide-react";
import { cn } from "@/shared/utils/classnames";
import { Button } from "@/shared/ui/button";
import { useDialog } from "@/shared/ui/app-dialog";
import { TASK_CATEGORIES } from "@packages/schemas";
import type { TaskCategory } from "@packages/schemas";
import { PRESET_COLORS, CUSTOM_COLOR_PALETTE, getCategoryConfig } from "../constants";
import { useUpdateProjectSchedule, useDeleteProjectSchedule } from "../api";
import type { ProjectScheduleDTO } from "../types";
import { format, parseISO } from "./utils";

const POPOVER_WIDTH = 440;

type SchedulePopoverProps = {
  anchorRect: DOMRect;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
} & (
  | { schedule: ProjectScheduleDTO }
  | { schedule?: undefined; startDate: string; endDate?: string; onCreate: (title: string, category: string, categoryColor: string | null) => void }
);

export function SchedulePopover(props: SchedulePopoverProps) {
  const { anchorRect, containerRef, onClose } = props;
  const isEdit = !!props.schedule;

  const [title, setTitle] = useState(isEdit ? props.schedule.title : "");
  const [category, setCategory] = useState<string>(isEdit ? props.schedule.category : "development");
  const [categoryColor, setCategoryColor] = useState<string | null>(isEdit ? props.schedule.categoryColor ?? null : null);
  const [showCustom, setShowCustom] = useState<boolean>(isEdit && !PRESET_COLORS[props.schedule.category as TaskCategory]);
  const [customName, setCustomName] = useState(
    isEdit && !PRESET_COLORS[props.schedule.category as TaskCategory] ? props.schedule.category : ""
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const customNameRef = useRef<HTMLInputElement>(null);
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
  }, [title, category, categoryColor, customName, props.schedule]);

  const [titleError, setTitleError] = useState(false);
  const [customNameError, setCustomNameError] = useState(false);

  const handleSave = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError(true);
      inputRef.current?.focus();
      return;
    }
    setTitleError(false);

    if (showCustom && !customName.trim()) {
      setCustomNameError(true);
      customNameRef.current?.focus();
      return;
    }
    setCustomNameError(false);

    const effectiveCategory = showCustom ? customName.trim() : category;
    const effectiveColor = showCustom ? categoryColor : null;

    if (isEdit) {
      const changes: Record<string, unknown> = {};
      if (trimmed !== props.schedule.title) changes.title = trimmed;
      if (effectiveCategory !== props.schedule.category) changes.category = effectiveCategory;
      if (effectiveColor !== props.schedule.categoryColor) changes.categoryColor = effectiveColor;
      if (Object.keys(changes).length > 0) {
        updateSchedule.mutate({ id: props.schedule.id, data: changes });
      }
      onClose();
    } else {
      props.onCreate(trimmed, effectiveCategory, effectiveColor);
    }
  };

  const handlePresetSelect = (cat: TaskCategory) => {
    setCategory(cat);
    setCategoryColor(null);
    setShowCustom(false);
    if (isEdit && cat !== props.schedule.category) {
      updateSchedule.mutate({ id: props.schedule.id, data: { category: cat, categoryColor: null } });
    }
  };

  const handleCustomToggle = () => {
    setShowCustom(true);
    setCategory("custom");
    if (!categoryColor) {
      setCategoryColor(CUSTOM_COLOR_PALETTE[0]);
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
          onChange={(e) => { setTitle(e.target.value); setTitleError(false); }}
          onKeyDown={handleKeyDown}
          placeholder={isEdit ? undefined : "일정 제목"}
          className={cn(
            "w-full text-sm px-2 py-1.5 rounded-md border bg-background outline-none focus:ring-1",
            titleError
              ? "border-destructive focus:ring-destructive/30"
              : "border-border focus:ring-primary/30",
            !isEdit && "placeholder:text-muted-foreground/60",
          )}
        />

        {/* 카테고리 선택 */}
        <div className="flex flex-wrap gap-1.5">
          {TASK_CATEGORIES.map((cat) => {
            const config = getCategoryConfig(cat);
            const isSelected = !showCustom && category === cat;
            return (
              <button
                key={cat}
                type="button"
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors cursor-pointer",
                  isSelected
                    ? "bg-accent ring-1 ring-primary/30 font-medium"
                    : "hover:bg-accent/50"
                )}
                onClick={() => handlePresetSelect(cat)}
              >
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: config.color }}
                />
                {config.label}
              </button>
            );
          })}
          <button
            type="button"
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors cursor-pointer",
              showCustom
                ? "bg-accent ring-1 ring-primary/30 font-medium"
                : "hover:bg-accent/50"
            )}
            onClick={handleCustomToggle}
          >
            <span
              className="size-2.5 rounded-full shrink-0 border border-border"
              style={categoryColor && showCustom ? { backgroundColor: categoryColor } : undefined}
            />
            커스텀
          </button>
        </div>

        {/* 커스텀 카테고리 설정 */}
        {showCustom && (
          <div className="space-y-2">
            <input
              ref={customNameRef}
              type="text"
              value={customName}
              onChange={(e) => { setCustomName(e.target.value); setCustomNameError(false); }}
              onKeyDown={handleKeyDown}
              placeholder="카테고리명"
              className={cn(
                "w-full text-xs px-2 py-1.5 rounded-md border bg-background outline-none focus:ring-1 placeholder:text-muted-foreground/60",
                customNameError
                  ? "border-destructive focus:ring-destructive/30"
                  : "border-border focus:ring-primary/30",
              )}
            />
            <div className="flex flex-wrap gap-1.5">
              {CUSTOM_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cn(
                    "size-5 rounded-full cursor-pointer transition-transform",
                    categoryColor === c && "ring-2 ring-primary ring-offset-1 ring-offset-background scale-110"
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => setCategoryColor(c)}
                />
              ))}
            </div>
          </div>
        )}

        {/* 하단: 날짜 + 액션 */}
        <div className="flex items-center gap-2 pt-1 border-t border-border">
          <span className="text-xs text-muted-foreground flex-1">{dateLabel}</span>
          {isEdit && (
            <Button variant="ghost" size="icon-xs" onClick={handleDelete}>
              <Trash2Icon className="size-3.5 text-destructive" />
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onClose}>
            취소
          </Button>
          <Button size="sm" className="h-7 px-3 text-xs" onClick={handleSave}>
            저장
          </Button>
        </div>
      </div>
    </div>
  );
}
