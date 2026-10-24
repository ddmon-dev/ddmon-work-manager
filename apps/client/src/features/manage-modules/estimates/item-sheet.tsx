import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetContainer,
  SheetBody,
} from "@/shared/ui/sheet";
import { Separator } from "@/shared/ui/separator";
import { cn } from "@/shared/utils/classnames";
import { queryKeys } from "@/shared/lib/query-keys";
import { useManageSheet, ManageSheetDataContext } from "../_base/ui";
import { fetchEstimate } from "./api";
import { CONFIG } from "./config";
import { WriteForm } from "./write-form";
import { EstimateSkeleton } from "./estimate-skeleton";
import { QueryError } from "@/shared/ui/query-error";
import { DetailView } from "./detail-view";
import { VersionSelector } from "./version-selector";
import type { EstimateWithDetails } from "./types";

type DataContextValue = {
  prevValues: unknown;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

export function ItemSheet() {
  const manageSheet = useManageSheet();
  const { id, mode } = manageSheet.data ?? {};
  const isOpen = manageSheet.data !== null;

  const {
    data: prevValues,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: id ? queryKeys.estimates.detail(id) : ["__disabled__"],
    queryFn: () => fetchEstimate(id!),
    enabled: !!id && isOpen && mode !== "create",
  } as UseQueryOptions<EstimateWithDetails>);

  const dataContextValue: DataContextValue = {
    prevValues: prevValues ?? null,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };

  const renderContent = () => {
    if (mode === "create") {
      return <WriteForm id={undefined} prevValues={null} />;
    }
    if (isLoading) return <div role="status" aria-label="견적서를 불러오고 있습니다" className="flex min-h-0 flex-1 flex-col"><EstimateSkeleton /></div>;
    if (error && !prevValues) {
      return (
        <SheetBody>
          <SheetContainer className="flex items-center justify-center min-h-[200px]">
            <QueryError onRetry={() => void refetch()} />
          </SheetContainer>
        </SheetBody>
      );
    }
    if (mode === "modify" && prevValues) {
      return <WriteForm id={id} prevValues={prevValues} />;
    }
    if (mode === "duplicate" && prevValues) {
      const versionOf = manageSheet.data?.meta?.versionOf;
      const cleaned = {
        ...prevValues,
        versionLabel: versionOf ? "" : "초안",
        ...(!versionOf && {
          estimateNumber: undefined,
          version: undefined,
          clientId: "",
          client: undefined,
          title: "",
          memo: null,
        }),
      } as EstimateWithDetails;
      return <WriteForm id={undefined} prevValues={cleaned} />;
    }
    if (mode === "view" && prevValues) {
      return <DetailView data={prevValues} refetch={refetch} />;
    }
    return null;
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && manageSheet.closeWithGuard()}>
      <SheetContent
        className={cn(
          "w-[440px] max-w-full md:w-full md:rounded-l-xl",
          "md:transition-[max-width] md:duration-300 md:ease-in-out",
          mode === "view" ? "md:max-w-[1440px]" : "md:max-w-full"
        )}
      >
        <ManageSheetDataContext.Provider value={dataContextValue}>
          {mode && (
            <SheetHeader className={mode === "create" || (mode === "duplicate" && !manageSheet.data?.meta?.versionOf) ? undefined : "sr-only"}>
              <SheetTitle className="text-lg">
                {CONFIG.moduleName}{" "}
                {mode === "create"
                  ? "생성하기"
                  : mode === "modify"
                  ? "수정하기"
                  : mode === "duplicate"
                  ? (manageSheet.data?.meta?.versionOf ? "새 버전 작성하기" : "복사하기")
                  : "상세 보기"}
              </SheetTitle>
              <SheetDescription className="text-sm">
                {mode === "create"
                  ? "내용 입력 후 저장 버튼을 클릭하세요."
                  : mode === "modify"
                  ? "수정 후 저장 버튼을 클릭하세요."
                  : mode === "duplicate"
                  ? (manageSheet.data?.meta?.versionOf ? "새 버전 내용을 확인하고 저장하세요." : "복사한 내용을 확인하고 저장하세요.")
                  : "해당 데이터의 상세 내용입니다."}
              </SheetDescription>
            </SheetHeader>
          )}
          {(mode === "modify" || (mode === "duplicate" && !!manageSheet.data?.meta?.versionOf)) && prevValues && (() => {
            const versions = prevValues.versions ?? [];
            const currentVersion = versions.find((v) => v.id === id);
            return (
              <div className="border-b px-4 md:px-8 py-4">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                  <span className="text-muted-foreground text-base shrink-0">
                    {mode === "modify" ? "수정" : "새 버전 작성"}하기
                  </span>
                  <Separator orientation="vertical" className="h-[20px]! hidden md:block" />
                  <span className="font-semibold text-base shrink-0">{prevValues.estimateNumber}</span>
                  {currentVersion && (
                    <>
                      <Separator orientation="vertical" className="h-[20px]! hidden md:block" />
                      <VersionSelector
                        currentId={id ?? ""}
                        version={currentVersion.version}
                        versionLabel={currentVersion.versionLabel}
                        finalEstimateId={prevValues.series?.finalEstimateId}
                        versions={versions}
                        mode={mode}
                      />
                    </>
                  )}
                </div>
              </div>
            );
          })()}
          {error && prevValues && <QueryError floating onRetry={() => void refetch()} message="최신 데이터를 가져오지 못했습니다. 이전 내용을 표시합니다." />}
          {renderContent()}
        </ManageSheetDataContext.Provider>
      </SheetContent>
    </Sheet>
  );
}
