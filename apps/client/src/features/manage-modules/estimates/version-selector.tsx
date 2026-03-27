import { format } from "date-fns";
import { ChevronsUpDown, Trash2 } from "lucide-react";
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
import { useDialog } from "@/shared/ui/app-dialog";
import { useManageSheet } from "../_base/ui";
import { useDeleteEstimateVersion } from "./api";
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
  const dialog = useDialog();
  const deleteVersion = useDeleteEstimateVersion();

  const canDelete = versions.length > 1;

  const handleDelete = (rev: EstimateVersion) => {
    dialog.confirm({
      title: "버전 삭제",
      description: `v${rev.version} ${rev.versionLabel || "버전명 없음"}을 삭제하시겠습니까?`,
      variant: "destructive",
      onConfirm: async () => {
        await deleteVersion.mutateAsync(rev.id);
        if (rev.id === currentId) {
          const next = versions.find((v) => v.id !== rev.id);
          if (next) sheet.open({ id: next.id, mode });
        }
      },
    });
  };

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
        <DropdownMenuLabel className="grid grid-cols-[2.5rem_1fr_5rem_1.5rem] gap-2 px-3 py-2 border-b text-xs font-medium text-muted-foreground">
          <span>버전</span>
          <span>버전명</span>
          <span className="text-center">발행일</span>
          <span />
        </DropdownMenuLabel>

        <div className="max-h-64 overflow-y-auto pt-2">
          {versions.map((rev) => {
            const isCurrent = rev.id === currentId;
            const isFinal = rev.id === finalEstimateId;
            const showDelete = canDelete && !isFinal;

            return (
              <DropdownMenuItem
                key={rev.id}
                className={cn(
                  "grid grid-cols-[2.5rem_1fr_5rem_1.5rem] gap-2 items-center px-3 py-2 text-sm",
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
                <span className="flex justify-center">
                  {showDelete && (
                    <button
                      type="button"
                      className="pointer-events-auto text-muted-foreground/50 hover:text-destructive transition-colors cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(rev);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </span>
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
