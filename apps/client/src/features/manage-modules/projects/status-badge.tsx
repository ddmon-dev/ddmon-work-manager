import { Badge } from "@/shared/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { cn } from "@/shared/utils/classnames";
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

  const handleSelect = async (newStatus: ProjectStatus) => {
    await updateStatus.mutateAsync({ id: projectId, status: newStatus });
  };

  return (
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
  );
}
