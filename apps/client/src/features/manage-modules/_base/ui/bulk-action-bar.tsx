import { useState } from "react";
import { Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/shared/utils/classnames";
import { GENERAL_ERRORS } from "@/shared/constants/error-messages";
import { Button } from "@/shared/ui/button";
import { LoadingButton } from "@/shared/ui/loading-button";
import { useDialog } from "@/shared/ui/app-dialog";
import type { ActionResult } from "@packages/types";

interface BulkActionBarProps<TData extends { id?: string }> {
  selectedRows: TData[];
  onClearSelection: () => void;
  bulkDeleteFn: (ids: string[]) => Promise<ActionResult<{ count: number }>>;
}

export function BulkActionBar<TData extends { id?: string }>({
  selectedRows,
  onClearSelection,
  bulkDeleteFn,
}: BulkActionBarProps<TData>) {
  const dialog = useDialog();
  const [isLoading, setIsLoading] = useState(false);

  const selectedCount = selectedRows.length;
  const isVisible = selectedCount > 0;

  const handleBulkDelete = async () => {
    setIsLoading(true);

    await dialog.confirm({
      title: "데이터 일괄 삭제",
      description: (
        <>
          선택한 {selectedCount}개 항목을 삭제하시겠습니까?
          <br />
          삭제된 데이터는 복구할 수 없습니다.
        </>
      ),
      variant: "destructive",
      confirmText: "삭제",
      onConfirm: async () => {
        try {
          const ids = selectedRows
            .map((row) => row.id)
            .filter((id): id is string => !!id);

          const result = await bulkDeleteFn(ids);

          if (!result.success) {
            toast.error(result.error);
            return;
          }

          toast.success(`${selectedCount}개 항목이 삭제되었습니다.`);
          onClearSelection();
        } catch (error) {
          console.error(error);
          toast.error(GENERAL_ERRORS.UNEXPECTED);
        }
      },
    });

    setIsLoading(false);
  };

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 z-50 -translate-x-1/2",
        "flex justify-center items-center gap-4 rounded-full border bg-background pl-6 pr-3 py-3 shadow-lg",
        "transition-all duration-300 ease-out",
        "w-full max-w-[300px]",
        "md:bottom-14 md:max-w-[350px]",
        isVisible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0"
      )}
    >
      <span className="text-sm font-medium">
        {selectedCount}개 <span className="hidden md:inline">선택됨</span>
      </span>

      <div className="h-4 w-px bg-border" />

      <LoadingButton
        size="sm"
        variant="destructive"
        onClick={handleBulkDelete}
        isLoading={isLoading}
        icon={<Trash2 className="size-4" />}
      >
        삭제
      </LoadingButton>

      <Button
        size="icon-sm"
        variant="secondary"
        onClick={onClearSelection}
        aria-label="선택 해제"
        className="ml-auto"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
