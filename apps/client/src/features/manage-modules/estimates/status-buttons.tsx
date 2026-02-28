import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { CRUD_ERRORS } from "@/shared/constants/error-messages";
import { SUCCESS_MESSAGES } from "@/shared/constants/success-messages";
import { cn } from "@/shared/utils/classnames";
import { Badge, badgeVariants } from "@/shared/ui/badge";
import type { VariantProps } from "class-variance-authority";

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
} from "@/shared/ui/dropdown-menu";
import { useManageSheet } from "../_base/ui";
import { useUpdateEstimateStatus, useUpdateFinalVersion } from "./api";
import {
  ESTIMATE_STATUS,
  STATUS_LABELS,
  STATUS_VARIANTS,
} from "./constants";
import type { EstimateStatus, EstimateVersion } from "./types";

interface StatusButtonsProps {
  estimateNumber: string;
  currentStatus: EstimateStatus;
  finalEstimateId: string | null | undefined;
  versions: EstimateVersion[];
  onSuccess: () => void;
}

export function StatusButtons({
  estimateNumber,
  currentStatus,
  finalEstimateId,
  versions,
  onSuccess,
}: StatusButtonsProps) {
  const sheet = useManageSheet();
  const updateStatus = useUpdateEstimateStatus();
  const updateFinal = useUpdateFinalVersion();
  const [isUpdating, setIsUpdating] = useState(false);
  const currentId = sheet.data?.id;

  async function handleStatusChange(newStatus: EstimateStatus, newFinalEstimateId?: string) {
    setIsUpdating(true);
    try {
      await updateStatus.mutateAsync({ estimateNumber, status: newStatus });
      if (newFinalEstimateId) {
        await updateFinal.mutateAsync({ estimateNumber, finalEstimateId: newFinalEstimateId });
      }
      toast.success(SUCCESS_MESSAGES.UPDATE_SUCCESS("상태"));
      if (newFinalEstimateId && newFinalEstimateId !== currentId) {
        sheet.open({ id: newFinalEstimateId, mode: "view" });
      } else {
        onSuccess();
      }
    } catch {
      toast.error(CRUD_ERRORS.UPDATE_FAILED("상태"));
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleUpdateFinalVersion(estimateId: string) {
    setIsUpdating(true);
    try {
      await updateFinal.mutateAsync({ estimateNumber, finalEstimateId: estimateId });
      toast.success(SUCCESS_MESSAGES.UPDATE_SUCCESS("계약 버전"));
      if (estimateId !== currentId) {
        sheet.open({ id: estimateId, mode: "view" });
      } else {
        onSuccess();
      }
    } catch {
      toast.error(CRUD_ERRORS.UPDATE_FAILED("계약 버전"));
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.values(ESTIMATE_STATUS).map((status) => {
        const isActive = status === currentStatus;

        if (status === "contracted") {
          return (
            <DropdownMenu key={status}>
              <DropdownMenuTrigger asChild>
                <Badge
                  variant={(isActive ? STATUS_VARIANTS[status] : "muted") as BadgeVariant}
                  className={cn(
                    "gap-0.5 cursor-pointer transition-colors",
                    isUpdating && "pointer-events-none"
                  )}
                >
                  {isActive
                    ? `${STATUS_LABELS[status]} v${versions.find((r) => r.id === finalEstimateId)?.version ?? "?"}`
                    : STATUS_LABELS[status]}
                  {isActive && <ChevronDown className="size-3" />}
                </Badge>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                  계약 버전을 선택해주세요.
                </DropdownMenuLabel>
                {versions.map((rev) => (
                  <DropdownMenuItem
                    key={rev.id}
                    className={cn(
                      rev.id === finalEstimateId && "text-primary! font-medium pointer-events-none"
                    )}
                    onClick={() => {
                      if (currentStatus === "contracted" && rev.id !== finalEstimateId) {
                        handleUpdateFinalVersion(rev.id);
                      } else {
                        handleStatusChange("contracted", rev.id);
                      }
                    }}
                  >
                    v{rev.version}
                    {rev.versionLabel && (
                      <span className={cn("ml-1 truncate text-muted-foreground", rev.id === finalEstimateId && "text-primary/70")}>
                        {rev.versionLabel}
                      </span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }

        return (
          <Badge
            key={status}
            variant={(isActive ? STATUS_VARIANTS[status] : "muted") as BadgeVariant}
            className={cn(
              "transition-colors",
              isUpdating || isActive
                ? "pointer-events-none"
                : "cursor-pointer hover:bg-accent"
            )}
            onClick={() => handleStatusChange(status)}
          >
            {STATUS_LABELS[status]}
          </Badge>
        );
      })}
    </div>
  );
}
