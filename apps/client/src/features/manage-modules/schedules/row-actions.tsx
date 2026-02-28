import { useDialog } from "@/shared/ui/app-dialog";
import { RowActions } from "../_base/ui";
import { useDeleteSchedule } from "./api";

export function ScheduleRowActions({ id }: { id: string }) {
  const dialog = useDialog();
  const deleteSchedule = useDeleteSchedule();

  const handleDelete = () => {
    dialog.confirm({
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
    <RowActions
      type="buttons"
      id={id}
      actions={["view", "modify", "delete"]}
      onDelete={handleDelete}
    />
  );
}
