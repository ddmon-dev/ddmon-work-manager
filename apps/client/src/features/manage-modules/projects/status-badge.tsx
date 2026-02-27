import { useState } from "react";
import { Badge } from "@/shared/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { useUpdateProjectStatus } from "./api";
import { PROJECT_STATUS_LABELS } from "./config";
import type { ProjectStatus } from "./types";

const STATUS_VARIANTS: Record<
  ProjectStatus,
  "outline" | "secondary" | "default" | "destructive"
> = {
  pending: "outline",
  active: "default",
  settling: "secondary",
  completed: "default",
  discarded: "destructive",
};

interface StatusBadgeProps {
  projectId: string;
  status: ProjectStatus;
  readonly?: boolean;
}

export function StatusBadge({ projectId, status, readonly = false }: StatusBadgeProps) {
  const [open, setOpen] = useState(false);
  const updateStatus = useUpdateProjectStatus();

  const handleSelect = async (newStatus: ProjectStatus) => {
    if (newStatus === status) return;
    setOpen(false);
    await updateStatus.mutateAsync({ id: projectId, status: newStatus });
  };

  const badge = (
    <Badge variant={STATUS_VARIANTS[status]} className="cursor-pointer">
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  );

  if (readonly) return badge;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{badge}</DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map((s) => (
          <DropdownMenuItem
            key={s}
            onSelect={() => handleSelect(s)}
            disabled={s === status}
          >
            <Badge variant={STATUS_VARIANTS[s]} className="w-14 justify-center">
              {PROJECT_STATUS_LABELS[s]}
            </Badge>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
