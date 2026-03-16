import { useState, useCallback, useRef } from "react";
import type {
  DialogState,
  ConfirmDialogData,
  AlertDialogData,
} from "@/shared/ui/app-dialog/types";

export function useFileBrowserDialog() {
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const resolveRef = useRef<(() => void) | null>(null);

  const confirm = useCallback((data: ConfirmDialogData): Promise<void> => {
    return new Promise((resolve) => {
      resolveRef.current = () => resolve();
      setDialogState({ type: "confirm", data });
    });
  }, []);

  const alert = useCallback((data: AlertDialogData): Promise<void> => {
    return new Promise((resolve) => {
      resolveRef.current = () => resolve();
      setDialogState({ type: "alert", data });
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (dialogState?.type === "confirm" && dialogState.data.onConfirm) {
      try {
        const result = await dialogState.data.onConfirm();
        if (result === false) return;
      } catch {
        // 에러는 onConfirm 내부에서 처리
      }
    }
    if (resolveRef.current) {
      resolveRef.current();
      resolveRef.current = null;
    }
    setDialogState(null);
  }, [dialogState]);

  const handleCancel = useCallback(async () => {
    let shouldClose = true;
    if (dialogState?.type === "confirm" && dialogState.data.onCancel) {
      const result = await dialogState.data.onCancel();
      shouldClose = result !== false;
    }
    if (shouldClose) {
      if (resolveRef.current) {
        resolveRef.current();
        resolveRef.current = null;
      }
      setDialogState(null);
    }
  }, [dialogState]);

  const handleAlertClose = useCallback(async () => {
    let shouldClose = true;
    if (dialogState?.type === "alert" && dialogState.data.onConfirm) {
      const result = await dialogState.data.onConfirm();
      shouldClose = result !== false;
    }
    if (shouldClose) {
      if (resolveRef.current) {
        resolveRef.current();
        resolveRef.current = null;
      }
      setDialogState(null);
    }
  }, [dialogState]);

  return { confirm, alert, dialogState, handleConfirm, handleCancel, handleAlertClose };
}
