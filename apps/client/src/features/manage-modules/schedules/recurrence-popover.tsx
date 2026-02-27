import { useState } from "react";
import { ChevronDown, Repeat } from "lucide-react";
import { DatePicker } from "@/shared/ui/date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { cn } from "@/shared/utils/classnames";
import { RECURRENCE_LABELS } from "./config";

interface RecurrencePopoverProps {
  recurrenceType: string;
  recurrenceEndDate: Date | null;
  onChangeType: (value: string) => void;
  onChangeEndDate: (value: Date | null) => void;
}

const RECURRENCE_ENTRIES = Object.entries(RECURRENCE_LABELS) as [
  string,
  string,
][];

export function RecurrencePopover({
  recurrenceType,
  recurrenceEndDate,
  onChangeType,
  onChangeEndDate,
}: RecurrencePopoverProps) {
  const [open, setOpen] = useState(false);
  const label = RECURRENCE_LABELS[recurrenceType] ?? "없음";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "h-8 w-full rounded-md px-2 text-sm text-left transition-colors bg-input/30 hover:bg-muted/50 inline-flex items-center gap-1.5",
            recurrenceType === "none"
              ? "text-muted-foreground"
              : "text-foreground"
          )}
        >
          <Repeat className="size-3.5 text-muted-foreground" />
          <span className="flex-1">{label}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-1">
          {RECURRENCE_ENTRIES.map(([key, text]) => (
            <button
              key={key}
              type="button"
              className={cn(
                "w-full text-left text-sm px-2 py-1.5 rounded-sm transition-colors",
                recurrenceType === key
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted/50"
              )}
              onClick={() => {
                onChangeType(key);
                if (key === "none") setOpen(false);
              }}
            >
              {text}
            </button>
          ))}
        </div>
        {recurrenceType !== "none" && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-2">반복 종료일</p>
            <DatePicker
              value={recurrenceEndDate}
              onValueChange={(date) => onChangeEndDate(date ?? null)}
              placeholder="무기한"
              className="h-8 text-sm w-full"
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
