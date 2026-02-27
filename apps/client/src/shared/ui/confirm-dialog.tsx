import * as React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/shared/ui/alert-dialog";
import { LoadingButton } from "@/shared/ui/loading-button";

interface ConfirmOptions {
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  onConfirm: () => Promise<void> | void;
}

interface ConfirmDialogContextType {
  confirm: (options: ConfirmOptions) => void;
}

const ConfirmDialogContext = React.createContext<ConfirmDialogContextType>({
  confirm: () => {},
});

export function ConfirmDialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [options, setOptions] = React.useState<ConfirmOptions | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const confirm = (opts: ConfirmOptions) => {
    setOptions(opts);
    setOpen(true);
  };

  const handleConfirm = async () => {
    if (!options) return;
    setIsLoading(true);
    try {
      await options.onConfirm();
    } finally {
      setIsLoading(false);
      setOpen(false);
    }
  };

  const handleCancel = () => {
    if (!isLoading) setOpen(false);
  };

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      <AlertDialog open={open} onOpenChange={(v) => !v && handleCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{options?.title}</AlertDialogTitle>
            {options?.description && (
              <AlertDialogDescription asChild>
                <div>{options.description}</div>
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel} disabled={isLoading}>
              {options?.cancelText ?? "취소"}
            </AlertDialogCancel>
            <LoadingButton
              isLoading={isLoading}
              onClick={handleConfirm}
              variant={
                options?.variant === "destructive" ? "destructive" : "default"
              }
            >
              {options?.confirmText ?? "확인"}
            </LoadingButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirm() {
  return React.use(ConfirmDialogContext);
}
