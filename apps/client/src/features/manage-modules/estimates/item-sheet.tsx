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
import { cn } from "@/shared/utils/classnames";
import { queryKeys } from "@/shared/lib/query-keys";
import { atLeast } from "@/shared/utils/delays";
import { useManageSheet, ManageSheetDataContext } from "../_base/ui";
import { fetchEstimate } from "./api";
import { EstimateSkeleton } from "./estimate-skeleton";
import { CONFIG } from "./config";
import { WriteForm } from "./write-form";
import { DetailView } from "./detail-view";
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
    queryFn: () => atLeast(() => fetchEstimate(id!)),
    enabled: !!id && isOpen && mode !== "create",
    staleTime: 0,
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
    if (isLoading) {
      return <EstimateSkeleton />;
    }
    if (error) {
      return (
        <SheetBody>
          <SheetContainer className="flex items-center justify-center min-h-[200px]">
            <p className="text-sm text-destructive">데이터를 불러오는 중 오류가 발생했습니다.</p>
          </SheetContainer>
        </SheetBody>
      );
    }
    if (mode === "modify" && prevValues) {
      return <WriteForm id={id} prevValues={prevValues} />;
    }
    if (mode === "clone" && prevValues) {
      return <WriteForm id={undefined} prevValues={prevValues} />;
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
          {!error && mode && (
            <SheetHeader className={mode !== "create" ? "sr-only" : undefined}>
              <SheetTitle className="text-lg">
                {CONFIG.moduleName}{" "}
                {mode === "create"
                  ? "생성하기"
                  : mode === "modify"
                  ? "수정하기"
                  : mode === "clone"
                  ? "새 버전 작성하기"
                  : "상세 보기"}
              </SheetTitle>
              <SheetDescription className="text-sm">
                {mode === "create"
                  ? "내용 입력 후 저장 버튼을 클릭하세요."
                  : mode === "modify"
                  ? "수정 후 저장 버튼을 클릭하세요."
                  : mode === "clone"
                  ? "새 버전 내용을 확인하고 저장하세요."
                  : "해당 데이터의 상세 내용입니다."}
              </SheetDescription>
            </SheetHeader>
          )}
          {renderContent()}
        </ManageSheetDataContext.Provider>
      </SheetContent>
    </Sheet>
  );
}
