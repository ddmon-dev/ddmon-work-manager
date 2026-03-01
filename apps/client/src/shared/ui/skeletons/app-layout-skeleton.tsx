import { Skeleton } from "@/shared/ui/skeleton";

export function AppLayoutSkeleton() {
  return (
    <div className="flex h-dvh w-full">
      {/* 사이드바 스켈레톤 */}
      <div className="hidden md:flex flex-col w-60 shrink-0 border-r p-4 gap-3">
        <Skeleton className="h-9 w-full" />
        <div className="mt-2 flex flex-col gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>

      {/* 메인 영역 스켈레톤 */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-14 border-b px-4 flex items-center gap-3">
          <Skeleton className="h-5 w-5 rounded-sm" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="p-6 flex flex-col gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
