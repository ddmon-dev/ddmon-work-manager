import type { DialogState } from "@/shared/ui/app-dialog/types";
import {
  ConfirmDialogComponent,
  AlertDialogComponent,
} from "@/shared/ui/app-dialog/components";

interface ScopedDialogRendererProps {
  dialogState: DialogState;
  onConfirm: () => Promise<void>;
  onCancel: () => Promise<void>;
  onAlertClose: () => Promise<void>;
  container?: HTMLElement | null;
}

export function ScopedDialogRenderer({
  dialogState,
  onConfirm,
  onCancel,
  onAlertClose,
  container,
}: ScopedDialogRendererProps) {
  if (!dialogState) return null;

  if (dialogState.type === "confirm") {
    return (
      <ConfirmDialogComponent
        data={dialogState.data}
        onConfirm={onConfirm}
        onCancel={onCancel}
        container={container}
      />
    );
  }

  return (
    <AlertDialogComponent
      data={dialogState.data}
      onClose={onAlertClose}
      container={container}
    />
  );
}
