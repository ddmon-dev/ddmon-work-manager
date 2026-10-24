import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/utils/classnames";

export function FileListSkeleton({ compact = false, rows = 6 }: { compact?: boolean; rows?: number }) {
  return (
    <div role="status" aria-label="파일 목록을 불러오고 있습니다" className="divide-y border-b">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} aria-hidden="true" className={cn("flex items-center gap-3 py-3", compact ? "px-3" : "px-4")}>
          <Skeleton className={cn("shrink-0 rounded-sm", compact ? "size-4" : "size-5")} />
          <div className="min-w-0 flex-1"><Skeleton className={cn("h-5 max-w-full", i % 2 ? "w-40" : "w-56")} /></div>
          <div className={compact ? "hidden w-16 shrink-0 md:block" : "w-24 shrink-0"}><Skeleton className="ml-auto h-3 w-12" /></div>
          <div className={compact ? "hidden w-20 shrink-0 md:block" : "w-28 shrink-0"}><Skeleton className="ml-auto h-3 w-20" /></div>
        </div>
      ))}
    </div>
  );
}
