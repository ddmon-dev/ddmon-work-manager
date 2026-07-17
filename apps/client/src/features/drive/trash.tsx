import { useState, useCallback } from "react";
import { RotateCcw, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/utils/classnames";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/shared/ui/empty";
import {
  useTrashQuery,
  useRestoreFile,
  usePermanentDeleteFile,
  useEmptyTrash,
} from "./api";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import { errorMessage } from "@/shared/lib/api-client";
import { useDialog } from "@/shared/ui/app-dialog";
import { ContextMenuPortal } from "@/shared/ui/context-menu-portal";
import type { TrashItem } from "./types";

interface ContextMenuState {
  x: number;
  y: number;
  item: TrashItem;
}

export function TrashView() {
  const { data: items, isLoading } = useTrashQuery();
  const restoreFile = useRestoreFile();
  const permanentDeleteFile = usePermanentDeleteFile();
  const emptyTrash = useEmptyTrash();
  const { confirm } = useDialog();
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const openContextMenu = useCallback(
    (e: React.MouseEvent, item: TrashItem) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, item });
    },
    []
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleRestore = async (id: string) => {
    await confirm({
      title: "복원",
      description: "이 항목을 원래 위치로 복원하시겠습니까?",
      confirmText: "복원",
      onConfirm: async () => {
        try {
          await restoreFile.mutateAsync(id);
          toast.success("복원되었습니다.");
        } catch (err) {
          toast.error(errorMessage(err, "복원에 실패했습니다."));
        }
      },
    });
  };

  const handlePermanentDelete = async (id: string) => {
    await confirm({
      title: "영구 삭제",
      description: "이 항목을 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
      confirmText: "영구 삭제",
      variant: "destructive",
      onConfirm: async () => {
        try {
          await permanentDeleteFile.mutateAsync(id);
          toast.success("영구 삭제되었습니다.");
        } catch (err) {
          toast.error(errorMessage(err, "영구 삭제에 실패했습니다."));
        }
      },
    });
  };

  const handleEmptyTrash = async () => {
    await confirm({
      title: "휴지통 비우기",
      description: "휴지통의 모든 항목을 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
      confirmText: "모두 삭제",
      variant: "destructive",
      onConfirm: async () => {
        try {
          await emptyTrash.mutateAsync();
          toast.success("휴지통을 비웠습니다.");
        } catch (err) {
          toast.error(errorMessage(err, "휴지통 비우기에 실패했습니다."));
        }
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!items?.length) {
    return (
      <Empty className="h-full border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Trash2 />
          </EmptyMedia>
          <EmptyTitle>휴지통이 비어있습니다</EmptyTitle>
          <EmptyDescription>
            삭제된 항목이 여기에 표시됩니다.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="text-sm font-medium">
          휴지통 ({items.length})
        </span>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleEmptyTrash}
          disabled={emptyTrash.isPending}
        >
          <AlertTriangle className="mr-1 size-3.5" />
          비우기
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {items.map((item) => (
          <div
            key={`${item.type}-${item.id}`}
            className="flex items-center justify-between border-b px-4 py-3"
            onContextMenu={(e) => openContextMenu(e, item)}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                {item.isFolder ? "폴더" : "파일"}
                {" · "}
                {formatDistanceToNow(new Date(item.deletedAt), {
                  addSuffix: true,
                  locale: ko,
                })}
                {" 삭제"}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => handleRestore(item.id)}
              >
                <RotateCcw className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-destructive"
                onClick={() => handlePermanentDelete(item.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {contextMenu && (
        <TrashContextMenu
          contextMenu={contextMenu}
          onClose={closeContextMenu}
          onRestore={(item) => {
            closeContextMenu();
            handleRestore(item.id);
          }}
          onDelete={(item) => {
            closeContextMenu();
            handlePermanentDelete(item.id);
          }}
        />
      )}
    </div>
  );
}

// ─── TrashContextMenu (ContextMenuPortal 사용) ───

function TrashContextMenu({
  contextMenu,
  onClose,
  onRestore,
  onDelete,
}: {
  contextMenu: ContextMenuState;
  onClose: () => void;
  onRestore: (item: TrashItem) => void;
  onDelete: (item: TrashItem) => void;
}) {
  const { item } = contextMenu;

  return (
    <ContextMenuPortal x={contextMenu.x} y={contextMenu.y} onClose={onClose}>
      <button
        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
        onClick={() => onRestore(item)}
      >
        <RotateCcw className="size-3.5" />
        <span>복원</span>
      </button>
      <div className="my-1 h-px bg-border" />
      <button
        className={cn(
          "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent",
          "text-destructive hover:text-destructive"
        )}
        onClick={() => onDelete(item)}
      >
        <Trash2 className="size-3.5" />
        <span>영구 삭제</span>
      </button>
    </ContextMenuPortal>
  );
}
