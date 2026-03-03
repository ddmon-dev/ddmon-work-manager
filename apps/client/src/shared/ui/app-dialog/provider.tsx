import { createContext, use, useRef, useState } from 'react';
import {
  type DialogState,
  type DialogContextType,
  type ConfirmDialogData,
  type AlertDialogData,
} from './types';
import { ConfirmDialogComponent, AlertDialogComponent } from './components';

const DialogContext = createContext<DialogContextType | null>(null);

interface DialogProviderProps {
  children: React.ReactNode;
}

export function DialogProvider({ children }: DialogProviderProps) {
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const resolveRef = useRef<(() => void) | null>(null);

  const confirm = (data: ConfirmDialogData): Promise<void> => {
    return new Promise((resolve) => {
      resolveRef.current = () => resolve();
      setDialogState({ type: 'confirm', data });
    });
  };

  const alert = (data: AlertDialogData): Promise<void> => {
    return new Promise((resolve) => {
      resolveRef.current = () => resolve();
      setDialogState({ type: 'alert', data });
    });
  };

  const close = () => {
    if (resolveRef.current) {
      resolveRef.current();
      resolveRef.current = null;
    }
    setDialogState(null);
  };

  const handleConfirm = async () => {
    if (dialogState?.type === 'confirm' && dialogState.data.onConfirm) {
      try {
        const result = await dialogState.data.onConfirm();
        if (result === false) return;
      } catch {
        // 에러는 onConfirm 내부(onError 등)에서 처리
      }
    }
    if (resolveRef.current) {
      resolveRef.current();
      resolveRef.current = null;
    }
    setDialogState(null);
  };

  const handleCancel = async () => {
    let shouldClose = true;
    if (dialogState?.type === 'confirm' && dialogState.data.onCancel) {
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
  };

  const handleAlertClose = async () => {
    let shouldClose = true;
    if (dialogState?.type === 'alert' && dialogState.data.onConfirm) {
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
  };

  return (
    <DialogContext.Provider value={{ confirm, alert, close }}>
      {children}

      {dialogState?.type === 'confirm' && (
        <ConfirmDialogComponent
          data={dialogState.data}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}

      {dialogState?.type === 'alert' && (
        <AlertDialogComponent data={dialogState.data} onClose={handleAlertClose} />
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = use(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within DialogProvider');
  }
  return context;
}
