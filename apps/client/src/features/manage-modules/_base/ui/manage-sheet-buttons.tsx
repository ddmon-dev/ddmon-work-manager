import type { VariantProps } from "class-variance-authority";
import { cn } from "@/shared/utils/classnames";
import { Button, buttonVariants } from "@/shared/ui/button";
import { LoadingButton } from "@/shared/ui/loading-button";
import { useManageSheet } from "./manage-sheet";
import type { ManageSheetMode } from "../types";

interface ManageFormSubmitProps {
  isLoading: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function ManageFormSubmit({
  isLoading,
  className,
  children = "저장하기",
}: ManageFormSubmitProps) {
  return (
    <LoadingButton
      type="submit"
      isLoading={isLoading}
      className={cn("font-semibold", className)}
    >
      {children}
    </LoadingButton>
  );
}

interface ManageSheetCloseProps {
  children?: React.ReactNode;
  className?: string;
}

export function ManageSheetClose({
  children = "닫기",
  className,
}: ManageSheetCloseProps) {
  const manageSheet = useManageSheet();
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={() => manageSheet.closeWithGuard()}
      className={cn("font-semibold", className)}
    >
      {children}
    </Button>
  );
}

const MODE_CHANGE_LABELS: Record<ManageSheetMode, string> = {
  view: "상세 보기",
  modify: "수정하기",
  create: "생성하기",
  duplicate: "복사하기",
};

const MODE_CHANGE_VARIANTS: Record<
  ManageSheetMode,
  VariantProps<typeof buttonVariants>["variant"]
> = {
  view: "outline",
  modify: "black",
  create: "black",
  duplicate: "black",
};

interface ManageSheetModeChangeProps {
  children?: React.ReactNode;
  className?: string;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  mode: ManageSheetMode;
}

export function ManageSheetModeChange({
  children,
  className,
  variant,
  mode,
}: ManageSheetModeChangeProps) {
  const manageSheet = useManageSheet();
  return (
    <Button
      type="button"
      variant={variant ?? MODE_CHANGE_VARIANTS[mode]}
      onClick={() => manageSheet.setModeWithGuard(mode)}
      className={cn("font-semibold", className)}
    >
      {children ?? MODE_CHANGE_LABELS[mode]}
    </Button>
  );
}
