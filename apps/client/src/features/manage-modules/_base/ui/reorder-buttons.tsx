import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";
import { ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import type { ActionResult } from "@packages/types";

interface ReorderButtonsProps {
  id: string;
  isFirst: boolean;
  isLast: boolean;
  disabled?: boolean;
  onSortStart?: () => void;
  onSortEnd?: () => void;
  swapOrderFn: (params: {
    id: string;
    direction: "up" | "down";
  }) => Promise<ActionResult<unknown>>;
}

export function ReorderButtons({
  id,
  isFirst,
  isLast,
  disabled = false,
  onSortStart,
  onSortEnd,
  swapOrderFn,
}: ReorderButtonsProps) {
  const handleMove = async (direction: "up" | "down") => {
    onSortStart?.();
    try {
      const result = await swapOrderFn({ id, direction });
      if (!result.success) {
        toast.error(result.error);
      }
    } finally {
      onSortEnd?.();
    }
  };

  return (
    <div className="inline-flex flex-row">
      <Button
        variant="outline"
        size="icon-sm"
        className="size-7! rounded-l-[10px]! rounded-r-none border-r-0"
        onClick={() => handleMove("up")}
        disabled={disabled || isFirst}
      >
        {disabled ? (
          <Spinner className="size-[12px]!" />
        ) : (
          <ChevronUp className="size-[12px]!" />
        )}
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        className="size-7! rounded-l-none rounded-r-[10px]!"
        onClick={() => handleMove("down")}
        disabled={disabled || isLast}
      >
        {disabled ? (
          <Spinner className="size-[12px]!" />
        ) : (
          <ChevronDown className="size-[12px]!" />
        )}
      </Button>
    </div>
  );
}
