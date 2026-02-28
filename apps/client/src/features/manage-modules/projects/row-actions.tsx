import { useDialog } from "@/shared/ui/app-dialog";
import { RowActions } from "../_base/ui";
import { useDeleteProject } from "./api";

export function ProjectRowActions({ id }: { id: string }) {
  const dialog = useDialog();
  const deleteProject = useDeleteProject();

  return (
    <RowActions
      type="menu"
      id={id}
      actions={[
        "view",
        "modify",
        {
          action: "delete",
          onClick: () =>
            dialog.confirm({
              title: "프로젝트 삭제",
              description: "이 프로젝트를 삭제하시겠습니까? 삭제된 데이터는 복구할 수 없습니다.",
              variant: "destructive",
              confirmText: "삭제",
              onConfirm: async () => {
                await deleteProject.mutateAsync(id);
              },
            }),
        },
      ]}
    />
  );
}
