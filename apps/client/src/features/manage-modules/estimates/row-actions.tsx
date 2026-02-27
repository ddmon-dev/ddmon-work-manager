import { useConfirm } from "@/shared/ui/confirm-dialog";
import { RowActions } from "../_base/ui";
import { useDeleteEstimateSeries } from "./api";

export function EstimateRowActions({
  id,
  estimateNumber,
}: {
  id: string;
  estimateNumber: string;
}) {
  const { confirm } = useConfirm();
  const deleteSeries = useDeleteEstimateSeries();

  return (
    <RowActions
      type="menu"
      id={id}
      actions={[
        "view",
        "modify",
        { action: "clone", label: "새 버전" },
        {
          action: "delete",
          onClick: () =>
            confirm({
              title: "견적서 삭제",
              description: `견적서 ${estimateNumber}의 모든 버전이 삭제됩니다. 계속하시겠습니까?`,
              variant: "destructive",
              confirmText: "삭제",
              onConfirm: async () => {
                await deleteSeries.mutateAsync(estimateNumber);
              },
            }),
        },
      ]}
    />
  );
}
