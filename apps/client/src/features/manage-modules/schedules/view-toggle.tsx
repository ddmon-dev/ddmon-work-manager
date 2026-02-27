import { useSearchParams } from "react-router";
import { CalendarDays, List } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/utils/classnames";

export type ScheduleViewMode = "calendar" | "list";

export function ViewToggle() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = (searchParams.get("view") as ScheduleViewMode) || "calendar";

  function setView(mode: ScheduleViewMode) {
    setSearchParams((prev) => {
      if (mode === "calendar") {
        prev.delete("view");
      } else {
        prev.set("view", mode);
      }
      return prev;
    });
  }

  return (
    <div className="flex items-center border rounded-lg p-0.5">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 px-2.5 gap-1.5",
          view === "calendar" && "bg-muted"
        )}
        onClick={() => setView("calendar")}
      >
        <CalendarDays className="size-4" />
        <span className="text-xs">캘린더</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn("h-7 px-2.5 gap-1.5", view === "list" && "bg-muted")}
        onClick={() => setView("list")}
      >
        <List className="size-4" />
        <span className="text-xs">리스트</span>
      </Button>
    </div>
  );
}
