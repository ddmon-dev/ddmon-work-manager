import { RowActionButtons } from "../_base/ui/row-action-buttons";
import { useManageSheet } from "../_base/ui/manage-sheet";
import { useConfirm } from "@/shared/ui/confirm-dialog";
import { useDeleteSchedule } from "./api";
import { Eye, SquarePen, Trash2 } from "lucide-react";

export function ScheduleRowActions({ id }: { id: string }) {
  const manageSheet = useManageSheet();
  const { confirm } = useConfirm();
  const deleteSchedule = useDeleteSchedule();

  const handleDelete = () => {
    confirm({
      title: "일정 삭제",
      description: "이 일정을 삭제하시겠습니까? 삭제된 데이터는 복구할 수 없습니다.",
      variant: "destructive",
      confirmText: "삭제",
      onConfirm: async () => {
        await deleteSchedule.mutateAsync(id);
      },
    });
  };

  return (
    <RowActionButtons
      items={[
        {
          label: "상세보기",
          icon: <Eye />,
          onClick: () => manageSheet.open({ id, mode: "view" }),
        },
        {
          label: "수정",
          icon: <SquarePen />,
          onClick: () => manageSheet.open({ id, mode: "modify" }),
        },
        {
          label: "삭제",
          icon: <Trash2 />,
          variant: "destructive",
          onClick: handleDelete,
        },
      ]}
    />
  );
}
