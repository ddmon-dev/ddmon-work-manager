import { cn } from "@/shared/utils/classnames";
import { ChevronUp, ChevronDown } from "lucide-react";

interface SortingButtonProps {
  columnKey: string;
  currentSortKey?: string;
  onSort?: (key: string) => void;
  children?: React.ReactNode;
  className?: string;
}

export function SortingButton({
  columnKey,
  currentSortKey,
  onSort,
  children,
  className,
}: SortingButtonProps) {
  const isAsc = currentSortKey === columnKey;
  const isDesc = currentSortKey === `-${columnKey}`;
  const isSorted = isAsc || isDesc;

  const handleClick = () => {
    if (!onSort) return;
    if (isAsc) {
      onSort(`-${columnKey}`);
    } else if (isDesc) {
      onSort("");
    } else {
      onSort(columnKey);
    }
  };

  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center justify-between gap-2 px-0",
        className
      )}
      onClick={handleClick}
    >
      <span className={cn(isSorted && "text-primary font-bold")}>
        {children}
      </span>
      <div className="flex flex-col items-center gap-0">
        <ChevronUp className={cn("-mb-0.5 size-3", isAsc && "text-primary")} />
        <ChevronDown className={cn("size-3", isDesc && "text-primary")} />
      </div>
    </button>
  );
}
