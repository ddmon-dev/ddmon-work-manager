import { Skeleton } from "@/shared/ui/skeleton";

export function AppLayoutSkeleton() {
  return (
    <div className="flex h-dvh w-full bg-sidebar">
      {/* 사이드바 — 20rem */}
      <div className="hidden md:flex flex-col w-80 shrink-0 border-r border-sidebar-border">

        {/* 헤더 — 69px */}
        <div className="h-[69px] px-4 flex items-center border-b border-sidebar-border">
          <div className="flex items-center gap-2.5 w-full">
            <Skeleton className="size-8 rounded-lg shrink-0" />
            <div className="flex flex-col gap-1.5 flex-1">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-2.5 w-36" />
            </div>
          </div>
        </div>

        {/* 네비 메뉴 — SidebarGroup px-3, GroupLabel h-8, MenuButton h-8 */}
        <div className="flex-1 py-4 px-3">
          <div className="h-8 flex items-center px-2">
            <Skeleton className="h-2.5 w-16" />
          </div>
          <div className="flex flex-col gap-1">
            {["w-5/6", "w-2/3", "w-11/12", "w-3/5", "w-3/4"].map((w, i) => (
              <div key={i} className="h-10 flex items-center px-2">
                <Skeleton className={`h-4 ${w}`} />
              </div>
            ))}
          </div>
        </div>

        {/* 푸터 — SidebarFooter p-4 border-t gap-2 */}
        <div className="p-4 border-t border-sidebar-border flex flex-col gap-2">
          {/* NavUser — size="lg" → h-12 */}
          <div className="h-12 flex items-center gap-2.5 px-2">
            <Skeleton className="size-8 rounded-full shrink-0" />
            <div className="flex flex-col gap-1.5 flex-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-2.5 w-14" />
            </div>
            <Skeleton className="size-4 shrink-0 opacity-30" />
          </div>
          {/* TodoTrigger — w-full rounded-full */}
          <Skeleton className="h-9 w-full rounded-full" />
          {/* ThemeToggle — w-full rounded-full 3분할 */}
          <Skeleton className="h-9 w-full rounded-full" />
        </div>
      </div>

      {/* 메인 */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {/* AppHeader — min-h-[69px] border-b */}
        <div className="h-[69px] border-b px-4 flex items-center gap-3">
          <Skeleton className="size-7 rounded-md shrink-0" />
          <Skeleton className="h-4 w-px mx-1" />
          <Skeleton className="h-5 w-28" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-20 rounded-md" />
          </div>
        </div>

        {/* 콘텐츠 */}
        <div className="p-6 flex flex-col gap-4">
          {/* 검색 + 버튼 */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-60 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md ml-auto" />
          </div>

          {/* 테이블 헤더 */}
          <Skeleton className="h-10 w-full rounded-md" />

          {/* 데이터 행 — 넓은 것부터 불규칙하게 좁아짐 */}
          <div className="flex flex-col gap-2">
            {["w-full", "w-[92%]", "w-[96%]", "w-[85%]", "w-[89%]", "w-[74%]"].map((w, i) => (
              <Skeleton key={i} className={`h-14 ${w} rounded-md`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
