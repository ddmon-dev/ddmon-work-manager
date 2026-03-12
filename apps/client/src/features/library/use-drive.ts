import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode, type Dispatch, type SetStateAction } from "react";
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
  useBatchDeleteFiles,
  useBatchMoveFiles,
} from "./api";
import { api } from "@/shared/lib/api-client";
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

// ─── 소규모 로컬 함수 ───

function useNavigation() {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [showTrash, setShowTrash] = useState(false);

  const { data: folderPath } = useFilePathQuery(currentFolderId);

  useEffect(() => {
    if (currentFolderId && folderPath !== undefined) {
      const currentInPath = folderPath?.some((p) => p.id === currentFolderId);
      if (!currentInPath) {
        setCurrentFolderId(null);
      }
    }
  }, [currentFolderId, folderPath]);

  const breadcrumbs: Breadcrumb[] =
    currentFolderId && folderPath
      ? [{ id: null, name: "전체 파일" }, ...folderPath]
      : [{ id: null, name: "전체 파일" }];

  const handleNavigate = useCallback((folderId: string | null) => {
    setCurrentFolderId(folderId);
    setShowTrash(false);
  }, []);

  const navigateToBreadcrumb = useCallback(
    (index: number) => {
      setCurrentFolderId(breadcrumbs[index].id);
      setShowTrash(false);
    },
    [breadcrumbs]
  );

  return {
    currentFolderId,
    showTrash,
    breadcrumbs,
    setShowTrash,
    handleNavigate,
    navigateToBreadcrumb,
  };
}

function useSorting() {
  const [sort, setSort] = useState<"name" | "date" | "size">("name");
  const [order, setOrder] = useState<"asc" | "desc">("asc");

  const toggleSort = useCallback(
    (field: "name" | "date" | "size") => {
      if (sort === field) {
        setOrder(order === "asc" ? "desc" : "asc");
      } else {
        setSort(field);
        setOrder("asc");
      }
    },
    [sort, order]
  );

  return { sort, order, toggleSort };
}

function useRenaming() {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameFile = useRenameFile();
  const { alert } = useDialog();

  const startRename = useCallback((id: string, name: string) => {
    setRenamingId(id);
    setRenameValue(name);
  }, []);

  const handleRename = async (id: string) => {
    if (!renameValue.trim()) return;
    try {
      await renameFile.mutateAsync({ id, name: renameValue.trim() });
      setRenamingId(null);
    } catch (err) {
      alert({
        variant: "error",
        title: "이름 변경 실패",
        description: err instanceof Error ? err.message : "이름 변경에 실패했습니다.",
      });
    }
  };

  return {
    renamingId,
    renameValue,
    setRenamingId,
    setRenameValue,
    startRename,
    handleRename,
  };
}

function useNewFolder(currentFolderId: string | null) {
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const createFolder = useCreateFolder();

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder.mutateAsync({
      name: newFolderName.trim(),
      folderId: currentFolderId,
    });
    setNewFolderName("");
    setShowNewFolder(false);
  };

  return {
    showNewFolder,
    newFolderName,
    setShowNewFolder,
    setNewFolderName,
    handleCreateFolder,
  };
}

// ─── 메인 훅 ───

export function useDrive() {
  const nav = useNavigation();
  const sorting = useSorting();
  const renaming = useRenaming();
  const folder = useNewFolder(nav.currentFolderId);

  const [moveTargetIds, setMoveTargetIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const lastSelectedIdRef = useRef<string | null>(null);

  const { data: rawItems, isLoading } = useFilesQuery(
    nav.showTrash ? null : nav.currentFolderId
  );

  // 클라이언트 정렬 (서버는 항상 name asc 반환)
  const items = useMemo(() => {
    if (!rawItems) return undefined;
    const folders = rawItems.filter((i) => i.isFolder);
    const nonFolders = rawItems.filter((i) => !i.isFolder);

    const compareFn = (a: FileItem, b: FileItem) => {
      let result: number;
      switch (sorting.sort) {
        case "date":
          result =
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case "size":
          result = (a.size ?? 0) - (b.size ?? 0);
          break;
        default: // name
          result = a.name.localeCompare(b.name, "ko");
          break;
      }
      return sorting.order === "desc" ? -result : result;
    };

    return [...folders.sort(compareFn), ...nonFolders.sort(compareFn)];
  }, [rawItems, sorting.sort, sorting.order]);

  const dragSelection = useDragSelection(selectedIds, setSelectedIds);

  const { confirm, alert } = useDialog();
  const deleteFile = useDeleteFile();
  const batchDeleteFiles = useBatchDeleteFiles();
  const moveFile = useMoveFile();
  const batchMoveFiles = useBatchMoveFiles();

  // 선택 핸들러
  const selectItem = useCallback(
    (id: string, e?: { metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean }) => {
      setSelectedIds((prev) => {
        if (e?.shiftKey && lastSelectedIdRef.current && items) {
          // Shift+Click: 범위 선택
          const lastIndex = items.findIndex((i) => i.id === lastSelectedIdRef.current);
          const currentIndex = items.findIndex((i) => i.id === id);
          if (lastIndex !== -1 && currentIndex !== -1) {
            const start = Math.min(lastIndex, currentIndex);
            const end = Math.max(lastIndex, currentIndex);
            const rangeIds = items.slice(start, end + 1).map((i) => i.id);
            const next = new Set(prev);
            for (const rid of rangeIds) next.add(rid);
            return next;
          }
        }

        if (e?.metaKey || e?.ctrlKey) {
          // Cmd/Ctrl+Click: 토글
          const next = new Set(prev);
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
          lastSelectedIdRef.current = id;
          return next;
        }

        // 일반 클릭: 단일 선택
        lastSelectedIdRef.current = id;
        return new Set([id]);
      });
    },
    [items]
  );

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    lastSelectedIdRef.current = null;
  }, []);

  // 다중 선택 여부 판단 (contextMenu의 item이 선택 그룹에 포함되는지)
  const isMultiSelection = useCallback(
    (itemId?: string | null) => {
      if (selectedIds.size <= 1) return false;
      if (itemId && !selectedIds.has(itemId)) return false;
      return true;
    },
    [selectedIds]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const multi = isMultiSelection(id);
      const count = multi ? selectedIds.size : 1;
      const ids = multi ? Array.from(selectedIds) : [id];

      await confirm({
        title: "휴지통으로 이동",
        description: `선택한 ${count}개 항목을 휴지통으로 이동하시겠습니까?`,
        confirmText: "삭제",
        variant: "destructive",
        onConfirm: async () => {
          if (ids.length === 1) {
            await deleteFile.mutateAsync(ids[0]);
          } else {
            await batchDeleteFiles.mutateAsync(ids);
          }
          toast.success("휴지통으로 이동했습니다.");
          clearSelection();
        },
      });
    },
    [deleteFile, batchDeleteFiles, confirm, selectedIds, isMultiSelection, clearSelection]
  );

  const handleFileClick = useCallback(
    (file: FileItem) => {
      if (file.isFolder) {
        nav.handleNavigate(file.id);
        clearSelection();
        return;
      }
      api.post(`/files/${file.id}/open`);
    },
    [nav.handleNavigate, clearSelection]
  );

  const handleMove = async (targetFolderId: string | null) => {
    if (moveTargetIds.length === 0) return;
    try {
      if (moveTargetIds.length === 1) {
        await moveFile.mutateAsync({
          id: moveTargetIds[0],
          folderId: targetFolderId,
        });
        toast.success("이동했습니다.");
      } else {
        await batchMoveFiles.mutateAsync({
          ids: moveTargetIds,
          folderId: targetFolderId,
        });
        toast.success(`${moveTargetIds.length}개 항목을 이동했습니다.`);
      }
    } catch (err) {
      alert({
        variant: "error",
        title: "이동 실패",
        description: err instanceof Error ? err.message : "이동에 실패했습니다.",
      });
    }
    setMoveTargetIds([]);
    clearSelection();
  };

  const startMove = useCallback(
    (id: string) => {
      const multi = isMultiSelection(id);
      if (multi) {
        setMoveTargetIds(Array.from(selectedIds));
      } else {
        setMoveTargetIds([id]);
      }
    },
    [selectedIds, isMultiSelection]
  );

  const handleDragDrop = async (
    itemId: string,
    targetFolderId: string | null
  ) => {
    if (itemId === targetFolderId) return;

    // 드래그한 항목이 선택된 그룹에 포함되면 전체 이동
    if (selectedIds.has(itemId) && selectedIds.size > 1) {
      const ids = Array.from(selectedIds).filter((id) => id !== targetFolderId);
      if (ids.length === 0) return;
      try {
        await batchMoveFiles.mutateAsync({ ids, folderId: targetFolderId });
        toast.success(`${ids.length}개 항목을 이동했습니다.`);
        clearSelection();
      } catch (err) {
        alert({
          variant: "error",
          title: "이동 실패",
          description: err instanceof Error ? err.message : "이동에 실패했습니다.",
        });
      }
      return;
    }

    try {
      await moveFile.mutateAsync({ id: itemId, folderId: targetFolderId });
      toast.success("이동했습니다.");
    } catch (err) {
      alert({
        variant: "error",
        title: "이동 실패",
        description: err instanceof Error ? err.message : "이동에 실패했습니다.",
      });
    }
  };

  const openContextMenu = useCallback(
    (e: React.MouseEvent, item: FileItem | null) => {
      e.preventDefault();
      if (item) {
        // 우클릭한 항목이 기존 선택에 포함되지 않으면 단일 선택으로 전환
        if (!selectedIds.has(item.id)) {
          setSelectedIds(new Set([item.id]));
          lastSelectedIdRef.current = item.id;
        }
      }
      setContextMenu({ x: e.clientX, y: e.clientY, item });
    },
    [selectedIds]
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // 키보드 단축키
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        renaming.renamingId
      ) {
        return;
      }

      switch (e.key) {
        case "Delete":
        case "Backspace": {
          if (selectedIds.size > 0) {
            e.preventDefault();
            const firstId = Array.from(selectedIds)[0];
            handleDelete(firstId);
          }
          break;
        }
        case "F2": {
          if (selectedIds.size === 1) {
            e.preventDefault();
            const id = Array.from(selectedIds)[0];
            const item = items?.find((i) => i.id === id);
            if (item) {
              renaming.startRename(item.id, item.name);
            }
          }
          break;
        }
        case "Enter": {
          if (selectedIds.size === 1) {
            e.preventDefault();
            const id = Array.from(selectedIds)[0];
            const item = items?.find((i) => i.id === id);
            if (item) handleFileClick(item);
          }
          break;
        }
        case "Escape": {
          e.preventDefault();
          clearSelection();
          closeContextMenu();
          break;
        }
        case "a": {
          if ((e.metaKey || e.ctrlKey) && items) {
            e.preventDefault();
            setSelectedIds(new Set(items.map((i) => i.id)));
          }
          break;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    selectedIds,
    renaming.renamingId,
    renaming.startRename,
    items,
    handleDelete,
    handleFileClick,
    closeContextMenu,
    clearSelection,
  ]);

  return {
    // 상태
    currentFolderId: nav.currentFolderId,
    showTrash: nav.showTrash,
    sort: sorting.sort,
    order: sorting.order,
    newFolderName: folder.newFolderName,
    showNewFolder: folder.showNewFolder,
    renamingId: renaming.renamingId,
    renameValue: renaming.renameValue,
    items,
    isLoading,
    moveTargetIds,
    breadcrumbs: nav.breadcrumbs,
    selectedIds,
    contextMenu,
    // 세터
    setNewFolderName: folder.setNewFolderName,
    setShowNewFolder: folder.setShowNewFolder,
    setRenamingId: renaming.setRenamingId,
    setRenameValue: renaming.setRenameValue,
    setShowTrash: nav.setShowTrash,
    setMoveTargetIds,
    // 핸들러
    handleNavigate: nav.handleNavigate,
    navigateToBreadcrumb: nav.navigateToBreadcrumb,
    handleCreateFolder: folder.handleCreateFolder,
    handleDelete,
    handleRename: renaming.handleRename,
    handleFileClick,
    toggleSort: sorting.toggleSort,
    handleMove,
    handleDragDrop,
    openContextMenu,
    closeContextMenu,
    selectItem,
    clearSelection,
    startMove,
    isMultiSelection,
    // 드래그 선택
    dragRect: dragSelection.dragRect,
    dragContainerRef: dragSelection.containerRef,
    handleDragSelectStart: dragSelection.handleDragSelectStart,
    wasDragSelectingRef: dragSelection.wasDragSelectingRef,
    // 유틸
    formatSize,
    getFileIcon,
  };
}

// ─── 드래그 범위 선택 ───

export interface DragRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function useDragSelection(
  selectedIds: Set<string>,
  setSelectedIds: Dispatch<SetStateAction<Set<string>>>
) {
  const [dragRect, setDragRect] = useState<DragRect | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const initialSelectionRef = useRef<Set<string>>(new Set());
  const wasDragSelectingRef = useRef(false);

  const handleDragSelectStart = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest("[data-item-id], button, input, a")) return;

      dragStartRef.current = { x: e.clientX, y: e.clientY };
      initialSelectionRef.current = e.shiftKey
        ? new Set(selectedIds)
        : new Set();
      wasDragSelectingRef.current = false;
    },
    [selectedIds]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const container = containerRef.current;
      if (!container) return;

      const { x: startX, y: startY } = dragStartRef.current;
      if (Math.abs(e.clientX - startX) < 5 && Math.abs(e.clientY - startY) < 5)
        return;

      wasDragSelectingRef.current = true;

      // 컨테이너 범위로 클램핑
      const cr = container.getBoundingClientRect();
      const cx = Math.max(cr.left, Math.min(e.clientX, cr.right));
      const cy = Math.max(cr.top, Math.min(e.clientY, cr.bottom));

      const newRect: DragRect = {
        x: Math.min(startX, cx),
        y: Math.min(startY, cy),
        width: Math.abs(cx - startX),
        height: Math.abs(cy - startY),
      };
      setDragRect(newRect);

      // 행과의 교차 판정
      const rows = container.querySelectorAll<HTMLElement>("[data-item-id]");
      const newSelected = new Set(initialSelectionRef.current);
      rows.forEach((row) => {
        const rr = row.getBoundingClientRect();
        const intersects = !(
          newRect.x + newRect.width < rr.left ||
          newRect.x > rr.right ||
          newRect.y + newRect.height < rr.top ||
          newRect.y > rr.bottom
        );
        if (intersects) {
          const itemId = row.getAttribute("data-item-id");
          if (itemId) newSelected.add(itemId);
        }
      });
      setSelectedIds(newSelected);
    };

    const handleMouseUp = () => {
      if (dragStartRef.current) {
        dragStartRef.current = null;
        setDragRect(null);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [setSelectedIds]);

  return { dragRect, containerRef, handleDragSelectStart, wasDragSelectingRef };
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
