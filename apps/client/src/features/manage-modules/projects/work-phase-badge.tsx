import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/utils/classnames";
import { WORK_PHASE_LABELS } from "./config";
import type { WorkPhase } from "./types";

const PHASE_VARIANTS: Record<WorkPhase, string> = {
  preparing: "outline",
  working: "info-light",
  reviewing: "warning-light",
  delivered: "success-light",
};

interface WorkPhaseBadgeProps {
  workPhase: WorkPhase;
  className?: string;
}

export function WorkPhaseBadge({ workPhase, className }: WorkPhaseBadgeProps) {
  const variant = PHASE_VARIANTS[workPhase] as Parameters<typeof Badge>[0]["variant"];
  const label = WORK_PHASE_LABELS[workPhase];

  return (
    <Badge variant={variant} className={cn("min-w-0 justify-center", className)}>
      {label}
    </Badge>
  );
}
