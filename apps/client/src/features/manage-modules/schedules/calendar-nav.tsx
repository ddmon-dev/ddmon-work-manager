import { useState } from "react";
import { useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/popover";
import { cn } from "@/shared/utils/classnames";

interface CalendarNavProps {
  year: number;
  month: number;
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function CalendarNav({ year, month }: CalendarNavProps) {
  const [, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(year);

  const now = new Date();
  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 1;

  function navigateTo(y: number, m: number) {
    setSearchParams((prev) => {
      if (y === now.getFullYear() && m === now.getMonth() + 1) {
        prev.delete("year");
        prev.delete("month");
      } else {
        prev.set("year", String(y));
        prev.set("month", String(m));
      }
      return prev;
    });
  }

  function navigate(direction: -1 | 1) {
    let newMonth = month + direction;
    let newYear = year;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    navigateTo(newYear, newMonth);
  }

  function handleMonthSelect(m: number) {
    navigateTo(pickerYear, m);
    setOpen(false);
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="size-8"
        onClick={() => navigate(-1)}
      >
        <ChevronLeft className="size-4" />
      </Button>

      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o) setPickerYear(year);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="text-base font-semibold px-3 h-8"
          >
            {year}년 {month}월
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          {/* 연도 선택 */}
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setPickerYear((prev) => prev - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-semibold">{pickerYear}년</span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setPickerYear((prev) => prev + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          {/* 월 그리드 */}
          <div className="grid grid-cols-4 gap-1">
            {MONTHS.map((m) => {
              const isSelected = pickerYear === year && m === month;
              const isCurrent =
                pickerYear === now.getFullYear() && m === now.getMonth() + 1;
              return (
                <button
                  key={m}
                  type="button"
                  className={cn(
                    "h-8 rounded-md text-sm transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted",
                    !isSelected && isCurrent && "font-semibold text-primary"
                  )}
                  onClick={() => handleMonthSelect(m)}
                >
                  {m}월
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="icon"
        className="size-8"
        onClick={() => navigate(1)}
      >
        <ChevronRight className="size-4" />
      </Button>

      {!isCurrentMonth && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs ml-1"
          onClick={() => navigateTo(now.getFullYear(), now.getMonth() + 1)}
        >
          오늘
        </Button>
      )}
    </div>
  );
}
