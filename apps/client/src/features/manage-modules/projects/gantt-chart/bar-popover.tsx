import { useState, useRef, useEffect } from "react";
import { Trash2Icon } from "lucide-react";
import { cn } from "@/shared/utils/classnames";
import { Button } from "@/shared/ui/button";
import { useDialog } from "@/shared/ui/app-dialog";
import { SCHEDULE_COLORS, getColorConfig } from "../../schedules/constants";
import { useUpdateSchedule, useDeleteSchedule } from "../../schedules/api";
import type { ScheduleDTO } from "../../schedules/types";

interface BarPopoverProps {
  schedule: ScheduleDTO;
  anchorRect: DOMRect;
  onClose: () => void;
}

export function BarPopover({ schedule, anchorRect, onClose }: BarPopoverProps) {
  const [title, setTitle] = useState(schedule.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();
  const dialog = useDialog();

  const currentColor = getColorConfig(schedule.color);

  // 포커스
  useEffect(() => {
    inputRef.current?.select();
  }, []);

  // 외부 클릭 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        handleSave();
      }
    };
    // 한 틱 뒤에 등록 (클릭 이벤트 버블링 방지)
    const timer = setTimeout(() => document.addEventListener("mousedown", handleClickOutside), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [title, schedule]);

  const handleSave = () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== schedule.title) {
      updateSchedule.mutate({ id: schedule.id, data: { title: trimmed } });
    }
    onClose();
  };

  const handleColorChange = (colorKey: string) => {
    if (colorKey !== schedule.color) {
      updateSchedule.mutate({ id: schedule.id, data: { color: colorKey } });
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

  // 위치 계산: 바 아래에 표시
  const top = anchorRect.bottom + 4;
  const left = anchorRect.left;

  return (
    <div className="fixed inset-0 z-50" data-gantt-bar>
      <div
        ref={popoverRef}
        className="fixed bg-popover border border-border rounded-lg shadow-lg p-3 w-56 space-y-3"
        style={{ top, left }}
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

        {/* 색상 선택 */}
        <div className="flex flex-wrap gap-1.5">
          {SCHEDULE_COLORS.map((c) => (
            <button
              key={c.key}
              type="button"
              className={cn(
                "size-5 rounded-full transition-transform cursor-pointer",
                c.dot,
                schedule.color === c.key && "ring-2 ring-offset-2 ring-offset-popover ring-primary scale-110"
              )}
              onClick={() => handleColorChange(c.key)}
              title={c.label}
            />
          ))}
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
