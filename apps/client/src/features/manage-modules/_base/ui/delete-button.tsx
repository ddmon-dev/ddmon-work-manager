import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { LoadingButton } from "@/shared/ui/loading-button";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/shared/ui/button";
import { useDialog } from "@/shared/ui/app-dialog";
import type { ActionResult } from "@work-manager/types";

interface DeleteButtonProps {
  deleteFn: () => Promise<ActionResult<unknown>>;
  children?: React.ReactNode;
  dataLabel?: string;
  disabled?: boolean;
  onDisabled?: () => void;
  size?: VariantProps<typeof buttonVariants>["size"];
  variant?: VariantProps<typeof buttonVariants>["variant"];
  onSuccess?: () => void;
}

export function DeleteButton({
  deleteFn,
  children,
  dataLabel,
  disabled,
  onDisabled,
  size = "icon-sm",
  variant = "destructive-light",
  onSuccess,
}: DeleteButtonProps) {
  const dialog = useDialog();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    if (disabled) {
      if (onDisabled) {
        onDisabled();
      } else {
        dialog.alert({
          title: "Error!",
          description: "삭제할 수 없는 데이터입니다.",
          variant: "error",
          layout: "vertical",
          size: "sm",
        });
      }
      return;
    }

    const dataLabelText = dataLabel ? `[${dataLabel}]` : "";

    dialog.confirm({
      title: "데이터 삭제하기",
      description: (
        <>
          {dataLabelText && (
            <>
              <b>{dataLabelText}</b>{" "}
            </>
          )}
          데이터를 정말 삭제하시겠습니까?
          <br />
          삭제된 데이터는 복구할 수 없습니다.
        </>
      ),
      variant: "destructive",
      confirmText: "삭제",
      onConfirm: async () => {
        setIsLoading(true);
        try {
          const result = await deleteFn();
          if (!result.success) {
            toast.error(result.error);
            return false;
          }
          toast.success(
            dataLabel
              ? `[${dataLabel}] 데이터가 삭제되었습니다.`
              : "데이터가 삭제되었습니다."
          );
          onSuccess?.();
          return true;
        } catch (error) {
          console.error(error);
          toast.error("예기치 않은 오류가 발생했습니다.");
          return false;
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  return (
    <LoadingButton
      size={size}
      variant={variant}
      onClick={handleClick}
      isLoading={isLoading}
    >
      {children ?? <Trash2 />}
    </LoadingButton>
  );
}
