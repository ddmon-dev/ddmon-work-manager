import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { format } from "date-fns";
import { FileTextIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/shared/utils/classnames";
import { Button } from "@/shared/ui/button";
import { ButtonGroup } from "@/shared/ui/button-group";
import { Badge } from "@/shared/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/ui/dialog";
import { Skeleton } from "@/shared/ui/skeleton";
import { QueryError } from "@/shared/ui/query-error";
import { toDocumentData } from "../estimates/pdf/document-data";
import { DetailSectionTitle } from "../_base/ui";
import {
  fetchEstimate,
  useGetVersions,
  useUpdateFinalVersion,
} from "../estimates/api";
import { EstimatePdfPreview } from "../estimates/pdf/estimate-pdf-preview";

interface EstimateVersionsProps {
  estimateNumber: string;
}

export function EstimateVersions({ estimateNumber }: EstimateVersionsProps) {
  const { data, isLoading, error, refetch } = useGetVersions(estimateNumber);
  const versions = data?.versions ?? [];
  const updateFinalVersion = useUpdateFinalVersion();
  const [isUpdating, setIsUpdating] = useState(false);

  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfId, setPdfId] = useState<string | null>(null);
  const [pdfLabel, setPdfLabel] = useState("");
  const { data: pdfData, error: pdfError, refetch: refetchPdf } = useQuery({
    queryKey: pdfId ? queryKeys.estimates.detail(pdfId) : ["__estimate-preview-disabled__"],
    queryFn: () => fetchEstimate(pdfId!),
    enabled: pdfOpen && !!pdfId,
  });

  async function handleSetFinalVersion(estimateId: string) {
    setIsUpdating(true);
    try {
      await updateFinalVersion.mutateAsync({ estimateNumber, finalEstimateId: estimateId });
      refetch();
    } catch {
      toast.error("계약 버전 변경에 실패했습니다.");
    } finally {
      setIsUpdating(false);
    }
  }

  function handleOpenPdf(estimateId: string, version: number, versionLabel: string | null) {
    setPdfId(estimateId);
    setPdfLabel(versionLabel || `v${version}`);
    setPdfOpen(true);
  }

  return (
    <div>
      <DetailSectionTitle>견적서 버전</DetailSectionTitle>
      {error && data && <QueryError floating onRetry={() => void refetch()} />}
      {isLoading ? <VersionsSkeleton /> : error && !data ? (
        <QueryError onRetry={() => void refetch()} message="견적서 버전을 불러오지 못했습니다." />
      ) : <ul>
        {versions.length === 0 && <li className="py-4 text-sm text-muted-foreground">견적서 버전이 없습니다.</li>}
        {versions.map((rev, index) => {
          const isFinal = rev.isFinal;
          const isFirst = index === 0;
          const isLast = index === versions.length - 1;

          return (
            <li
              key={rev.id}
              className="group flex cursor-pointer"
              onClick={() => handleOpenPdf(rev.id, rev.version, rev.versionLabel ?? null)}
            >
              {/* 타임라인 트랙 */}
              <div className="flex flex-col items-center w-6 shrink-0 mr-3">
                <div className={cn("w-px flex-1", isFirst ? "bg-transparent" : "bg-border dark:bg-border-dark")} />
                {isFinal ? (
                  <div className="shrink-0 size-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <div className="size-2.5 rounded-full bg-primary" />
                  </div>
                ) : (
                  <div className="shrink-0 size-3 rounded-full border-2 border-border dark:border-border-dark bg-background" />
                )}
                <div className={cn("w-px flex-1", isLast ? "bg-transparent" : "bg-border dark:bg-border-dark")} />
              </div>

              {/* 컨텐츠 카드 */}
              <div className={cn("flex-1 min-w-0 flex items-center gap-3 my-0.5 p-3 rounded-xl transition-colors", "hover:bg-accent/30")}>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground tabular-nums">
                      v{rev.version}
                    </span>
                    <span className="truncate font-medium text-sm">
                      {rev.versionLabel ?? "버전명 없음"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {rev.issuedDate && (
                      <span className="text-xs text-muted-foreground">
                        {format(rev.issuedDate, "yyyy-MM-dd")} 발행
                      </span>
                    )}
                    {isFinal && (
                      <Badge variant="default-light" className="text-[10px] leading-none px-1.5 py-0.5 shrink-0">
                        계약
                      </Badge>
                    )}
                  </div>
                </div>

                {/* 액션 버튼 */}
                <ButtonGroup className="shrink-0">
                  <Button
                    variant="outline"
                    size="icon-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenPdf(rev.id, rev.version, rev.versionLabel ?? null);
                    }}
                  >
                    <FileTextIcon />
                  </Button>
                  {!isFinal && (
                    <Button
                      variant="outline"
                      size="xs"
                      disabled={isUpdating}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetFinalVersion(rev.id);
                      }}
                    >
                      계약 지정
                    </Button>
                  )}
                </ButtonGroup>
              </div>
            </li>
          );
        })}
      </ul>}

      {/* PDF 미리보기 다이얼로그 */}
      <Dialog open={pdfOpen} onOpenChange={setPdfOpen}>
        <DialogContent className="sm:max-w-7xl w-[95vw] h-[92dvh] grid! grid-rows-[auto_1fr] gap-0 p-0 rounded-2xl overflow-hidden!">
          <DialogHeader className="flex-row items-center gap-3 px-6 py-4 border-b">
            <div className="shrink-0 size-10 rounded-lg bg-primary-light flex items-center justify-center">
              <FileTextIcon className="size-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base">견적서 미리보기</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {pdfLabel}
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button variant="black" size="icon-sm" className="shrink-0 rounded-full">
                <XIcon className="size-5" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogClose>
          </DialogHeader>
          <div className="min-h-0 flex flex-col">
            {pdfError && !pdfData ? (
              <div className="p-6"><QueryError onRetry={() => void refetchPdf()} message="견적서 데이터를 불러오지 못했습니다." /></div>
            ) : <EstimatePdfPreview documentData={pdfData ? toDocumentData(pdfData) : null} />}
            {pdfError && pdfData && <QueryError floating onRetry={() => void refetchPdf()} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VersionsSkeleton() {
  return (
    <div role="status" aria-label="견적서 버전을 불러오고 있습니다">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} aria-hidden="true" className="flex items-center gap-3">
          <div className="flex w-6 shrink-0 justify-center"><Skeleton className="size-3 rounded-full" /></div>
          <div className="flex min-w-0 flex-1 items-center gap-3 p-3 my-0.5">
            <div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/5" /><Skeleton className="h-3 w-28" /></div>
            <Skeleton className="size-6 rounded-md" /><Skeleton className="h-6 w-16 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
