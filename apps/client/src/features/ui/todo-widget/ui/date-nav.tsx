import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useTodo } from "../context";

export function DateNav() {
  const { date, setDate } = useTodo();

  const isToday = date.toDateString() === new Date().toDateString();

  const goToPrev = () => {
    const prev = new Date(date);
    prev.setDate(prev.getDate() - 1);
    setDate(prev);
  };

  const goToNext = () => {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    setDate(next);
  };

  const goToToday = () => setDate(new Date());

  const formatted = date.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" onClick={goToPrev} className="h-7 w-7">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium min-w-[7rem] text-center">
        {formatted}
      </span>
      <Button variant="ghost" size="icon" onClick={goToNext} className="h-7 w-7">
        <ChevronRight className="h-4 w-4" />
      </Button>
      {!isToday && (
        <Button
          variant="outline"
          size="sm"
          onClick={goToToday}
          className="h-7 text-xs ml-1"
        >
          오늘
        </Button>
      )}
    </div>
  );
}
