import { Eye, SquarePen, Trash2 } from "lucide-react";
import { useManageSheet } from "./manage-sheet";
import { RowActionMenu, type RowActionItem } from "./row-action-menu";
import { RowActionButtons } from "./row-action-buttons";
import type { ManageAction } from "../types";

type ActionName = Exclude<ManageAction, "create">;

interface ActionConfig {
  action: ActionName;
  label?: string;
  onClick?: (() => void) | null;
  deleteFn?: () => Promise<unknown>;
}

type ActionItemConfig = ActionName | ActionConfig;

interface RowActionsProps {
  type: "menu" | "buttons";
  id: string;
  actions: ActionItemConfig[];
  onDelete?: () => void;
}

const DEFAULTS: Record<
  ActionName,
  { label: string; icon: React.ReactNode; variant?: "destructive" }
> = {
  view: { label: "상세보기", icon: <Eye /> },
  modify: { label: "수정", icon: <SquarePen /> },
  clone: { label: "새 버전", icon: <SquarePen /> },
  delete: { label: "삭제", icon: <Trash2 />, variant: "destructive" },
};

export function RowActions({ type, id, actions, onDelete }: RowActionsProps) {
  const manageSheet = useManageSheet();

  const items: RowActionItem[] = actions.map((action) => {
    const config: ActionConfig =
      typeof action === "string" ? { action } : action;
    const defaults = DEFAULTS[config.action];

    const onClick =
      config.onClick !== undefined
        ? (config.onClick ?? (() => {}))
        : config.action === "delete"
          ? () => {
              // delete는 row-actions에서 직접 처리하지 않고,
              // 부모에서 onDelete prop으로 전달받아 사용
              onDelete?.();
            }
          : () => manageSheet.open({ id, mode: config.action as Exclude<ActionName, "delete"> });

    return {
      label: config.label ?? defaults.label,
      icon: defaults.icon,
      variant: defaults.variant,
      onClick,
    };
  });

  if (type === "menu") return <RowActionMenu items={items} />;
  return <RowActionButtons items={items} />;
}
