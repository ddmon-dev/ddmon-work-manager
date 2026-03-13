import { use, createContext, useRef, useState } from "react";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetContainer,
} from "@/shared/ui/sheet";
import { cn } from "@/shared/utils/classnames";
import { useDialog } from "@/shared/ui/app-dialog";
import type { ManageSheetMode } from "../types";

// ── Sheet 상태 Context ──────────────────────────────────────

interface ManageSheetData {
  id?: string;
  mode: ManageSheetMode;
  meta?: Record<string, unknown>;
}

interface ManageSheetContextType {
  manageSheetData: ManageSheetData | null;
  openManageSheet: (data: ManageSheetData) => void;
  setMode: (mode: ManageSheetMode) => void;
  closeManageSheet: () => void;
  closeWithGuard: () => void;
  setModeWithGuard: (mode: ManageSheetMode) => void;
  setCloseGuard: (guard: (() => boolean) | null) => void;
}

const ManageSheetContext = createContext<ManageSheetContextType>({
  manageSheetData: null,
  openManageSheet: () => {},
  setMode: () => {},
  closeManageSheet: () => {},
  closeWithGuard: () => {},
  setModeWithGuard: () => {},
  setCloseGuard: () => {},
});

export function ManageSheetProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [manageSheetData, setManageSheetData] =
    useState<ManageSheetData | null>(null);
  const closeGuardRef = useRef<(() => boolean) | null>(null);
  const dialog = useDialog();

  const openManageSheet = (data: ManageSheetData) => {
    setManageSheetData(data);
  };

  const setMode = (mode: ManageSheetMode) => {
    setManageSheetData((prev) => (prev ? { ...prev, mode } : null));
  };

  const closeManageSheet = () => {
    closeGuardRef.current = null;
    setManageSheetData(null);
  };

  const runWithGuard = (action: () => void) => {
    if (!closeGuardRef.current || !closeGuardRef.current()) {
      action();
      return;
    }

    dialog.confirm({
      title: "변경사항이 있습니다",
      description: "저장하지 않은 변경사항이 있습니다. 계속하시겠습니까?",
      confirmText: "확인",
      cancelText: "취소",
      variant: "destructive",
      onConfirm: action,
    });
  };

  const closeWithGuard = () => runWithGuard(closeManageSheet);
  const setModeWithGuard = (mode: ManageSheetMode) =>
    runWithGuard(() => setMode(mode));

  const setCloseGuard = (guard: (() => boolean) | null) => {
    closeGuardRef.current = guard;
  };

  return (
    <ManageSheetContext.Provider
      value={{
        manageSheetData,
        openManageSheet,
        setMode,
        closeManageSheet,
        closeWithGuard,
        setModeWithGuard,
        setCloseGuard,
      }}
    >
      {children}
    </ManageSheetContext.Provider>
  );
}

export function useManageSheet() {
  const context = use(ManageSheetContext);
  return {
    data: context.manageSheetData,
    open: context.openManageSheet,
    setMode: context.setMode,
    close: context.closeManageSheet,
    closeWithGuard: context.closeWithGuard,
    setModeWithGuard: context.setModeWithGuard,
    setCloseGuard: context.setCloseGuard,
  };
}

// ── Sheet 데이터 Context ────────────────────────────────────

interface ManageSheetDataContextType {
  prevValues: unknown;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const ManageSheetDataContext =
  createContext<ManageSheetDataContextType | null>(null);

export function useManageSheetData<T>() {
  const context = use(ManageSheetDataContext);
  if (!context) {
    throw new Error(
      "useManageSheetData는 ManageSheet 내부에서만 사용할 수 있습니다."
    );
  }
  return {
    ...context,
    prevValues: context.prevValues as T | null,
  };
}

// ── ManageSheet 컴포넌트 ────────────────────────────────────

type SizeKey = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "full";

const SIZES: Record<SizeKey, string> = {
  xs: "md:max-w-md",
  sm: "md:max-w-lg",
  md: "md:max-w-xl",
  lg: "md:max-w-2xl",
  xl: "md:max-w-3xl",
  "2xl": "md:max-w-5xl",
  full: "md:max-w-[92vw]",
};

const VARIANTS = {
  create: {
    title: (moduleName?: string) => `${moduleName ?? "데이터"} 생성하기`,
    description: "내용 입력 후 저장 버튼을 클릭하세요.",
  },
  modify: {
    title: (moduleName?: string) => `${moduleName ?? "데이터"} 수정하기`,
    description: "수정 후 저장 버튼을 클릭하세요.",
  },
  view: {
    title: (moduleName?: string) => `${moduleName ?? "데이터"} 상세 보기`,
    description: "해당 데이터의 상세 내용입니다.",
  },
  duplicate: {
    title: (moduleName?: string) => `${moduleName ?? "데이터"} 복사하기`,
    description: "복사한 내용을 확인하고 저장하세요.",
  },
};

interface ManageSheetProps<T> {
  // queryKey + fetchFn 대신 useQuery 옵션 직접 전달
  queryKeyFn: (id: string) => readonly unknown[];
  fetchFn: (id: string) => Promise<T>;
  formComponent?: React.ComponentType<{ id?: string; prevValues: T | null }>;
  viewComponent?: React.ComponentType<{ data: T; refetch: () => void }>;
  viewHeader?: React.ComponentType;
  size?: SizeKey | Partial<Record<ManageSheetMode, SizeKey>>;
  moduleName?: string;
}

export function ManageSheet<T>({
  queryKeyFn,
  fetchFn,
  formComponent: FormComponent,
  viewComponent: ViewComponent,
  viewHeader: ViewHeader,
  moduleName,
  size = "md",
}: ManageSheetProps<T>) {
  const manageSheet = useManageSheet();
  const { id, mode } = manageSheet.data ?? {};
  const isOpen = manageSheet.data !== null;

  const {
    data: prevValues,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: id ? queryKeyFn(id) : ["__disabled__"],
    queryFn: () => fetchFn(id!),
    enabled: !!id && isOpen && mode !== "create",
    staleTime: 0,
  } as UseQueryOptions<T>);

  const dataContextValue: ManageSheetDataContextType = {
    prevValues: prevValues ?? null,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };

  const sizeKey =
    typeof size === "string" ? size : (mode && size?.[mode]) ?? "md";

  const renderContent = () => {
    if (mode === "create") {
      return FormComponent ? (
        <FormComponent id={undefined} prevValues={null} />
      ) : null;
    }

    if (isLoading) return null;

    if (error) {
      return (
        <SheetBody>
          <SheetContainer className="flex items-center justify-center min-h-[200px]">
            <p className="text-sm text-destructive">
              데이터를 불러오는 중 오류가 발생했습니다.
            </p>
          </SheetContainer>
        </SheetBody>
      );
    }

    if (mode === "modify") {
      return FormComponent ? (
        <FormComponent id={id} prevValues={(prevValues as T) ?? null} />
      ) : null;
    }

    if (mode === "view" && ViewComponent && prevValues) {
      return <ViewComponent data={prevValues as T} refetch={refetch} />;
    }

    return null;
  };

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => !open && manageSheet.closeWithGuard()}
    >
      <SheetContent
        className={cn(
          SIZES[sizeKey],
          "w-[440px] max-w-full md:w-full",
          "md:transition-[max-width] md:duration-300 md:ease-in-out"
        )}
      >
        <ManageSheetDataContext.Provider value={dataContextValue}>
          {!error && mode && (
            <SheetHeader>
              {mode === "view" && ViewHeader ? (
                <>
                  <SheetTitle className="sr-only">
                    {VARIANTS[mode].title(moduleName)}
                  </SheetTitle>
                  <SheetDescription className="sr-only">
                    {VARIANTS[mode].description}
                  </SheetDescription>
                  <ViewHeader />
                </>
              ) : (
                <>
                  <SheetTitle className="text-lg">
                    {VARIANTS[mode].title(moduleName)}
                  </SheetTitle>
                  <SheetDescription className="text-sm">
                    {VARIANTS[mode].description}
                  </SheetDescription>
                </>
              )}
            </SheetHeader>
          )}
          {renderContent()}
        </ManageSheetDataContext.Provider>
      </SheetContent>
    </Sheet>
  );
}
