import { format } from "date-fns";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/shared/utils/classnames";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
} from "@/shared/ui/dropdown-menu";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { useManageSheet } from "../_base/ui";
import type { ManageSheetMode } from "../_base/types";
import type { EstimateVersion } from "./types";

interface VersionSelectorProps {
  currentId: string;
  version: number;
  versionLabel?: string | null;
  finalEstimateId?: string | null;
  versions: EstimateVersion[];
  mode: ManageSheetMode;
}

export function VersionSelector({
  currentId,
  version,
  versionLabel,
  finalEstimateId,
  versions,
  mode,
}: VersionSelectorProps) {
  const sheet = useManageSheet();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="aria-expanded:bg-secondary/80 h-7 text-xs min-w-[150px] max-w-[250px] justify-between"
          variant="outline"
          rounded="full"
          size="xs"
        >
          <span className="text-muted-foreground truncate">
            v{version} {versionLabel || "버전명 없음"}
          </span>
          <ChevronsUpDown className="size-3 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-md">
        <DropdownMenuLabel className="grid grid-cols-[2.5rem_1fr_5rem] gap-2 px-3 py-2 border-b text-xs font-medium text-muted-foreground">
          <span>버전</span>
          <span>버전명</span>
          <span className="text-center">발행일</span>
        </DropdownMenuLabel>

        <div className="max-h-64 overflow-y-auto pt-2">
          {versions.map((rev) => {
            const isCurrent = rev.id === currentId;
            const isFinal = rev.id === finalEstimateId;

            return (
              <DropdownMenuItem
                key={rev.id}
                className={cn(
                  "grid grid-cols-[2.5rem_1fr_5rem] gap-2 items-center px-3 py-2 text-sm",
                  isCurrent && "pointer-events-none"
                )}
                onClick={() => {
                  if (!isCurrent) {
                    sheet.open({ id: rev.id, mode });
                  }
                }}
              >
                <span className={cn("font-medium tabular-nums", isCurrent && "text-primary font-bold")}>
                  v{rev.version}
                </span>
                <span className={cn("flex items-center gap-1.5 truncate text-muted-foreground", isCurrent && "text-primary/70 font-medium")}>
                  {isFinal && (
                    <Badge variant="success-light" className="text-xs h-6">
                      계약
                    </Badge>
                  )}
                  <span className="truncate">{rev.versionLabel || "버전명 없음"}</span>
                </span>
                <span className={cn("text-center tabular-nums text-muted-foreground", isCurrent && "text-primary/70 font-medium")}>
                  {rev.createdAt ? format(new Date(rev.createdAt), "yy.MM.dd") : "-"}
                </span>
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
