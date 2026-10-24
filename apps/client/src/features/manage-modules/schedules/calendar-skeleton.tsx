import { Skeleton } from "@/shared/ui/skeleton";

export function CalendarSkeleton() {
  return (
    <div aria-hidden="true" className="grid grid-cols-7 gap-y-0.5 px-1 pb-0.5">
      <Skeleton className="col-start-2 col-span-3 h-5 rounded-sm mr-1" />
      <Skeleton className="col-start-6 h-5 rounded-sm mr-1" />
      <Skeleton className="col-start-4 col-span-2 h-5 rounded-sm mr-1" />
    </div>
  );
}
