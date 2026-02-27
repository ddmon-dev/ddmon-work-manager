import { RowActionButtons } from "../_base/ui/row-action-buttons";
import { useManageSheet } from "../_base/ui/manage-sheet";
import { useConfirm } from "@/shared/ui/confirm-dialog";
import { useDeleteAdmin } from "./api";
import { Eye, SquarePen, Trash2 } from "lucide-react";
import type { RowActionItem } from "../_base/ui";

export function AdminRowActions({
  id,
  superAdmin,
}: {
  id: string;
  superAdmin: boolean;
}) {
  const manageSheet = useManageSheet();
  const { confirm } = useConfirm();
  const deleteAdmin = useDeleteAdmin();

  const handleDelete = () => {
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

  const items: RowActionItem[] = [
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
      disabled: superAdmin,
    },
  ];

  return <RowActionButtons items={items} />;
}
