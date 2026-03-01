import { Skeleton } from '@/shared/ui/skeleton';

export function FormSkeleton() {
  return (
    <div className="space-y-6 py-4 flex-1 flex flex-col">
      {/* 라디오 그룹 */}
      <div className="space-y-3 flex-0">
        <Skeleton className="h-4 w-16" />
        <div className="flex gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="size-4 rounded-full" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      </div>

      {/* 날짜 선택기 */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-9 w-48" />
      </div>

      {/* 숫자 입력 */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-9 w-32" />
      </div>

      {/* 에디터 */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-10" />
        <Skeleton className="h-[200px] w-full rounded-lg" />
      </div>

      {/* 파일 업로드 (썸네일) */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 p-4 pb-0 border-t mt-auto sticky bottom-0 bg-background md:rounded-b-xl z-50 -mx-4 md:-mx-8">
        <Skeleton className="h-9 w-16" />
        <Skeleton className="h-9 w-16" />
      </div>
    </div>
  );
}
