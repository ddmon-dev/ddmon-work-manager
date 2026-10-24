import { Skeleton } from "@/shared/ui/skeleton";
import { COMPANY_COL_WIDTH, PROJECT_COL_WIDTH, LANE_COL_WIDTH, DAY_WIDTH, ROW_HEIGHT, HEADER_HEIGHT } from "./utils";

export function GanttSkeleton({ compact = false, rows = 6 }: { compact?: boolean; rows?: number }) {
  const columns = compact ? [120] : [COMPANY_COL_WIDTH, PROJECT_COL_WIDTH, LANE_COL_WIDTH];
  const labels = compact ? ["행"] : ["업체명", "프로젝트", "일정"];
  const gridTemplateColumns = [...columns.map(width => `${width}px`), "minmax(0, 1fr)"].join(" ");
  return (
    <div role="status" aria-label="프로젝트 일정을 불러오고 있습니다" className="min-h-0 flex-1 overflow-hidden border-b border-border">
      <div aria-hidden="true" style={{ minWidth: columns.reduce((sum, width) => sum + width, 0) + DAY_WIDTH * 7 }}>
        <div className="grid border-b" style={{ gridTemplateColumns, height: HEADER_HEIGHT }}>
          {labels.map(label => <div key={label} className="flex items-center border-r px-2 text-xs font-medium">{label}</div>)}
          <div className="grid grid-rows-2" style={{ backgroundImage: `repeating-linear-gradient(to right, transparent 0 ${DAY_WIDTH - 1}px, var(--border) ${DAY_WIDTH - 1}px ${DAY_WIDTH}px)` }}>
            <div className="flex items-center border-b px-3"><Skeleton className="h-3 w-20" /></div>
            <div className="flex items-center gap-7 px-3">{Array.from({ length: 7 }, (_, i) => <Skeleton key={i} className="h-2 w-3 shrink-0" />)}</div>
          </div>
        </div>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="grid border-b last:border-b-0" style={{ gridTemplateColumns, height: ROW_HEIGHT }}>
            {columns.map((_, col) => <div key={col} className="flex items-center border-r px-2"><Skeleton className={col === 1 ? "h-4 w-4/5" : "h-3 w-2/3"} /></div>)}
            <div className="flex items-center px-1" style={{ backgroundImage: `repeating-linear-gradient(to right, transparent 0 ${DAY_WIDTH - 1}px, var(--border) ${DAY_WIDTH - 1}px ${DAY_WIDTH}px)` }}>
              <Skeleton className="h-[26px] shrink-0 rounded-sm" style={{ width: DAY_WIDTH * (2 + i % 3), marginLeft: DAY_WIDTH * (i % 4) }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
