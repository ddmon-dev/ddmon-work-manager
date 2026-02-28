import { useDialog } from "@/shared/ui/app-dialog";
import { RowActions } from "../_base/ui";
import { useDeleteClient } from "./api";

export function ClientRowActions({ id }: { id: string }) {
  const deleteClient = useDeleteClient();
  const dialog = useDialog();

  const handleDelete = () => {
    dialog.confirm({
      title: "클라이언트 삭제",
      description: "삭제된 데이터는 복구할 수 없습니다.",
      variant: "destructive",
      confirmText: "삭제",
      onConfirm: async () => {
        await deleteClient.mutateAsync(id);
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
