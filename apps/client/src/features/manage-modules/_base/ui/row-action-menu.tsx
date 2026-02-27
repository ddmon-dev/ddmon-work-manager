import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Ellipsis } from "lucide-react";

export interface RowActionItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive";
  disabled?: boolean;
}

interface RowActionMenuProps {
  items: RowActionItem[];
}

export function RowActionMenu({ items }: RowActionMenuProps) {
  const normalItems = items.filter((item) => item.variant !== "destructive");
  const destructiveItems = items.filter(
    (item) => item.variant === "destructive"
  );

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-xs">
          <Ellipsis />
          <span className="sr-only">행 메뉴 열기</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {normalItems.map((item) => (
          <DropdownMenuItem
            key={item.label}
            onSelect={item.onClick}
            disabled={item.disabled}
          >
            {item.icon}
            {item.label}
          </DropdownMenuItem>
        ))}
        {destructiveItems.length > 0 && <DropdownMenuSeparator />}
        {destructiveItems.map((item) => (
          <DropdownMenuItem
            key={item.label}
            variant="destructive"
            onSelect={item.onClick}
            disabled={item.disabled}
          >
            {item.icon}
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
