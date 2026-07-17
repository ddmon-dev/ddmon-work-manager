import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useToggleFavorite, useDeleteFile, useBatchDeleteFiles } from "./api";
import { useFileBrowser } from "@/shared/hooks/use-file-browser";
import { errorMessage } from "@/shared/lib/api-client";
import { FILE_MESSAGES } from "@/shared/ui/file-browser";

export type {
  RenameSource,
  RenameState,
  ContextMenuState,
  ClipboardState,
  DragRect,
} from "@/shared/hooks/use-file-browser";


export function useDrive() {
  const [showTrash, setShowTrash] = useState(false);

  const fb = useFileBrowser({ deleteMode: "soft", rootLabel: "내 드라이브" });

  // 네비게이션 시 showTrash 해제
  const handleNavigate = useCallback(
    (folderId: string | null) => {
      setShowTrash(false);
      fb.handleNavigate(folderId);
    },
    [fb.handleNavigate]
  );

  const navigateToBreadcrumb = useCallback(
    (index: number) => {
      setShowTrash(false);
      fb.navigateToBreadcrumb(index);
    },
    [fb.navigateToBreadcrumb]
  );

  // 드라이브 전용: 즐겨찾기
  const toggleFavoriteMutation = useToggleFavorite();
  const handleToggleFavorite = useCallback(
    async (id: string, currentState: boolean) => {
      try {
        await toggleFavoriteMutation.mutateAsync({
          id,
          isFavorited: !currentState,
        });
        toast.success(
          !currentState
            ? FILE_MESSAGES.FAVORITE_ADDED
            : FILE_MESSAGES.FAVORITE_REMOVED
        );
      } catch {
        toast.error(FILE_MESSAGES.FAVORITE_FAILED);
      }
    },
    [toggleFavoriteMutation]
  );

  // 드라이브 전용: 휴지통 드래그 (확인 없이 바로 소프트 삭제)
  const deleteFile = useDeleteFile();
  const batchDeleteFiles = useBatchDeleteFiles();

  const handleDragToTrash = useCallback(
    async (itemId: string) => {
      const multi = fb.selectedIds.has(itemId) && fb.selectedIds.size > 1;
      const ids = multi ? Array.from(fb.selectedIds) : [itemId];

      try {
        if (ids.length === 1) {
          await deleteFile.mutateAsync(ids[0]);
        } else {
          await batchDeleteFiles.mutateAsync(ids);
        }
        toast.success(FILE_MESSAGES.MOVED_TO_TRASH);
        fb.clearSelection();
      } catch (err) {
        toast.error(errorMessage(err, FILE_MESSAGES.DELETE_FAILED));
      }
    },
    [deleteFile, batchDeleteFiles, fb.selectedIds, fb.clearSelection]
  );

  return {
    ...fb,
    handleNavigate, // 래핑된 버전으로 override
    navigateToBreadcrumb, // 래핑된 버전으로 override
    showTrash,
    setShowTrash,
    handleToggleFavorite,
    handleDragToTrash,
  };
}
