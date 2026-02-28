/** 다이얼로그 레이아웃 타입 */
export type DialogLayout = 'default' | 'vertical';

/** 다이얼로그 크기 타입 */
export type DialogSize = 'sm' | 'md' | 'lg';

export interface ConfirmDialogData {
  title: string | React.ReactNode;
  description?: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  layout?: DialogLayout;
  size?: DialogSize;
  onConfirm?: () => void | Promise<void> | boolean | Promise<boolean>;
  onCancel?: () => void | Promise<void> | boolean | Promise<boolean>;
}

export interface AlertDialogData {
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  confirmText?: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
  layout?: DialogLayout;
  size?: DialogSize;
  onConfirm?: () => void | Promise<void> | boolean | Promise<boolean>;
}

export type DialogState =
  | { type: 'confirm'; data: ConfirmDialogData }
  | { type: 'alert'; data: AlertDialogData }
  | null;

export interface DialogContextType {
  confirm: (data: ConfirmDialogData) => Promise<void>;
  alert: (data: AlertDialogData) => Promise<void>;
  close: () => void;
}
