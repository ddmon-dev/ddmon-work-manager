import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { format } from "date-fns";
import { FileTextIcon, LoaderIcon, XIcon } from "lucide-react";
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
import { DetailSectionTitle } from "../_base/ui";
import {
  fetchEstimate,
  useGetVersions,
  useUpdateFinalVersion,
} from "../estimates/api";
import { EstimatePdfPreview } from "../estimates/pdf/estimate-pdf-preview";
import type { EstimateWithDetails } from "../estimates/types";

interface EstimateVersionsProps {
  estimateNumber: string;
}

export function EstimateVersions({ estimateNumber }: EstimateVersionsProps) {
  const queryClient = useQueryClient();
  const { data, refetch } = useGetVersions(estimateNumber);
  const versions = data?.versions ?? [];
  const updateFinalVersion = useUpdateFinalVersion();
  const [isUpdating, setIsUpdating] = useState(false);

  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfData, setPdfData] = useState<EstimateWithDetails | null>(null);
  const [pdfLabel, setPdfLabel] = useState("");
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  if (versions.length === 0) return null;

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

  async function handleOpenPdf(
    estimateId: string,
    version: number,
    versionLabel: string | null
  ) {
    setIsLoadingPdf(true);
    setPdfLabel(versionLabel || `v${version}`);
    setPdfOpen(true);
    try {
      const data = await queryClient.fetchQuery({
        queryKey: queryKeys.estimates.detail(estimateId),
        queryFn: () => fetchEstimate(estimateId),
      });
      setPdfData(data);
    } catch {
      toast.error("견적서 데이터를 불러오지 못했습니다.");
      setPdfOpen(false);
    } finally {
      setIsLoadingPdf(false);
    }
  }

  return (
    <div>
      <DetailSectionTitle>견적서 버전</DetailSectionTitle>
      <ul>
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
      </ul>

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
          {isLoadingPdf || !pdfData ? (
            <div className="flex items-center justify-center">
              <LoaderIcon className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="min-h-0 flex flex-col">
              <EstimatePdfPreview estimate={pdfData} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
