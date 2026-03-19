import { useDialog } from "@/shared/ui/app-dialog";
import { RowActions } from "../_base/ui";
import { useDeleteClientEnvironment } from "./api";

export function ClientEnvironmentRowActions({ id }: { id: string }) {
  const deleteEnv = useDeleteClientEnvironment();
  const dialog = useDialog();

  const handleDelete = () => {
    dialog.confirm({
      title: "고객환경정보 삭제",
      description: "삭제된 데이터는 복구할 수 없습니다.",
      variant: "destructive",
      confirmText: "삭제",
      onConfirm: async () => {
        await deleteEnv.mutateAsync(id);
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
