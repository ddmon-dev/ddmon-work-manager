import { Skeleton } from "@/shared/ui/skeleton";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function CalendarSkeleton() {
  return (
    <div className="flex flex-col gap-4 flex-1 pb-12">
      {/* 네비게이션 바 */}
      <div className="flex items-center gap-2">
        <Skeleton className="size-8 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
        <Skeleton className="size-8 rounded-md" />
      </div>

      {/* 캘린더 그리드 */}
      <div className="border rounded-lg overflow-hidden flex flex-col flex-1">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 border-b">
          {WEEKDAYS.map((day, i) => (
            <div
              key={day}
              className={`text-center text-xs font-medium py-2 ${
                i === 0
                  ? "text-red-500"
                  : i === 6
                    ? "text-blue-500"
                    : "text-muted-foreground"
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 주 행 (5주) */}
        <div
          className="grid flex-1"
          style={{ gridTemplateRows: "repeat(5, 1fr)" }}
        >
          {Array.from({ length: 5 }).map((_, weekIdx) => (
            <div
              key={weekIdx}
              className="grid grid-cols-7 border-b last:border-b-0"
            >
              {Array.from({ length: 7 }).map((_, dayIdx) => (
                <div
                  key={dayIdx}
                  className="border-r last:border-r-0 p-1 min-h-0"
                >
                  <Skeleton className="h-4 w-5 mb-1" />
                  {weekIdx === 1 && dayIdx >= 1 && dayIdx <= 4 && (
                    <Skeleton className="h-5 w-full rounded-sm" />
                  )}
                  {weekIdx === 2 && dayIdx === 0 && (
                    <Skeleton className="h-5 w-full rounded-sm" />
                  )}
                  {weekIdx === 3 && dayIdx >= 2 && dayIdx <= 3 && (
                    <Skeleton className="h-5 w-full rounded-sm" />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
