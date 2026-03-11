import { useState, useEffect, useCallback, type ReactNode } from "react";
import {
  File as FileIcon,
  Folder,
  Image,
  FileText,
} from "lucide-react";
import { createElement } from "react";
import { toast } from "sonner";
import {
  useFilesQuery,
  useFilePathQuery,
  useCreateFolder,
  useDeleteFile,
  useRenameFile,
  useMoveFile,
} from "./api";
import { useDialog } from "@/shared/ui/app-dialog";
import type { FileItem } from "./types";

interface Breadcrumb {
  id: string | null;
  name: string;
}

export interface ContextMenuState {
  x: number;
  y: number;
  item: FileItem | null;
}

export function useDrive() {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [sort, setSort] = useState<"name" | "date" | "size">("name");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [moveTargetId, setMoveTargetId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const { data: items, isLoading } = useFilesQuery(
    showTrash ? null : currentFolderId,
    sort,
    order
  );
  const { data: folderPath } = useFilePathQuery(currentFolderId);

  const breadcrumbs: Breadcrumb[] = currentFolderId && folderPath
    ? [{ id: null, name: "전체 파일" }, ...folderPath]
    : [{ id: null, name: "전체 파일" }];
  const { confirm } = useDialog();
  const createFolder = useCreateFolder();
  const deleteFile = useDeleteFile();
  const renameFile = useRenameFile();
  const moveFile = useMoveFile();

  const handleNavigate = useCallback(
    (folderId: string | null) => {
      setCurrentFolderId(folderId);
      setShowTrash(false);
    },
    []
  );

  const navigateToBreadcrumb = useCallback(
    (index: number) => {
      setCurrentFolderId(breadcrumbs[index].id);
      setShowTrash(false);
    },
    [breadcrumbs]
  );

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder.mutateAsync({
      name: newFolderName.trim(),
      folderId: currentFolderId,
    });
    setNewFolderName("");
    setShowNewFolder(false);
  };

  const handleDelete = useCallback(async (id: string) => {
    await confirm({
      title: "휴지통으로 이동",
      description: "선택한 항목을 휴지통으로 이동하시겠습니까?",
      confirmText: "삭제",
      variant: "destructive",
      onConfirm: async () => {
        await deleteFile.mutateAsync(id);
        toast.success("휴지통으로 이동했습니다.");
      },
    });
  }, [deleteFile, confirm]);

  const handleRename = async (id: string) => {
    if (!renameValue.trim()) return;
    await renameFile.mutateAsync({ id, name: renameValue.trim() });
    setRenamingId(null);
  };

  const handleFileClick = useCallback((file: FileItem) => {
    if (file.isFolder) {
      handleNavigate(file.id);
      return;
    }
    const isImage = file.mimeType?.startsWith("image/");
    const isPdf = file.mimeType === "application/pdf";
    if (isImage || isPdf) {
      setPreviewFile(file);
    } else {
      window.open(`/api/files/${file.id}/download`, "_blank");
    }
  }, [handleNavigate]);

  const toggleSort = (field: "name" | "date" | "size") => {
    if (sort === field) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setSort(field);
      setOrder("asc");
    }
  };

  const handleMove = async (targetFolderId: string | null) => {
    if (!moveTargetId) return;
    try {
      await moveFile.mutateAsync({ id: moveTargetId, folderId: targetFolderId });
      toast.success("이동했습니다.");
    } catch {
      toast.error("이동에 실패했습니다.");
    }
    setMoveTargetId(null);
  };

  const handleDragDrop = async (itemId: string, targetFolderId: string | null) => {
    if (itemId === targetFolderId) return;
    try {
      await moveFile.mutateAsync({ id: itemId, folderId: targetFolderId });
      toast.success("이동했습니다.");
    } catch {
      toast.error("이동에 실패했습니다.");
    }
  };

  const openContextMenu = useCallback(
    (e: React.MouseEvent, item: FileItem | null) => {
      e.preventDefault();
      if (item) setSelectedId(item.id);
      setContextMenu({ x: e.clientX, y: e.clientY, item });
    },
    []
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // 키보드 단축키
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Input 포커스 중이거나 이름 변경 중이면 무시
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        renamingId
      ) {
        return;
      }

      switch (e.key) {
        case "Delete":
        case "Backspace": {
          if (selectedId) {
            e.preventDefault();
            handleDelete(selectedId);
            setSelectedId(null);
          }
          break;
        }
        case "F2": {
          if (selectedId) {
            e.preventDefault();
            const item = items?.find((i) => i.id === selectedId);
            if (item) {
              setRenamingId(item.id);
              setRenameValue(item.name);
            }
          }
          break;
        }
        case "Enter": {
          if (selectedId) {
            e.preventDefault();
            const item = items?.find((i) => i.id === selectedId);
            if (item) handleFileClick(item);
          }
          break;
        }
        case "Escape": {
          e.preventDefault();
          setSelectedId(null);
          closeContextMenu();
          break;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId, renamingId, items, handleDelete, handleFileClick, closeContextMenu]);

  return {
    // 상태
    currentFolderId,
    showTrash,
    sort,
    order,
    previewFile,
    newFolderName,
    showNewFolder,
    renamingId,
    renameValue,
    items,
    isLoading,
    moveTargetId,
    breadcrumbs,
    selectedId,
    contextMenu,
    // 세터
    setPreviewFile,
    setNewFolderName,
    setShowNewFolder,
    setRenamingId,
    setRenameValue,
    setShowTrash,
    setMoveTargetId,
    setSelectedId,
    // 핸들러
    handleNavigate,
    navigateToBreadcrumb,
    handleCreateFolder,
    handleDelete,
    handleRename,
    handleFileClick,
    toggleSort,
    handleMove,
    handleDragDrop,
    openContextMenu,
    closeContextMenu,
    // 유틸
    formatSize,
    getFileIcon,
  };
}

// ─── 유틸 ───

function formatSize(bytes: number | null) {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(file: FileItem): ReactNode {
  if (file.isFolder)
    return createElement(Folder, { className: "size-5 text-blue-500" });
  if (file.mimeType?.startsWith("image/"))
    return createElement(Image, { className: "size-5 text-green-500" });
  if (file.mimeType === "application/pdf")
    return createElement(FileText, { className: "size-5 text-red-500" });
  return createElement(FileIcon, { className: "size-5 text-muted-foreground" });
}
