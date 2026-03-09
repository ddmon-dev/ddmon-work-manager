import { Link } from "react-router";
import { CalendarDays, ArrowRight } from "lucide-react";
import { useUpcomingSchedules, type ScheduleItem } from "./api";

const COLOR_MAP: Record<string, string> = {
  default: "bg-primary",
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
  gray: "bg-gray-400",
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

function formatTimeRange(
  startTime: string | null,
  endTime: string | null
): string | null {
  if (!startTime) return null;
  const start = startTime.slice(0, 5);
  if (!endTime) return start;
  return `${start} ~ ${endTime.slice(0, 5)}`;
}

function ScheduleRow({
  item,
  showDate,
}: {
  item: ScheduleItem;
  showDate?: boolean;
}) {
  const colorClass = COLOR_MAP[item.color] ?? "bg-primary";
  const timeStr = formatTimeRange(item.startTime, item.endTime);

  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className={`mt-1.5 size-2 rounded-full shrink-0 ${colorClass}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {showDate && <span>{formatDate(item.startDate)}</span>}
          {timeStr ? (
            <span>{timeStr}</span>
          ) : (
            !showDate && <span>종일</span>
          )}
        </div>
      </div>
    </div>
  );
}

function ScheduleSection({
  label,
  items,
  showDate,
}: {
  label: string;
  items: ScheduleItem[];
  showDate?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <span className="inline-block text-xs font-medium text-muted-foreground bg-muted rounded-md px-2 py-1 mb-1.5">
        {label}
      </span>
      <div className="divide-y divide-border">
        {items.map((item) => (
          <ScheduleRow key={item.id} item={item} showDate={showDate} />
        ))}
      </div>
    </div>
  );
}

export function UpcomingSchedules() {
  const { data, isLoading } = useUpcomingSchedules();

  if (isLoading) return null;

  const today = data?.today ?? [];
  const thisWeek = data?.thisWeek ?? [];
  const upcoming = data?.upcoming ?? [];
  const isEmpty =
    today.length === 0 && thisWeek.length === 0 && upcoming.length === 0;

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">일정</h3>
        </div>
        <Link
          to="/schedules"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          전체 보기 <ArrowRight className="size-3" />
        </Link>
      </div>

      {isEmpty ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          예정된 일정이 없습니다.
        </p>
      ) : (
        <div className="space-y-5">
          <ScheduleSection label="오늘" items={today} />
          <ScheduleSection label="이번 주" items={thisWeek} showDate />
          <ScheduleSection label="다가오는 일정" items={upcoming} showDate />
        </div>
      )}
    </div>
  );
}
