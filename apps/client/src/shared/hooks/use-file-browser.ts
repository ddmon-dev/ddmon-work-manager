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
  useBatchPermanentDeleteFiles,
  type FileOwner,
} from "@/shared/lib/file-api";
import { useFileBrowserDialog } from "@/shared/hooks/use-file-browser-dialog";
import type { AlertDialogData } from "@/shared/ui/app-dialog/types";
import type { FileItem } from "@/shared/lib/file-types";
import { FILE_MESSAGES } from "@/shared/ui/file-browser";

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
  source: "tree" | "list" | "favorite";
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

function useFileRenaming(alert: (data: AlertDialogData) => Promise<void>) {
  const [renaming, setRenaming] = useState<RenameState | null>(null);
  const renameFile = useRenameFile();

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
        title: FILE_MESSAGES.RENAME_FAILED_TITLE,
        description:
          err instanceof Error ? err.message : FILE_MESSAGES.RENAME_FAILED_DESC,
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
  const rAFRef = useRef<number | null>(null);

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
      if (rAFRef.current !== null) return;

      const container = containerRef.current;
      if (!container) return;

      const { x: startX, y: startY } = dragStartRef.current;
      if (
        Math.abs(e.clientX - startX) < 5 &&
        Math.abs(e.clientY - startY) < 5
      )
        return;

      const clientX = e.clientX;
      const clientY = e.clientY;

      rAFRef.current = requestAnimationFrame(() => {
        rAFRef.current = null;

        wasDragSelectingRef.current = true;

        const cr = container.getBoundingClientRect();
        const cx = Math.max(cr.left, Math.min(clientX, cr.right));
        const cy = Math.max(cr.top, Math.min(clientY, cr.bottom));

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
      });
    };

    const handleMouseUp = () => {
      if (dragStartRef.current) {
        dragStartRef.current = null;
        if (rAFRef.current !== null) {
          cancelAnimationFrame(rAFRef.current);
          rAFRef.current = null;
        }
        setDragRect(null);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (rAFRef.current !== null) {
        cancelAnimationFrame(rAFRef.current);
        rAFRef.current = null;
      }
    };
  }, [setSelectedIds]);

  return { dragRect, containerRef, handleDragSelectStart, wasDragSelectingRef };
}

// ─── 메인 훅 ───

export function useFileBrowser(options: UseFileBrowserOptions) {
  const { owner, deleteMode, rootLabel = "파일" } = options;

  const dialog = useFileBrowserDialog();
  const nav = useNavigation(rootLabel);
  const sorting = useSorting();
  const renaming = useFileRenaming(dialog.alert);
  const folder = useNewFolder(nav.currentFolderId, owner);
  const portalRef = useRef<HTMLDivElement>(null);

  const breadcrumbsRef = useRef(nav.breadcrumbs);
  breadcrumbsRef.current = nav.breadcrumbs;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(
    null
  );
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);
  const [parentFolderFocused, setParentFolderFocused] = useState(false);
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

  // 폴더 이동 후 parentFolderFocused 리셋
  useEffect(() => {
    setParentFolderFocused(false);
  }, [nav.currentFolderId]);

  // rename / 새 폴더 종료 후 컨테이너 포커스 복구
  // (Input 언마운트 시 focus-trap의 fallbackFocus가 트리거되지 않는 케이스 보완)
  const prevRenamingRef = useRef(renaming.renaming);
  useEffect(() => {
    if (prevRenamingRef.current && !renaming.renaming) {
      requestAnimationFrame(() => {
        dragSelection.containerRef.current?.focus({ preventScroll: true });
      });
    }
    prevRenamingRef.current = renaming.renaming;
  }, [renaming.renaming]);

  const prevShowNewFolderRef = useRef(folder.showNewFolder);
  useEffect(() => {
    if (prevShowNewFolderRef.current && !folder.showNewFolder) {
      requestAnimationFrame(() => {
        dragSelection.containerRef.current?.focus({ preventScroll: true });
      });
    }
    prevShowNewFolderRef.current = folder.showNewFolder;
  }, [folder.showNewFolder]);

  const cancelNewFolder = useCallback(() => {
    folder.setShowNewFolder(false);
  }, [folder.setShowNewFolder]);

  const { confirm, alert } = dialog;
  const deleteFile = useDeleteFile();
  const permanentDeleteFile = usePermanentDeleteFile();
  const batchPermanentDeleteFiles = useBatchPermanentDeleteFiles();
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
      setParentFolderFocused(false);
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

  // Tab 포커스 시 선택 (컨테이너로 포커스 이동하지 않음)
  const focusSelectItem = useCallback(
    (id: string) => {
      setParentFolderFocused(false);
      setSelectedIds(new Set([id]));
      lastSelectedIdRef.current = id;
    },
    []
  );

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    lastSelectedIdRef.current = null;
    setParentFolderFocused(false);
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
        title: isPermanent ? FILE_MESSAGES.DELETE_CONFIRM_PERMANENT : FILE_MESSAGES.DELETE_CONFIRM_TRASH,
        description: isPermanent
          ? FILE_MESSAGES.DELETE_CONFIRM_PERMANENT_DESC(count)
          : FILE_MESSAGES.DELETE_CONFIRM_TRASH_DESC(count),
        confirmText: "삭제",
        variant: "destructive",
        onConfirm: async () => {
          if (isPermanent) {
            if (ids.length === 1) {
              await permanentDeleteFile.mutateAsync(ids[0]);
            } else {
              await batchPermanentDeleteFiles.mutateAsync(ids);
            }
          } else {
            if (ids.length === 1) {
              await deleteFile.mutateAsync(ids[0]);
            } else {
              await batchDeleteFiles.mutateAsync(ids);
            }
          }
          toast.success(
            isPermanent ? FILE_MESSAGES.DELETED_PERMANENT : FILE_MESSAGES.MOVED_TO_TRASH
          );
          clearSelection();
        },
      });
    },
    [
      deleteFile,
      permanentDeleteFile,
      batchPermanentDeleteFiles,
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
          ? FILE_MESSAGES.MOVED_MULTI(ids.length)
          : FILE_MESSAGES.MOVED
      );
      clearSelection();
    } catch (err) {
      alert({
        variant: "error",
        title: FILE_MESSAGES.MOVE_FAILED_TITLE,
        description:
          err instanceof Error ? err.message : FILE_MESSAGES.MOVE_FAILED_DESC,
      });
    }
  };

  const handleCopy = useCallback(() => {
    if (selectedIds.size === 0) return;
    setClipboard({
      ids: Array.from(selectedIds),
      sourceFolderId: nav.currentFolderId,
    });
    toast.success(FILE_MESSAGES.COPIED_TO_CLIPBOARD(selectedIds.size));
  }, [selectedIds, nav.currentFolderId]);

  const getPasteTargetFolderId = useCallback(() => {
    if (selectedIds.size === 1) {
      const selectedId = Array.from(selectedIds)[0];
      const selectedItem = items?.find((i) => i.id === selectedId);
      if (selectedItem?.isFolder) return selectedItem.id;
    }
    return nav.currentFolderId;
  }, [selectedIds, items, nav.currentFolderId]);

  const performPaste = useCallback(async (mode: "copy" | "move") => {
    if (!clipboard) return;
    const targetFolderId = getPasteTargetFolderId();
    if (targetFolderId && clipboard.ids.includes(targetFolderId)) {
      alert({ variant: "error", title: FILE_MESSAGES.PASTE_BLOCKED_TITLE, description: FILE_MESSAGES.PASTE_BLOCKED_DESC });
      return;
    }
    try {
      if (mode === "copy") {
        await copyFilesMutation.mutateAsync({ ids: clipboard.ids, folderId: targetFolderId });
        toast.success(FILE_MESSAGES.PASTED_COPY);
      } else {
        await batchMoveFiles.mutateAsync({ ids: clipboard.ids, folderId: targetFolderId });
        toast.success(FILE_MESSAGES.PASTED_MOVE);
      }
      setClipboard(null);
    } catch (err) {
      alert({
        variant: "error",
        title: mode === "copy" ? FILE_MESSAGES.PASTE_FAILED : FILE_MESSAGES.MOVE_PASTE_FAILED,
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }, [clipboard, getPasteTargetFolderId, copyFilesMutation, batchMoveFiles, alert]);

  const handlePaste = useCallback(() => performPaste("copy"), [performPaste]);
  const handleMovePaste = useCallback(() => performPaste("move"), [performPaste]);

  const handleDuplicate = useCallback(async () => {
    if (selectedIds.size !== 1) return;
    const id = Array.from(selectedIds)[0];
    try {
      await duplicateFileMutation.mutateAsync(id);
      toast.success(FILE_MESSAGES.DUPLICATED);
    } catch {
      toast.error(FILE_MESSAGES.DUPLICATE_FAILED);
    }
  }, [selectedIds, duplicateFileMutation]);

  const openContextMenu = useCallback(
    (
      e: React.MouseEvent,
      item: FileItem | null,
      source: "tree" | "list" | "favorite" = "list"
    ) => {
      e.preventDefault();
      if (item) {
        if (!selectedIds.has(item.id)) {
          setSelectedIds(new Set([item.id]));
          lastSelectedIdRef.current = item.id;
        }
      } else {
        // 빈 영역 우클릭: 선택 해제 → 붙여넣기 대상이 currentFolderId로 결정됨
        setSelectedIds(new Set());
        lastSelectedIdRef.current = null;
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

  const scrollToElement = useCallback(
    (selector: string) => {
      dragSelection.containerRef.current
        ?.querySelector(selector)
        ?.scrollIntoView({ block: "nearest" });
    },
    []
  );

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
          if (parentFolderFocused) {
            e.preventDefault();
            nav.navigateToBreadcrumb(breadcrumbsRef.current.length - 2);
            break;
          }
          if (selectedIds.size === 1) {
            e.preventDefault();
            const id = Array.from(selectedIds)[0];
            const item = items?.find((i) => i.id === id);
            if (item) {
              if (e.shiftKey) {
                renaming.startRename(item.id, item.name);
              } else {
                handleFileClick(item);
              }
            }
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
        case "ArrowDown": {
          e.preventDefault();
          if (parentFolderFocused) {
            if (items && items.length > 0) {
              selectItem(items[0].id, {});
              scrollToElement(`[data-item-id="${items[0].id}"]`);
            }
            break;
          }
          if (!items || items.length === 0) {
            if (nav.currentFolderId) {
              setParentFolderFocused(true);
              scrollToElement("[data-parent-folder-row]");
            }
            break;
          }
          const currentIndex = lastSelectedIdRef.current
            ? items.findIndex((i) => i.id === lastSelectedIdRef.current)
            : -1;
          const nextIndex =
            currentIndex < items.length - 1 ? currentIndex + 1 : currentIndex;
          if (nextIndex === currentIndex && currentIndex !== -1) break;
          const nextId = items[nextIndex === -1 ? 0 : nextIndex].id;
          selectItem(nextId, { shiftKey: e.shiftKey });
          scrollToElement(`[data-item-id="${nextId}"]`);
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          if (parentFolderFocused) break;
          // 빈 폴더에서도 상위 폴더 행 접근 가능
          if (!items || items.length === 0) {
            if (nav.currentFolderId) {
              setParentFolderFocused(true);
              scrollToElement("[data-parent-folder-row]");
            }
            break;
          }
          const currentIndex = lastSelectedIdRef.current
            ? items.findIndex((i) => i.id === lastSelectedIdRef.current)
            : items.length;
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : 0;
          if (prevIndex === currentIndex) {
            // 첫 번째 항목에서 위로 → 상위 폴더 행으로 이동
            if (nav.currentFolderId && !e.shiftKey) {
              setParentFolderFocused(true);
              setSelectedIds(new Set());
              lastSelectedIdRef.current = null;
              scrollToElement("[data-parent-folder-row]");
            }
            break;
          }
          const prevId = items[prevIndex].id;
          selectItem(prevId, { shiftKey: e.shiftKey });
          scrollToElement(`[data-item-id="${prevId}"]`);
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
      selectItem,
      parentFolderFocused,
      nav.currentFolderId,
      nav.navigateToBreadcrumb,
      scrollToElement,
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
    parentFolderFocused,
    // 세터
    setNewFolderName: folder.setNewFolderName,
    setShowNewFolder: folder.setShowNewFolder,
    setRenameValue: renaming.setRenameValue,
    // 핸들러
    handleNavigate: nav.handleNavigate,
    navigateToBreadcrumb: nav.navigateToBreadcrumb,
    handleCreateFolder: folder.handleCreateFolder,
    cancelNewFolder,
    handleDelete,
    handleRename: renaming.handleRename,
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
    focusSelectItem,
    clearSelection,
    startRename: renaming.startRename,
    cancelRename: renaming.cancelRename,
    isMultiSelection,
    clipboard,
    // 드래그 선택
    dragRect: dragSelection.dragRect,
    dragContainerRef: dragSelection.containerRef,
    handleDragSelectStart: dragSelection.handleDragSelectStart,
    wasDragSelectingRef: dragSelection.wasDragSelectingRef,
    // 키보드
    handleKeyDown,
    // 다이얼로그 + 포탈
    dialogState: dialog.dialogState,
    onDialogConfirm: dialog.handleConfirm,
    onDialogCancel: dialog.handleCancel,
    onDialogAlertClose: dialog.handleAlertClose,
    portalRef,
  };
}
