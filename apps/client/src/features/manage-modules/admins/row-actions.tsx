import { toast } from "sonner";
import { useConfirm } from "@/shared/ui/confirm-dialog";
import { RowActions } from "../_base/ui";
import { useDeleteAdmin } from "./api";

export function AdminRowActions({
  id,
  superAdmin,
}: {
  id: string;
  superAdmin: boolean;
}) {
  const { confirm } = useConfirm();
  const deleteAdmin = useDeleteAdmin();

  const handleDelete = () => {
    if (superAdmin) {
      toast.error("최고 관리자는 삭제할 수 없습니다.");
      return;
    }
    confirm({
      title: "관리자 삭제",
      description:
        "이 관리자를 삭제하시겠습니까? 삭제된 계정은 복구할 수 없습니다.",
      variant: "destructive",
      confirmText: "삭제",
      onConfirm: async () => {
        await deleteAdmin.mutateAsync(id);
      },
    });
  };

  return (
    <RowActions
      type="buttons"
      id={id}
      actions={["modify", "delete"]}
      onDelete={handleDelete}
    />
  );
}
