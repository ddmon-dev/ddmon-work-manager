import { Skeleton } from '@/shared/ui/skeleton';

export function AppLayoutSkeleton() {
  return (
    <div className="flex h-dvh w-full bg-sidebar">
      {/* 사이드바 — 20rem */}
      <div className="hidden md:flex flex-col w-80 shrink-0 border-r border-sidebar-border">
        {/* 헤더 — 69px */}
        <div className="h-[69px] px-4 flex items-center gap-2.5 border-b border-sidebar-border">
          <Skeleton className="size-8 rounded-lg shrink-0" />
          <Skeleton className="h-5 w-28" />
        </div>

        {/* 네비 메뉴 */}
        <div className="flex-1 py-7 px-5 gap-3 flex flex-col">
          <Skeleton className="h-2.5 w-16" />
          <div className="flex flex-col gap-2">
            {['w-5/6', 'w-2/3', 'w-11/12', 'w-3/5', 'w-3/4'].map((w, i) => (
              <Skeleton key={i} className={`h-8 ${w}`} />
            ))}
          </div>
        </div>

        {/* 푸터 */}
        <div className="p-4 border-t border-sidebar-border flex flex-col gap-2">
          <div className="h-12 flex items-center gap-2.5 px-2">
            <Skeleton className="size-8 rounded-full shrink-0" />
            <Skeleton className="h-4 flex-1" />
          </div>
          <Skeleton className="h-9 w-full rounded-full" />
          <Skeleton className="h-9 w-full rounded-full" />
        </div>
      </div>

      {/* 메인 */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {/* 헤더 — 69px */}
        <div className="h-[69px] border-b px-4 flex items-center gap-3">
          <Skeleton className="size-7 rounded-md shrink-0" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-9 w-24 rounded-md ml-auto" />
        </div>

        {/* 콘텐츠 */}
        <div className="p-6 flex flex-col gap-4">
          <Skeleton className="h-9 w-56 rounded-md" />
          <div className="flex flex-col gap-2">
            {[
              'w-[48%]',
              'w-[38%]',
              'w-[45%]',
              'w-[33%]',
              'w-[42%]',
              'w-[36%]',
            ].map((w, i) => (
              <Skeleton key={i} className={`h-11 ${w} rounded-md`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
