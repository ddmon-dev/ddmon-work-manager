import { Badge, badgeVariants } from "@/shared/ui/badge";
import type { VariantProps } from "class-variance-authority";
import { STATUS_LABELS, STATUS_VARIANTS } from "./constants";
import type { EstimateStatus } from "./types";

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const label = STATUS_LABELS[status as EstimateStatus] ?? status;
  const variant = (STATUS_VARIANTS[status as EstimateStatus] ?? "muted") as BadgeVariant;

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
