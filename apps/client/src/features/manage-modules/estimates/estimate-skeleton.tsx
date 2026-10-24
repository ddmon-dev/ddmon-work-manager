import { PdfPreviewPlaceholder } from "@/shared/ui/pdf-preview";
import { EstimateDocumentSkeleton } from "./pdf/estimate-document-skeleton";
import { Skeleton } from "@/shared/ui/skeleton";
import { Separator } from "@/shared/ui/separator";
import {
  SheetBody,
  SheetScrollColumn,
  SheetContainer,
  SheetFooter,
} from "@/shared/ui/sheet";

export function EstimateSkeleton() {
  return (
    <>
      <div className="flex h-[61px] shrink-0 items-center gap-4 border-b px-4 md:px-8" aria-hidden="true">
        <Skeleton className="h-5 w-32" /><Skeleton className="h-7 w-48 rounded-full" /><Skeleton className="h-7 w-36 rounded-full" />
      </div>
      <SheetBody className="lg:grid-cols-[1fr_800px]">
        {/* 좌측: 상세 정보 */}
        <SheetScrollColumn>
          <SheetContainer className="space-y-8">
            {/* 히어로 영역 */}
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
              <div className="flex items-center gap-2 pt-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>

            <Separator />

            {/* 메타 정보 그리드 */}
            <div className="grid grid-cols-3 gap-x-6 gap-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>

            <Separator />

            {/* 견적 항목 테이블 */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <div className="space-y-0">
                <div className="flex items-center gap-3 border-b py-2">
                  <Skeleton className="h-3 flex-1" />
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-10" />
                  <Skeleton className="h-3 w-20" />
                </div>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 border-b border-dashed last:border-0 py-2"
                  >
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-10" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
                <div className="flex justify-end gap-2 pt-1">
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </div>

            <Separator />

            {/* 금액 요약 */}
            <div className="rounded-lg bg-muted/30 p-5 space-y-2.5">
              <SummaryRow />
              <SummaryRow />
              <SummaryRow />
              <div className="border-t pt-3 flex justify-between items-baseline">
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-7 w-36" />
              </div>
            </div>
          </SheetContainer>
        </SheetScrollColumn>

        {/* 우측: PDF 미리보기 */}
        <div className="hidden lg:flex flex-col min-h-0">
          <PdfPreviewPlaceholder skeleton={<EstimateDocumentSkeleton />} />
        </div>
      </SheetBody>

      <SheetFooter>
        <Skeleton className="h-9 w-20 rounded-md" />
        <Skeleton className="h-9 w-20 rounded-md" />
      </SheetFooter>
    </>
  );
}

function SummaryRow() {
  return (
    <div className="flex justify-between">
      <Skeleton className="h-4 w-14" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}
