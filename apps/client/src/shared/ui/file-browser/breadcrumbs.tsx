import { Fragment } from "react";
import { ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { cn } from "@/shared/utils/classnames";

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

interface BreadcrumbsProps {
  breadcrumbs: BreadcrumbItem[];
  onNavigate: (index: number) => void;
  compact?: boolean;
  className?: string;
}

/** 깊이가 깊어지면 중간 경로를 "..."으로 축약. root + 마지막 2개는 항상 표시 */
function collapseBreadcrumbs(breadcrumbs: BreadcrumbItem[]) {
  if (breadcrumbs.length <= 5) return breadcrumbs;

  return [
    breadcrumbs[0],
    { id: "__ellipsis__", name: "..." },
    breadcrumbs[breadcrumbs.length - 2],
    breadcrumbs[breadcrumbs.length - 1],
  ];
}

export function Breadcrumbs({
  breadcrumbs,
  onNavigate,
  compact,
  className,
}: BreadcrumbsProps) {
  const collapsed = collapseBreadcrumbs(breadcrumbs);

  const getOriginalIndex = (collapsedIndex: number) => {
    if (breadcrumbs.length <= 5) return collapsedIndex;
    if (collapsedIndex === 0) return 0;
    if (collapsedIndex === 1) return -1; // ellipsis
    return breadcrumbs.length - (collapsed.length - collapsedIndex);
  };

  return (
    <nav
      className={cn(
        "flex min-w-0 items-center gap-1",
        compact
          ? "sticky top-0 z-10 bg-background px-3 py-1.5 text-xs"
          : "border-b bg-muted/30 px-2 py-2 text-sm",
        className,
      )}
    >
      {collapsed.map((crumb, i) => (
        <Fragment key={crumb.id ?? "root"}>
          {i > 0 && (
            <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
          )}
          {crumb.id === "__ellipsis__" ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="shrink-0 text-muted-foreground hover:underline">
                  ...
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-w-[240px]">
                {breadcrumbs.slice(1, -1).map((mid, midIdx) => (
                  <DropdownMenuItem
                    key={mid.id}
                    title={mid.name}
                    onClick={() => onNavigate(midIdx + 1)}
                  >
                    <span className="truncate">{mid.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              className={cn(
                "max-w-[200px] shrink truncate hover:underline",
                i === collapsed.length - 1
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              )}
              title={crumb.name}
              onClick={() => onNavigate(getOriginalIndex(i))}
            >
              {crumb.name}
            </button>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
