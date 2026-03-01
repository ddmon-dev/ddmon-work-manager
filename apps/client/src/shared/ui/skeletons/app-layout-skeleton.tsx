import { Skeleton } from "@/shared/ui/skeleton";

export function AppLayoutSkeleton() {
  return (
    <div className="flex h-dvh w-full bg-sidebar">
      {/* 사이드바 */}
      <div className="hidden md:flex flex-col w-80 shrink-0 border-r border-sidebar-border px-3 py-4 gap-6">
        {/* 헤더 */}
        <Skeleton className="h-9 w-full rounded-lg" />

        {/* 메뉴 */}
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-16 mb-1 opacity-40" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </div>

        {/* 푸터 */}
        <div className="mt-auto flex flex-col gap-2">
          <Skeleton className="h-12 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      </div>

      {/* 메인 */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {/* 헤더 */}
        <div className="h-12 border-b px-5 flex items-center gap-3">
          <Skeleton className="size-7 rounded-md shrink-0" />
          <Skeleton className="h-4 w-32" />
        </div>

        {/* 콘텐츠 */}
        <div className="p-6 flex flex-col gap-4">
          <div className="flex gap-3">
            <Skeleton className="h-9 w-56 rounded-md" />
            <Skeleton className="h-9 w-20 rounded-md ml-auto" />
          </div>
          <Skeleton className="h-10 w-full rounded-md opacity-60" />
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}
