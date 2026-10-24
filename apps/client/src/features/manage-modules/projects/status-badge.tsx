import { Badge } from "@/shared/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { cn } from "@/shared/utils/classnames";
import { useProjectSaveState } from "./project-status-cache";
import { useUpdateProjectStatus } from "./api";
import { PROJECT_STATUS_LABELS } from "./config";
import type { ProjectStatus } from "./types";

const STATUS_VARIANTS: Record<ProjectStatus, string> = {
  pending: "outline",
  active: "info-light",
  settling: "warning-light",
  completed: "success-light",
  discarded: "secondary",
};

const DOT_COLORS: Record<string, string> = {
  "info-light": "bg-info",
  "warning-light": "bg-warning",
  "success-light": "bg-success",
};

interface StatusBadgeProps {
  projectId: string;
  status: ProjectStatus;
  readonly?: boolean;
  className?: string;
}

export function StatusBadge({
  projectId,
  status,
  readonly = false,
  className,
}: StatusBadgeProps) {
  const updateStatus = useUpdateProjectStatus();
  const saveState = useProjectSaveState(projectId);
  const variant = STATUS_VARIANTS[status] as Parameters<typeof Badge>[0]["variant"];
  const label = PROJECT_STATUS_LABELS[status];

  const badge = (
    <Badge variant={variant} className={cn("min-w-[60px] justify-center", className)}>
      {label}
    </Badge>
  );

  if (readonly) return badge;

  const options = (Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).filter(
    (s) => s !== status
  );

  const handleSelect = (newStatus: ProjectStatus) => {
    updateStatus.mutate({ id: projectId, status: newStatus });
  };

  return (
    <span className="inline-flex flex-col items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Badge
            variant={variant}
            className={cn("min-w-[60px] justify-center cursor-pointer", className)}
            asChild
          >
            <button type="button">{label}</button>
          </Badge>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-0">
          {options.map((s) => {
            const optVariant = STATUS_VARIANTS[s];
            const dotColor = DOT_COLORS[optVariant] ?? "bg-muted-foreground/40";
            return (
              <DropdownMenuItem
                key={s}
                className="cursor-pointer pr-4"
                onSelect={() => handleSelect(s)}
              >
                <span className={cn("size-2.5 rounded-full shrink-0", dotColor)} />
                {PROJECT_STATUS_LABELS[s]}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {saveState !== "idle" && (
        <span role="status" className={cn("text-[10px] whitespace-nowrap", saveState === "error" ? "text-destructive" : "text-muted-foreground")}>
          {saveState === "saving" ? "저장 중" : "저장 실패"}
        </span>
      )}
    </span>
  );
}
