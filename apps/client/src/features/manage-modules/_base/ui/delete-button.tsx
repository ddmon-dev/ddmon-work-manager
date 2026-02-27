import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { LoadingButton } from "@/shared/ui/loading-button";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/shared/ui/button";
import { useConfirm } from "@/shared/ui/confirm-dialog";
import type { ActionResult } from "@work-manager/types";

interface DeleteButtonProps {
  deleteFn: () => Promise<ActionResult<unknown>>;
  children?: React.ReactNode;
  dataLabel?: string;
  size?: VariantProps<typeof buttonVariants>["size"];
  variant?: VariantProps<typeof buttonVariants>["variant"];
  onSuccess?: () => void;
}

export function DeleteButton({
  deleteFn,
  children,
  dataLabel,
  size = "icon-sm",
  variant = "destructive-light",
  onSuccess,
}: DeleteButtonProps) {
  const { confirm } = useConfirm();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    const dataLabelText = dataLabel ? `[${dataLabel}]` : "";

    confirm({
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
            return;
          }
          toast.success(
            dataLabel
              ? `[${dataLabel}] 데이터가 삭제되었습니다.`
              : "데이터가 삭제되었습니다."
          );
          onSuccess?.();
        } catch (error) {
          console.error(error);
          toast.error("예기치 않은 오류가 발생했습니다.");
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
