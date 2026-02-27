import { Button } from "@/shared/ui/button";
import { Separator } from "@/shared/ui/separator";
import type { RowActionItem } from "./row-action-menu";

interface RowActionButtonsProps {
  items: RowActionItem[];
}

export function RowActionButtons({ items }: RowActionButtonsProps) {
  const normalItems = items.filter((item) => item.variant !== "destructive");
  const destructiveItems = items.filter(
    (item) => item.variant === "destructive"
  );

  return (
    <nav className="flex items-center justify-end gap-2">
      {normalItems.map((item) => (
        <Button
          key={item.label}
          size="sm"
          variant="outline"
          onClick={item.onClick}
          disabled={item.disabled}
        >
          {item.icon}
          {item.label}
        </Button>
      ))}
      {destructiveItems.length > 0 && (
        <Separator
          orientation="vertical"
          className="data-[orientation=vertical]:h-6"
        />
      )}
      {destructiveItems.map((item) => (
        <Button
          key={item.label}
          size="sm"
          variant="destructive-light"
          onClick={item.onClick}
          disabled={item.disabled}
        >
          {item.icon}
          {item.label}
        </Button>
      ))}
    </nav>
  );
}
