import { Skeleton } from "../skeleton";

export function DetailSkeleton() {
  return (
    <div role="status" aria-label="상세 정보를 불러오고 있습니다" className="space-y-8 py-4">
      <div aria-hidden="true" className="space-y-8">
        <div className="space-y-3"><Skeleton className="h-7 w-2/3" /><Skeleton className="h-4 w-1/3" /></div>
        <div className="grid grid-cols-2 gap-6">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-5 w-3/4" /></div>)}
        </div>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
