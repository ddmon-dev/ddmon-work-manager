import { useState } from 'react';
import { CircleAlert, Check, Info, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { LoadingButton } from '@/shared/ui/loading-button';
import { Spinner } from '@/shared/ui/spinner';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/utils/classnames';
import { type ConfirmDialogData, type AlertDialogData, type DialogSize } from './types';

const SIZE_CLASSES: Record<DialogSize, string> = {
  sm: 'sm:max-w-xs',
  md: 'sm:max-w-sm',
  lg: 'sm:max-w-md',
};

// Confirm Dialog Component

export interface ConfirmDialogComponentProps {
  data: ConfirmDialogData;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void | Promise<void>;
}

export function ConfirmDialogComponent({ data, onConfirm, onCancel }: ConfirmDialogComponentProps) {
  const {
    title,
    description,
    confirmText = '확인',
    cancelText = '취소',
    variant = 'default',
    layout = 'default',
    size = 'md',
  } = data;
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    await onConfirm();
    setIsLoading(false);
  };

  const handleCancel = async () => {
    setIsLoading(true);
    await onCancel();
    setIsLoading(false);
  };

  return (
    <AlertDialog open onOpenChange={(open) => !open && !isLoading && handleCancel()}>
      <AlertDialogContent
        className={cn(SIZE_CLASSES[size], 'gap-6', layout === 'vertical' ? 'py-10' : '')}
      >
        {layout === 'vertical' ? (
          <AlertDialogHeader className="gap-2 text-center">
            <AlertDialogTitle className="text-center">{title}</AlertDialogTitle>
            {description && (
              <AlertDialogDescription className="text-center">
                {description}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
        ) : (
          <AlertDialogHeader className="gap-1">
            <AlertDialogTitle>{title}</AlertDialogTitle>
            {description && (
              <AlertDialogDescription>{description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
        )}
        <AlertDialogFooter className={layout === 'vertical' ? 'sm:justify-center' : ''}>
          <Button
            variant="outline"
            onClick={handleCancel}
            className={cn("min-w-18", variant === 'destructive' && "focus:ring-ring focus:ring-[3px] focus:border-ring")}
            disabled={isLoading}
            autoFocus={variant === 'destructive'}
          >
            {cancelText}
          </Button>
          <LoadingButton
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            isLoading={isLoading}
            className={cn("min-w-18", variant !== 'destructive' && "focus:ring-ring focus:ring-[3px] focus:border-ring")}
            autoFocus={variant !== 'destructive'}
          >
            {confirmText}
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Alert Dialog Component

export interface AlertDialogComponentProps {
  data: AlertDialogData;
  onClose: () => void | Promise<void>;
}

const VARIANT_CONFIG = {
  success: {
    icon: Check,
    iconClassName: 'bg-success-light text-success-light-foreground',
    buttonVariant: 'black',
    title: 'Success!',
  },
  error: {
    icon: X,
    iconClassName: 'bg-destructive-light text-destructive-light-foreground',
    buttonVariant: 'black',
    title: 'Error!',
  },
  warning: {
    icon: CircleAlert,
    iconClassName: 'bg-warning-light text-warning',
    buttonVariant: 'black',
    title: 'Warning!',
  },
  default: {
    icon: Info,
    iconClassName: 'bg-info-light text-info-light-foreground',
    buttonVariant: 'black',
    title: 'Info.',
  },
} as const;

export function AlertDialogComponent({ data, onClose }: AlertDialogComponentProps) {
  const {
    title,
    description,
    confirmText = '확인',
    variant = 'default',
    layout = 'default',
    size = 'md',
  } = data;
  const variantConfig = VARIANT_CONFIG[variant];
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = async () => {
    setIsLoading(true);
    await onClose();
    setIsLoading(false);
  };

  const Icon = () => (
    <span
      className={cn(
        'flex items-center justify-center bg-secondary rounded-full',
        layout === 'vertical' ? 'size-16' : 'size-7',
        variantConfig.iconClassName
      )}
    >
      <variantConfig.icon
        className={layout === 'vertical' ? 'size-[65%]' : 'size-[70%]'}
        strokeWidth={layout === 'vertical' ? 1 : 2}
      />
    </span>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && !isLoading && handleClose()}>
      <DialogContent
        className={cn(SIZE_CLASSES[size], layout === 'vertical' ? 'py-10 gap-8' : '')}
      >
        {layout === 'vertical' ? (
          <DialogHeader className="flex flex-col items-center gap-5 text-center">
            <Icon />
            <div className="space-y-2">
              <DialogTitle className="text-center">{title || variantConfig.title}</DialogTitle>
              {description && (
                <DialogDescription className="text-center">{description}</DialogDescription>
              )}
            </div>
          </DialogHeader>
        ) : (
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon />
              <span>{title}</span>
            </DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        <div className={cn('flex', layout === 'vertical' ? 'justify-center' : 'justify-end')}>
          <LoadingButton
            onClick={handleClose}
            isLoading={isLoading}
            variant={variantConfig.buttonVariant}
            className="focus:ring-ring focus:ring-[3px] focus:border-ring"
            autoFocus
          >
            {isLoading ? <Spinner /> : confirmText}
          </LoadingButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
