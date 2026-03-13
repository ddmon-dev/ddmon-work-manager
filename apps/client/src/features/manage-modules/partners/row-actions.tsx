import { useDialog } from "@/shared/ui/app-dialog";
import { RowActions } from "../_base/ui";
import { useDeletePartner } from "./api";

export function PartnerRowActions({ id }: { id: string }) {
  const deletePartner = useDeletePartner();
  const dialog = useDialog();

  const handleDelete = () => {
    dialog.confirm({
      title: "파트너 삭제",
      description: "삭제된 데이터는 복구할 수 없습니다.",
      variant: "destructive",
      confirmText: "삭제",
      onConfirm: async () => {
        await deletePartner.mutateAsync(id);
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
