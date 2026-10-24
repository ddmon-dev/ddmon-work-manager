import { SheetBody, SheetContainer, SheetScrollColumn, SheetFooter } from "@/shared/ui/sheet";
import { Skeleton } from "@/shared/ui/skeleton";
import { GanttSkeleton } from "../project-schedules/gantt/gantt-skeleton";

export function ProjectDetailSkeleton() {
  return (
    <div role="status" aria-label="프로젝트 상세를 불러오고 있습니다" className="flex min-h-0 flex-1 flex-col">
      <SheetBody className="lg:grid-cols-[minmax(0,2fr)_minmax(0,7fr)_minmax(0,3fr)]" >
        <SheetScrollColumn>
          <div className="border-b px-4 md:px-8 py-3"><Skeleton className="h-7 w-full" /><Skeleton className="mt-1 h-4 w-3/4" /></div>
          <SheetContainer><InfoRows /></SheetContainer>
          <SheetContainer><Skeleton className="h-32 w-full" /></SheetContainer>
        </SheetScrollColumn>
        <SheetScrollColumn className="flex flex-col">
          <SheetContainer className="py-3"><div className="flex gap-1">{[52, 64, 64, 52].map((width, i) => <Skeleton key={i} className="h-7 rounded-md" style={{ width }} />)}</div></SheetContainer>
          <SheetContainer>
            <Skeleton className="mb-4 h-5 w-20" />
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <Skeleton className="size-7 shrink-0 rounded-full" /><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-14" /><Skeleton className="ml-auto h-4 w-20" /><Skeleton className="h-6 w-12 rounded-md" />
              </div>
            ))}
          </SheetContainer>
        </SheetScrollColumn>
        <SheetScrollColumn><SheetContainer><Skeleton className="mb-4 h-5 w-20" /><Skeleton className="h-24 w-full rounded-md" /><div className="mt-6"><InfoRows /></div></SheetContainer></SheetScrollColumn>
      </SheetBody>
      <SheetContainer className="border-t overflow-hidden"><Skeleton className="mb-3 h-5 w-10" /><div className="rounded-lg border overflow-hidden"><GanttSkeleton compact rows={3} /></div></SheetContainer>
      <SheetFooter><Skeleton className="h-9 w-20 rounded-md" /><Skeleton className="h-9 w-28 rounded-md" /></SheetFooter>
    </div>
  );
}

function InfoRows() {
  return <div className="space-y-4" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <div key={i} className="flex flex-wrap items-center justify-between gap-2"><Skeleton className="h-3 w-12" /><Skeleton className="h-4 w-20" /></div>)}</div>;
}
