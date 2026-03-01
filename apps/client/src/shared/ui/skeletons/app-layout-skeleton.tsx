import { Skeleton } from "@/shared/ui/skeleton";

export function AppLayoutSkeleton() {
  return (
    <div className="flex h-dvh w-full bg-sidebar">
      {/* 사이드바 — 실제 WIDTH: 20rem */}
      <div className="hidden md:flex flex-col w-80 shrink-0 border-r border-sidebar-border p-2 gap-0.5">

        {/* 헤더: 로고 + 타이틀/설명 */}
        <div className="flex items-center gap-2.5 px-2 py-3 mb-1">
          <Skeleton className="size-8 rounded-lg shrink-0" />
          <div className="flex flex-col gap-1.5 flex-1">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-2.5 w-36" />
          </div>
        </div>

        {/* 그룹 레이블 */}
        <Skeleton className="h-2.5 w-16 mx-2 mb-1 opacity-50" />

        {/* 메뉴 아이템 5개 — 아이콘 + 텍스트 + 화살표 */}
        <div className="flex flex-col gap-0.5 px-1">
          {[36, 28, 44, 32, 40].map((w, i) => (
            <div key={i} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md">
              <Skeleton className="size-4 rounded-sm shrink-0" />
              <Skeleton className={`h-3.5 w-${w}`} />
              <Skeleton className="size-3 ml-auto shrink-0 opacity-40" />
            </div>
          ))}
        </div>

        {/* 푸터: nav-user + 투두/테마 버튼 */}
        <div className="mt-auto flex flex-col gap-1 px-1 pb-1">
          {/* nav-user */}
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-md">
            <Skeleton className="size-8 rounded-full shrink-0" />
            <div className="flex flex-col gap-1.5 flex-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-2.5 w-14" />
            </div>
            <Skeleton className="size-4 shrink-0 opacity-40" />
          </div>
          {/* 투두 + 테마 토글 */}
          <div className="flex gap-1">
            <Skeleton className="h-8 flex-1 rounded-md" />
            <Skeleton className="size-8 rounded-md shrink-0" />
          </div>
        </div>
      </div>

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {/* 페이지 헤더: 사이드바 트리거 + breadcrumb */}
        <div className="h-12 border-b px-4 flex items-center gap-2.5">
          <Skeleton className="size-7 rounded-md shrink-0" />
          <Skeleton className="h-4 w-px" />
          <Skeleton className="h-3.5 w-20" />
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 p-6 flex flex-col gap-5">
          {/* 상단 액션바: 검색 + 버튼 */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-64 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md ml-auto" />
          </div>

          {/* 테이블 헤더 행 */}
          <div className="flex items-center gap-4 px-3 py-2 border-b">
            <Skeleton className="size-4 rounded-sm shrink-0" />
            {[80, 120, 96, 64, 72].map((w, i) => (
              <Skeleton key={i} className={`h-3 w-${w} shrink-0`} />
            ))}
          </div>

          {/* 테이블 데이터 행 */}
          <div className="flex flex-col divide-y">
            {[
              [100, 160, 80, 56, 64],
              [88,  144, 96, 48, 72],
              [112, 128, 88, 64, 56],
              [96,  152, 72, 56, 68],
              [104, 136, 92, 60, 76],
            ].map((widths, i) => (
              <div key={i} className="flex items-center gap-4 px-3 py-3">
                <Skeleton className="size-4 rounded-sm shrink-0" />
                {widths.map((w, j) => (
                  <Skeleton key={j} className={`h-3.5 w-${w} shrink-0`} />
                ))}
              </div>
            ))}
          </div>

          {/* 페이지네이션 */}
          <div className="flex items-center justify-between pt-1">
            <Skeleton className="h-3.5 w-24" />
            <div className="flex gap-1.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="size-8 rounded-md" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
