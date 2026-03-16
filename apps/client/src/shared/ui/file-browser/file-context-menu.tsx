import type { LucideIcon } from "lucide-react";
import { ContextMenuPortal } from "@/shared/ui/context-menu-portal";
import { ContextMenuButton } from "./context-menu-button";

// ─── 타입 ───

export type MenuItem =
  | { type: "action"; icon: LucideIcon; label: string; shortcut?: string; variant?: "destructive"; onClick: () => void }
  | { type: "separator" };

// ─── 헬퍼 ───

export function menuAction(
  icon: LucideIcon,
  label: string,
  onClick: () => void,
  opts?: { shortcut?: string; variant?: "destructive" },
): MenuItem {
  return { type: "action", icon, label, onClick, ...opts };
}

export function menuSeparator(): MenuItem {
  return { type: "separator" };
}

// ─── 렌더러 ───

interface FileContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
  minWidth?: number;
}

export function FileContextMenu({
  x,
  y,
  items,
  onClose,
  minWidth = 180,
}: FileContextMenuProps) {
  return (
    <ContextMenuPortal x={x} y={y} onClose={onClose} minWidth={minWidth}>
      {items.map((item, i) =>
        item.type === "separator" ? (
          <div key={i} className="my-1 h-px bg-border" />
        ) : (
          <ContextMenuButton
            key={i}
            icon={item.icon}
            label={item.label}
            shortcut={item.shortcut}
            variant={item.variant}
            onClick={item.onClick}
          />
        )
      )}
    </ContextMenuPortal>
  );
}
