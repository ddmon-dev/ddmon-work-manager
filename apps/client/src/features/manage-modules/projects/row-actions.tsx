import { RowActionButtons } from "../_base/ui/row-action-buttons";
import { useManageSheet } from "../_base/ui/manage-sheet";
import { useConfirm } from "@/shared/ui/confirm-dialog";
import { useDeleteProject } from "./api";
import { Eye, SquarePen, Trash2 } from "lucide-react";

export function ProjectRowActions({ id }: { id: string }) {
  const manageSheet = useManageSheet();
  const { confirm } = useConfirm();
  const deleteProject = useDeleteProject();

  const handleDelete = () => {
    confirm({
      title: "프로젝트 삭제",
      description:
        "이 프로젝트를 삭제하시겠습니까? 삭제된 데이터는 복구할 수 없습니다.",
      variant: "destructive",
      confirmText: "삭제",
      onConfirm: async () => {
        await deleteProject.mutateAsync(id);
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
