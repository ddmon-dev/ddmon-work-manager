import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import { toast } from "sonner";
import {
  useFilesQuery,
  useFilePathQuery,
  useCreateFolder,
  useDeleteFile,
  useRenameFile,
  useBatchDeleteFiles,
  useBatchMoveFiles,
  useOpenFile,
  useDuplicateFile,
  useCopyFiles,
  usePermanentDeleteFile,
  type FileOwner,
} from "@/shared/lib/file-api";
import { useDialog } from "@/shared/ui/app-dialog";
import type { FileItem } from "@/shared/lib/file-types";

// ─── 상수 ───

export const PARENT_ROW_ID = "__parent__";

// ─── 타입 ───

export interface Breadcrumb {
  id: string | null;
  name: string;
}

export type RenameSource = "list" | "tree" | "favorite";

export interface RenameState {
  id: string;
  value: string;
  source: RenameSource;
}

export interface ContextMenuState {
  x: number;
  y: number;
  item: FileItem | null;
  source: "tree" | "list" | "favorite" | "parent";
}

export interface ClipboardState {
  ids: string[];
  sourceFolderId: string | null;
}

export interface DragRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UseFileBrowserOptions {
  owner?: FileOwner;
  deleteMode: "soft" | "permanent";
  rootLabel?: string;
}

// ─── 내부 훅 ───

function useNavigation(rootLabel: string) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const { data: folderPath } = useFilePathQuery(currentFolderId);

  useEffect(() => {
    if (currentFolderId && folderPath !== undefined) {
      const currentInPath = folderPath?.some((p) => p.id === currentFolderId);
      if (!currentInPath) setCurrentFolderId(null);
    }
  }, [currentFolderId, folderPath]);

  const breadcrumbs: Breadcrumb[] = useMemo(
    () =>
      currentFolderId && folderPath
        ? [{ id: null, name: rootLabel }, ...folderPath]
        : [{ id: null, name: rootLabel }],
    [currentFolderId, folderPath, rootLabel]
  );

  const handleNavigate = useCallback((folderId: string | null) => {
    setCurrentFolderId(folderId);
  }, []);

  const navigateToBreadcrumb = useCallback(
    (index: number) => {
      setCurrentFolderId(breadcrumbs[index].id);
    },
    [breadcrumbs]
  );

  return { currentFolderId, breadcrumbs, handleNavigate, navigateToBreadcrumb };
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

function useFileRenaming() {
  const [renaming, setRenaming] = useState<RenameState | null>(null);
  const renameFile = useRenameFile();
  const { alert } = useDialog();

  const startRename = useCallback(
    (id: string, name: string, source: RenameSource = "list") => {
      setRenaming({ id, value: name, source });
    },
    []
  );

  const setRenameValue = useCallback((value: string) => {
    setRenaming((prev) => (prev ? { ...prev, value } : null));
  }, []);

  const cancelRename = useCallback(() => {
    setRenaming(null);
  }, []);

  const handleRename = async (id: string) => {
    if (!renaming?.value.trim()) {
      setRenaming(null);
      return;
    }
    try {
      await renameFile.mutateAsync({ id, name: renaming.value.trim() });
    } catch (err) {
      await alert({
        variant: "error",
        title: "이름 변경 실패",
        description:
          err instanceof Error ? err.message : "이름 변경에 실패했습니다.",
      });
    }
    setRenaming(null);
  };

  return { renaming, startRename, setRenameValue, cancelRename, handleRename };
}

function useNewFolder(currentFolderId: string | null, owner?: FileOwner) {
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const createFolder = useCreateFolder(owner);

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
      if (
        Math.abs(e.clientX - startX) < 5 &&
        Math.abs(e.clientY - startY) < 5
      )
        return;

      wasDragSelectingRef.current = true;

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

// ─── 메인 훅 ───

export function useFileBrowser(options: UseFileBrowserOptions) {
  const { owner, deleteMode, rootLabel = "파일" } = options;

  const nav = useNavigation(rootLabel);
  const sorting = useSorting();
  const renaming = useFileRenaming();
  const folder = useNewFolder(nav.currentFolderId, owner);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(
    null
  );
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);
  const lastSelectedIdRef = useRef<string | null>(null);

  const { data: rawItems, isLoading } = useFilesQuery(
    nav.currentFolderId,
    owner
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
        default:
          result = a.name.localeCompare(b.name, "ko");
          break;
      }
      return sorting.order === "desc" ? -result : result;
    };

    return [...folders.sort(compareFn), ...nonFolders.sort(compareFn)];
  }, [rawItems, sorting.sort, sorting.order]);

  const dragSelection = useDragSelection(selectedIds, setSelectedIds);

  // 폴더 이동 후 컨테이너 자동 포커스
  useEffect(() => {
    dragSelection.containerRef.current?.focus({ preventScroll: true });
  }, [nav.currentFolderId]);

  // 포커스 유실 시 컨테이너 재포커스 (rename 종료 후 등)
  const restoreFocus = useCallback(() => {
    requestAnimationFrame(() => {
      if (!document.activeElement || document.activeElement === document.body) {
        dragSelection.containerRef.current?.focus({ preventScroll: true });
      }
    });
  }, []);

  const handleRenameWithFocus = useCallback(
    async (id: string) => {
      await renaming.handleRename(id);
      restoreFocus();
    },
    [renaming.handleRename, restoreFocus]
  );

  const cancelRenameWithFocus = useCallback(() => {
    renaming.cancelRename();
    restoreFocus();
  }, [renaming.cancelRename, restoreFocus]);

  const { confirm, alert } = useDialog();
  const deleteFile = useDeleteFile();
  const permanentDeleteFile = usePermanentDeleteFile();
  const batchDeleteFiles = useBatchDeleteFiles();
  const batchMoveFiles = useBatchMoveFiles();
  const openFileMutation = useOpenFile();
  const duplicateFileMutation = useDuplicateFile();
  const copyFilesMutation = useCopyFiles();

  // 선택 핸들러
  const selectItem = useCallback(
    (
      id: string,
      e?: { metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean }
    ) => {
      setSelectedIds((prev) => {
        if (e?.shiftKey && lastSelectedIdRef.current && items) {
          const lastIndex = items.findIndex(
            (i) => i.id === lastSelectedIdRef.current
          );
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
          const next = new Set(prev);
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
          lastSelectedIdRef.current = id;
          return next;
        }

        lastSelectedIdRef.current = id;
        return new Set([id]);
      });
      dragSelection.containerRef.current?.focus({ preventScroll: true });
    },
    [items]
  );

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    lastSelectedIdRef.current = null;
  }, []);

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
      const isPermanent = deleteMode === "permanent";

      await confirm({
        title: isPermanent ? "영구 삭제" : "휴지통으로 이동",
        description: isPermanent
          ? `선택한 ${count}개 항목을 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
          : `선택한 ${count}개 항목을 휴지통으로 이동하시겠습니까?`,
        confirmText: "삭제",
        variant: "destructive",
        onConfirm: async () => {
          if (isPermanent) {
            for (const itemId of ids) {
              await permanentDeleteFile.mutateAsync(itemId);
            }
          } else {
            if (ids.length === 1) {
              await deleteFile.mutateAsync(ids[0]);
            } else {
              await batchDeleteFiles.mutateAsync(ids);
            }
          }
          toast.success(
            isPermanent ? "영구 삭제했습니다." : "휴지통으로 이동했습니다."
          );
          clearSelection();
        },
      });
    },
    [
      deleteFile,
      permanentDeleteFile,
      batchDeleteFiles,
      confirm,
      selectedIds,
      isMultiSelection,
      clearSelection,
      deleteMode,
    ]
  );

  const handleFileClick = useCallback(
    (file: FileItem) => {
      if (file.isFolder) {
        nav.handleNavigate(file.id);
        clearSelection();
        return;
      }
      openFileMutation.mutate(file.id);
    },
    [nav.handleNavigate, clearSelection, openFileMutation]
  );

  const handleDragDrop = async (
    itemId: string,
    targetFolderId: string | null
  ) => {
    if (itemId === targetFolderId) return;

    const ids =
      selectedIds.has(itemId) && selectedIds.size > 1
        ? Array.from(selectedIds).filter((id) => id !== targetFolderId)
        : [itemId];
    if (ids.length === 0) return;

    try {
      await batchMoveFiles.mutateAsync({ ids, folderId: targetFolderId });
      toast.success(
        ids.length > 1
          ? `${ids.length}개 항목을 이동했습니다.`
          : "이동했습니다."
      );
      clearSelection();
    } catch (err) {
      alert({
        variant: "error",
        title: "이동 실패",
        description:
          err instanceof Error ? err.message : "이동에 실패했습니다.",
      });
    }
  };

  const handleCopy = useCallback(() => {
    if (selectedIds.size === 0) return;
    if (selectedIds.has(PARENT_ROW_ID)) return;
    setClipboard({
      ids: Array.from(selectedIds),
      sourceFolderId: nav.currentFolderId,
    });
    toast.success(`${selectedIds.size}개 항목을 클립보드에 복사했습니다.`);
  }, [selectedIds, nav.currentFolderId]);

  const parentFolderId = useMemo(
    () =>
      nav.breadcrumbs.length >= 2
        ? nav.breadcrumbs[nav.breadcrumbs.length - 2].id
        : null,
    [nav.breadcrumbs]
  );

  const getPasteTargetFolderId = useCallback(() => {
    if (selectedIds.size === 1) {
      const selectedId = Array.from(selectedIds)[0];
      if (selectedId === PARENT_ROW_ID) return parentFolderId;
      const selectedItem = items?.find((i) => i.id === selectedId);
      if (selectedItem?.isFolder) return selectedItem.id;
    }
    return nav.currentFolderId;
  }, [selectedIds, items, nav.currentFolderId, parentFolderId]);

  const handlePaste = useCallback(async () => {
    if (!clipboard) return;
    const targetFolderId = getPasteTargetFolderId();
    if (targetFolderId && clipboard.ids.includes(targetFolderId)) {
      alert({ variant: "error", title: "붙여넣기 불가", description: "항목을 자기 자신 내부에 붙여넣을 수 없습니다." });
      return;
    }
    try {
      await copyFilesMutation.mutateAsync({
        ids: clipboard.ids,
        folderId: targetFolderId,
      });
      toast.success("붙여넣기 완료 (복사)");
      setClipboard(null);
    } catch (err) {
      alert({
        variant: "error",
        title: "붙여넣기 실패",
        description: err instanceof Error ? err.message : "붙여넣기에 실패했습니다.",
      });
    }
  }, [clipboard, getPasteTargetFolderId, copyFilesMutation, alert]);

  const handleMovePaste = useCallback(async () => {
    if (!clipboard) return;
    const targetFolderId = getPasteTargetFolderId();
    if (targetFolderId && clipboard.ids.includes(targetFolderId)) {
      alert({ variant: "error", title: "붙여넣기 불가", description: "항목을 자기 자신 내부에 붙여넣을 수 없습니다." });
      return;
    }
    try {
      await batchMoveFiles.mutateAsync({
        ids: clipboard.ids,
        folderId: targetFolderId,
      });
      toast.success("붙여넣기 완료 (이동)");
      setClipboard(null);
    } catch (err) {
      alert({
        variant: "error",
        title: "잘라넣기 실패",
        description: err instanceof Error ? err.message : "잘라넣기에 실패했습니다.",
      });
    }
  }, [clipboard, getPasteTargetFolderId, batchMoveFiles, alert]);

  const handleDuplicate = useCallback(async () => {
    if (selectedIds.size !== 1) return;
    const id = Array.from(selectedIds)[0];
    try {
      await duplicateFileMutation.mutateAsync(id);
      toast.success("복제했습니다.");
    } catch {
      toast.error("복제에 실패했습니다.");
    }
  }, [selectedIds, duplicateFileMutation]);

  const openContextMenu = useCallback(
    (
      e: React.MouseEvent,
      item: FileItem | null,
      source: "tree" | "list" | "favorite" | "parent" = "list"
    ) => {
      e.preventDefault();
      if (item) {
        if (!selectedIds.has(item.id)) {
          setSelectedIds(new Set([item.id]));
          lastSelectedIdRef.current = item.id;
        }
      }
      setContextMenu({ x: e.clientX, y: e.clientY, item, source });
    },
    [selectedIds]
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // 컨테이너 밖 클릭 시 선택 해제
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const container = dragSelection.containerRef.current;
      if (!container) return;

      // 컨테이너 안쪽은 컨테이너 onClick이 처리
      if (container.contains(e.target as Node)) return;

      const target = e.target as HTMLElement;
      if (
        target.closest("[data-item-id]") ||
        target.closest('[role="menu"]') ||
        target.closest('[role="alertdialog"]') ||
        target.closest("button") ||
        target.closest("input") ||
        target.closest("textarea")
      ) {
        return;
      }
      clearSelection();
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [clearSelection]);

  // 키보드 단축키 (컨테이너 스코핑)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        renaming.renaming
      ) {
        return;
      }

      const code = e.code;

      switch (code) {
        case "Backspace": {
          if (e.metaKey && selectedIds.size > 0) {
            e.preventDefault();
            const firstId = Array.from(selectedIds)[0];
            handleDelete(firstId);
          }
          break;
        }
        case "Enter": {
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
        case "KeyO": {
          if (e.metaKey && selectedIds.size === 1) {
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
        case "KeyN": {
          if (e.shiftKey && !e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            folder.setShowNewFolder(true);
          }
          break;
        }
        case "KeyA": {
          if ((e.metaKey || e.ctrlKey) && items) {
            e.preventDefault();
            setSelectedIds(new Set(items.map((i) => i.id)));
          }
          break;
        }
        case "KeyC": {
          if ((e.metaKey || e.ctrlKey) && selectedIds.size > 0) {
            e.preventDefault();
            handleCopy();
          }
          break;
        }
        case "KeyV": {
          if ((e.metaKey || e.ctrlKey) && clipboard) {
            e.preventDefault();
            if (e.altKey) {
              handleMovePaste();
            } else {
              handlePaste();
            }
          }
          break;
        }
        case "KeyD": {
          if ((e.metaKey || e.ctrlKey) && selectedIds.size === 1) {
            e.preventDefault();
            handleDuplicate();
          }
          break;
        }
      }
    },
    [
      selectedIds,
      renaming.renaming,
      renaming.startRename,
      items,
      handleDelete,
      handleFileClick,
      closeContextMenu,
      clearSelection,
      folder.setShowNewFolder,
      handleCopy,
      handlePaste,
      handleMovePaste,
      handleDuplicate,
      clipboard,
    ]
  );

  return {
    // 상태
    currentFolderId: nav.currentFolderId,
    sort: sorting.sort,
    order: sorting.order,
    newFolderName: folder.newFolderName,
    showNewFolder: folder.showNewFolder,
    renaming: renaming.renaming,
    items,
    isLoading,
    breadcrumbs: nav.breadcrumbs,
    selectedIds,
    contextMenu,
    // 세터
    setNewFolderName: folder.setNewFolderName,
    setShowNewFolder: folder.setShowNewFolder,
    setRenameValue: renaming.setRenameValue,
    // 핸들러
    handleNavigate: nav.handleNavigate,
    navigateToBreadcrumb: nav.navigateToBreadcrumb,
    handleCreateFolder: folder.handleCreateFolder,
    handleDelete,
    handleRename: handleRenameWithFocus,
    handleFileClick,
    toggleSort: sorting.toggleSort,
    handleDragDrop,
    handleCopy,
    handlePaste,
    handleMovePaste,
    handleDuplicate,
    openContextMenu,
    closeContextMenu,
    selectItem,
    clearSelection,
    startRename: renaming.startRename,
    cancelRename: cancelRenameWithFocus,
    isMultiSelection,
    clipboard,
    // 드래그 선택
    dragRect: dragSelection.dragRect,
    dragContainerRef: dragSelection.containerRef,
    handleDragSelectStart: dragSelection.handleDragSelectStart,
    wasDragSelectingRef: dragSelection.wasDragSelectingRef,
    // 키보드
    handleKeyDown,
  };
}
