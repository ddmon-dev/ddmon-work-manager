import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/utils/classnames";

export interface ContextMenuButtonProps {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  variant?: "destructive";
  onClick: () => void;
}

export function ContextMenuButton({
  icon: Icon,
  label,
  shortcut,
  variant,
  onClick,
}: ContextMenuButtonProps) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
        variant === "destructive" && "text-destructive hover:text-destructive"
      )}
      onClick={onClick}
    >
      <Icon className="size-3.5" />
      <span className="flex-1 text-left">{label}</span>
      {shortcut && (
        <span className="ml-auto text-xs text-muted-foreground">{shortcut}</span>
      )}
    </button>
  );
}
