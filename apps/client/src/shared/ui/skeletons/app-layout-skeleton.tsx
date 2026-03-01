import { Skeleton } from "@/shared/ui/skeleton";

// 메뉴 아이템별 텍스트 너비 (실제 메뉴명 길이 반영)
const NAV_ITEMS = [
  { textW: "w-28" }, // 클라이언트 관리
  { textW: "w-24" }, // 견적서 관리
  { textW: "w-24" }, // 프로젝트 관리
  { textW: "w-20" }, // 일정 관리
  { textW: "w-28" }, // 매출/수금 통계
];

// 테이블 행별 셀 너비 변화 (단조로움 방지)
const TABLE_ROWS = [
  ["w-24", "w-40", "w-20", "w-28", "w-16"],
  ["w-32", "w-28", "w-28", "w-20", "w-24"],
  ["w-20", "w-36", "w-24", "w-24", "w-20"],
  ["w-28", "w-32", "w-16", "w-32", "w-16"],
  ["w-24", "w-44", "w-20", "w-20", "w-24"],
  ["w-32", "w-24", "w-28", "w-28", "w-16"],
];

export function AppLayoutSkeleton() {
  return (
    <div className="flex h-dvh w-full bg-sidebar">
      {/* 사이드바 — w-80 = 20rem (APP_CONFIG.UI.SIDEBAR.WIDTH) */}
      <div className="hidden md:flex flex-col w-80 shrink-0 border-r border-sidebar-border">

        {/* 헤더: SidebarHeader p-4 border-b */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-8 rounded-lg shrink-0" />
            <div className="flex flex-col gap-1.5 flex-1">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-2.5 w-36" />
            </div>
          </div>
        </div>

        {/* 콘텐츠: SidebarContent → NavMenu py-4 gap-4 → SidebarGroup px-3 */}
        <div className="flex-1 py-4 px-3">
          {/* SidebarGroupLabel h-8 */}
          <div className="h-8 flex items-center px-2 mb-0.5">
            <Skeleton className="h-2.5 w-20" />
          </div>
          {/* SidebarMenuButton h-8 */}
          <div className="flex flex-col gap-0.5">
            {NAV_ITEMS.map((item, i) => (
              <div key={i} className="h-8 flex items-center gap-2 px-2 rounded-md">
                <Skeleton className="size-4 shrink-0" />
                <Skeleton className={`h-3 ${item.textW}`} />
                <Skeleton className="size-3 ml-auto shrink-0 opacity-30" />
              </div>
            ))}
          </div>
        </div>

        {/* 푸터: SidebarFooter p-4 border-t gap-2 */}
        <div className="p-4 border-t border-sidebar-border flex flex-col gap-2">
          {/* NavUser: SidebarMenuButton size="lg" → h-12 */}
          <div className="h-12 flex items-center gap-2.5 px-2 rounded-md">
            <Skeleton className="size-8 rounded-full shrink-0" />
            <div className="flex flex-col gap-1.5 flex-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-2.5 w-14" />
            </div>
            <Skeleton className="size-4 shrink-0 opacity-30" />
          </div>
          {/* TodoTrigger + ThemeToggle */}
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1 rounded-md" />
            <Skeleton className="size-9 rounded-md shrink-0" />
          </div>
        </div>
      </div>

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {/* AppHeader: min-h-[69px] border-b */}
        <div className="min-h-[69px] border-b px-4 flex items-center gap-2">
          <Skeleton className="size-7 rounded-md shrink-0" />
          <Skeleton className="h-4 w-px mx-2" />
          <Skeleton className="h-5 w-32" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-9 w-28 rounded-md" />
            <Skeleton className="h-9 w-20 rounded-md" />
          </div>
        </div>

        {/* 콘텐츠 영역 */}
        <div className="p-6 flex flex-col gap-4">
          {/* 검색바 */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-60 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>

          {/* 테이블 헤더 행 */}
          <div className="flex items-center gap-6 h-10 px-4 border-b">
            <Skeleton className="size-4 shrink-0" />
            <Skeleton className="h-3 w-24 shrink-0" />
            <Skeleton className="h-3 w-32 shrink-0" />
            <Skeleton className="h-3 w-20 shrink-0" />
            <Skeleton className="h-3 w-20 ml-auto shrink-0" />
          </div>

          {/* 데이터 행 */}
          <div className="flex flex-col divide-y divide-border">
            {TABLE_ROWS.map((cells, i) => (
              <div key={i} className="flex items-center gap-6 h-14 px-4">
                <Skeleton className="size-4 shrink-0" />
                {cells.map((w, j) => (
                  <Skeleton key={j} className={`h-4 ${w} shrink-0`} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
