import { Fragment, useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import {
  File as FileIcon,
  FileText,
  Image,
  FolderPlus,
  Folder,
  FolderOpen,
  CornerLeftUp,
  Eye,
  Download,
  Upload,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowUpDown,
  FolderInput,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/shared/ui/empty";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/utils/classnames";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { FileUpload, UploadButton } from "./file-upload";
import { FolderTree } from "./folder-tree";
import { FilePreview } from "./file-preview";
import { TrashView } from "./trash";
import { toast } from "sonner";
import { useDrive, type ContextMenuState } from "./use-drive";
import { useUploadFile } from "./api";
import type { FileItem } from "./types";
import type { LucideIcon } from "lucide-react";

export function Drive() {
  const {
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
    setPreviewFile,
    setNewFolderName,
    setShowNewFolder,
    setRenamingId,
    setRenameValue,
    setShowTrash,
    setMoveTargetId,
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
    selectedId,
    contextMenu,
    setSelectedId,
    formatSize,
    getFileIcon,
  } = useDrive();

  const [selectedMoveFolder, setSelectedMoveFolder] = useState<string | null>(
    null
  );
  const [draggedItem, setDraggedItem] = useState<FileItem | null>(null);
  const [dragRowWidth, setDragRowWidth] = useState<number | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const uploadFile = useUploadFile();
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const handleDropUpload = useCallback(
    async (fileList: FileList, targetFolderId: string) => {
      const files = Array.from(fileList);
      let successCount = 0;
      for (const file of files) {
        try {
          await uploadFile.mutateAsync({ file, folderId: targetFolderId });
          successCount++;
        } catch {
          toast.error(`${file.name} 업로드 실패`);
        }
      }
      if (successCount > 0) {
        toast.success(`${successCount}개 파일 업로드 완료`);
      }
    },
    [uploadFile]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const item = items?.find((i) => i.id === event.active.id);
      if (item) {
        setDraggedItem(item);
        const width = event.active.rect.current?.initial?.width;
        if (width) setDragRowWidth(width);
      }
    },
    [items]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDraggedItem(null);
      setDragRowWidth(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const targetFolderId = over.data.current?.folderId as
        | string
        | null
        | undefined;
      if (targetFolderId === undefined) return;
      setMovingId(active.id as string);
      handleDragDrop(active.id as string, targetFolderId).then(() =>
        setMovingId(null)
      );
    },
    [handleDragDrop]
  );


  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
    <div className="flex h-full">
      {/* 좌측: 폴더 트리 */}
      <div className="w-52 shrink-0 border-r">
        <FolderTree
          currentFolderId={currentFolderId}
          onNavigate={handleNavigate}
          showTrash
          onTrashClick={() => setShowTrash(true)}
          isTrashActive={showTrash}
        />
      </div>

      {/* 우측: 파일 목록 */}
      {showTrash ? (
        <div className="flex-1">
          <TrashView />
        </div>
      ) : (
        <FileUpload folderId={currentFolderId}>
          <div className="flex h-full flex-col">
            {/* 브레드크럼 */}
            {breadcrumbs.length > 1 && (
              <div className="flex items-center gap-1 border-b px-4 py-1.5 text-sm">
                {breadcrumbs.map((crumb, index) => (
                  <Fragment key={crumb.id ?? "root"}>
                    {index > 0 && (
                      <ChevronRight className="size-3 text-muted-foreground" />
                    )}
                    <button
                      className={cn(
                        "hover:underline",
                        index === breadcrumbs.length - 1
                          ? "font-medium"
                          : "text-muted-foreground"
                      )}
                      onClick={() => navigateToBreadcrumb(index)}
                    >
                      {crumb.name}
                    </button>
                  </Fragment>
                ))}
              </div>
            )}

            {/* 상단 툴바 */}
            <div className="flex items-center gap-2 border-b px-4 py-2">
              <div className="ml-auto flex gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8">
                      <ArrowUpDown className="mr-1 size-3.5" />
                      정렬
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => toggleSort("name")}>
                      이름순 {sort === "name" && (order === "asc" ? "↑" : "↓")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleSort("date")}>
                      날짜순 {sort === "date" && (order === "asc" ? "↑" : "↓")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleSort("size")}>
                      크기순 {sort === "size" && (order === "asc" ? "↑" : "↓")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setShowNewFolder(true)}
                >
                  <FolderPlus className="mr-1 size-3.5" />
                  새 폴더
                </Button>

                <UploadButton folderId={currentFolderId} />
              </div>
            </div>

            {/* 파일 목록 */}
            <div
              className="flex-1 overflow-y-auto"
              onClick={(e) => {
                if (e.target === e.currentTarget) setSelectedId(null);
              }}
              onContextMenu={(e) => {
                if (e.target === e.currentTarget) openContextMenu(e, null);
              }}
            >
              {/* ../ 상위 폴더 행 */}
              {!isLoading && currentFolderId && (
                <ParentFolderRow
                  parentFolderId={
                    breadcrumbs.length >= 2
                      ? breadcrumbs[breadcrumbs.length - 2].id
                      : null
                  }
                  isSelected={selectedId === "parent-folder"}
                  onSelect={() => setSelectedId("parent-folder")}
                  onClick={() =>
                    navigateToBreadcrumb(breadcrumbs.length - 2)
                  }
                />
              )}

              {/* 새 폴더 입력 */}
              {showNewFolder && (
                <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2">
                  <Folder className="size-5 text-blue-500" />
                  <Input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="폴더 이름"
                    className="h-8 max-w-xs"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.nativeEvent.isComposing) return;
                      if (e.key === "Enter") handleCreateFolder();
                      if (e.key === "Escape") setShowNewFolder(false);
                    }}
                  />
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={handleCreateFolder}
                  >
                    생성
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8"
                    onClick={() => setShowNewFolder(false)}
                  >
                    취소
                  </Button>
                </div>
              )}

              {isLoading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : items?.length === 0 ? (
                <Empty className="h-full border-0">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <FileIcon />
                    </EmptyMedia>
                    <EmptyTitle>파일이 없습니다</EmptyTitle>
                    <EmptyDescription>
                      파일을 드래그 앤 드롭하거나 아래 버튼을 사용하세요.
                    </EmptyDescription>
                  </EmptyHeader>
                  <div className="flex gap-2">
                    <UploadButton folderId={currentFolderId} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNewFolder(true)}
                    >
                      <FolderPlus className="mr-1 size-4" />
                      새 폴더
                    </Button>
                  </div>
                </Empty>
              ) : (
                <div>
                  {items?.map((item) => (
                    <DraggableFileRow
                      key={item.id}
                      item={item}
                      renamingId={renamingId}
                      renameValue={renameValue}
                      currentFolderId={currentFolderId}
                      isMoving={item.id === movingId}
                      isSelected={selectedId === item.id}
                      onSelect={setSelectedId}
                      onFileClick={handleFileClick}
                      onContextMenu={openContextMenu}
                      onRenameStart={(id, name) => {
                        setRenamingId(id);
                        setRenameValue(name);
                      }}
                      onRenameChange={setRenameValue}
                      onRenameSubmit={handleRename}
                      onRenameCancel={() => setRenamingId(null)}
                      onMoveStart={(id) => {
                        setMoveTargetId(id);
                        setSelectedMoveFolder(currentFolderId);
                      }}
                      onDelete={handleDelete}
                      onDropUpload={handleDropUpload}
                      formatSize={formatSize}
                      getFileIcon={getFileIcon}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </FileUpload>
      )}

      <FilePreview
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />

      {/* 이동 Dialog */}
      <Dialog
        open={!!moveTargetId}
        onOpenChange={(open) => !open && setMoveTargetId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>이동할 폴더 선택</DialogTitle>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto">
            <FolderTree
              currentFolderId={selectedMoveFolder}
              onNavigate={setSelectedMoveFolder}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveTargetId(null)}>
              취소
            </Button>
            <Button
              onClick={() => {
                handleMove(selectedMoveFolder);
                setSelectedMoveFolder(null);
              }}
            >
              이동
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DragOverlay dropAnimation={null} modifiers={[snapCenterToCursor]}>
        {draggedItem && (
          <div
            className="animate-drag-pill-morph flex cursor-grabbing items-center gap-2.5 border bg-background"
            style={
              dragRowWidth
                ? ({ "--drag-row-width": `${dragRowWidth}px` } as React.CSSProperties)
                : undefined
            }
          >
            <DragOverlayIcon item={draggedItem} />
            <span className="truncate text-sm font-medium">
              {draggedItem.name}
            </span>
          </div>
        )}
      </DragOverlay>

      {/* 빈 영역 컨텍스트 메뉴에서 파일 업로드용 hidden input */}
      <input
        ref={uploadInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={async (e) => {
          const files = e.target.files;
          if (!files || files.length === 0) return;
          let successCount = 0;
          for (const file of Array.from(files)) {
            try {
              await uploadFile.mutateAsync({
                file,
                folderId: currentFolderId,
              });
              successCount++;
            } catch {
              toast.error(`${file.name} 업로드 실패`);
            }
          }
          if (successCount > 0) {
            toast.success(`${successCount}개 파일 업로드 완료`);
          }
          e.target.value = "";
        }}
      />

      {contextMenu && (
        <FileContextMenu
          contextMenu={contextMenu}
          onClose={closeContextMenu}
          onOpen={(item) => {
            handleFileClick(item);
            closeContextMenu();
          }}
          onDownload={(item) => {
            window.open(`/api/files/${item.id}/download`, "_blank");
            closeContextMenu();
          }}
          onRename={(item) => {
            setRenamingId(item.id);
            setRenameValue(item.name);
            closeContextMenu();
          }}
          onMove={(item) => {
            setMoveTargetId(item.id);
            setSelectedMoveFolder(currentFolderId);
            closeContextMenu();
          }}
          onDelete={(item) => {
            handleDelete(item.id);
            closeContextMenu();
          }}
          onNewFolder={() => {
            setShowNewFolder(true);
            closeContextMenu();
          }}
          onUpload={() => {
            uploadInputRef.current?.click();
            closeContextMenu();
          }}
        />
      )}
    </div>
    </DndContext>
  );
}

// ─── DraggableFileRow ───

function DraggableFileRow({
  item,
  renamingId,
  renameValue,
  currentFolderId,
  onFileClick,
  onRenameStart,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
  onMoveStart,
  onDelete,
  isMoving,
  isSelected,
  onSelect,
  onContextMenu,
  onDropUpload,
  formatSize,
  getFileIcon,
}: {
  item: FileItem;
  renamingId: string | null;
  renameValue: string;
  currentFolderId: string | null;
  isMoving: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onFileClick: (file: FileItem) => void;
  onContextMenu: (e: React.MouseEvent, item: FileItem) => void;
  onRenameStart: (id: string, name: string) => void;
  onRenameChange: (value: string) => void;
  onRenameSubmit: (id: string) => void;
  onRenameCancel: () => void;
  onMoveStart: (id: string) => void;
  onDelete: (id: string) => void;
  onDropUpload: (files: FileList, folderId: string) => void;
  formatSize: (bytes: number | null) => string;
  getFileIcon: (file: FileItem) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({ id: item.id });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `list-${item.id}`,
    data: { folderId: item.id },
    disabled: !item.isFolder,
  });

  const ref = useCallback(
    (node: HTMLElement | null) => {
      setDragRef(node);
      if (item.isFolder) setDropRef(node);
    },
    [setDragRef, setDropRef, item.isFolder]
  );

  // 네이티브 파일 드롭 (OS에서 파일을 폴더 위에 드롭)
  const [nativeDragOver, setNativeDragOver] = useState(false);
  const dragCounter = useRef(0);

  const nativeDragHandlers = item.isFolder
    ? {
        onDragEnter: (e: React.DragEvent) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          dragCounter.current++;
          setNativeDragOver(true);
        },
        onDragOver: (e: React.DragEvent) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
        },
        onDragLeave: () => {
          dragCounter.current--;
          if (dragCounter.current === 0) setNativeDragOver(false);
        },
        onDrop: (e: React.DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          dragCounter.current = 0;
          setNativeDragOver(false);
          if (e.dataTransfer.files.length > 0) {
            onDropUpload(e.dataTransfer.files, item.id);
          }
        },
      }
    : {};

  return (
    <div
      ref={ref}
      {...attributes}
      {...listeners}
      {...nativeDragHandlers}
      className={cn(
        "group flex cursor-grab items-center gap-3 border-b px-4 py-2.5 hover:bg-accent/50 active:cursor-grabbing",
        (isDragging || isMoving) && "opacity-30",
        (isOver || nativeDragOver) &&
          item.isFolder &&
          "bg-primary/10 ring-1 ring-inset ring-primary",
        isSelected && "bg-accent/50"
      )}
      onClick={() => {
        if (!isDragging) onSelect(item.id);
      }}
      onDoubleClick={() => {
        if (!isDragging) onFileClick(item);
      }}
      onContextMenu={(e) => onContextMenu(e, item)}
    >
      {getFileIcon(item)}

      <div className="min-w-0 flex-1">
        {renamingId === item.id ? (
          <Input
            value={renameValue}
            onChange={(e) => onRenameChange(e.target.value)}
            className="h-7 text-sm"
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === "Enter") onRenameSubmit(item.id);
              if (e.key === "Escape") onRenameCancel();
            }}
            onBlur={() => onRenameSubmit(item.id)}
          />
        ) : (
          <p className="truncate text-sm">{item.name}</p>
        )}
      </div>

      <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
        {item.isFolder ? "-" : formatSize(item.size)}
      </span>

      <span className="w-24 shrink-0 text-right text-xs text-muted-foreground">
        {new Date(item.updatedAt).toLocaleDateString("ko-KR")}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 opacity-0 group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onRenameStart(item.id, item.name);
            }}
          >
            <Pencil className="mr-2 size-3.5" />
            이름 변경
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onMoveStart(item.id);
            }}
          >
            <FolderInput className="mr-2 size-3.5" />
            이동
          </DropdownMenuItem>
          {!item.isFolder && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                window.open(`/api/files/${item.id}/download`, "_blank");
              }}
            >
              <Download className="mr-2 size-3.5" />
              다운로드
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="text-destructive"
          >
            <Trash2 className="mr-2 size-3.5" />
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ─── ParentFolderRow (../) ───

function ParentFolderRow({
  parentFolderId,
  isSelected,
  onSelect,
  onClick,
}: {
  parentFolderId: string | null;
  isSelected: boolean;
  onSelect: () => void;
  onClick: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "parent-folder",
    data: { folderId: parentFolderId },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex cursor-pointer items-center gap-3 border-b px-4 py-2.5 text-muted-foreground hover:bg-accent/50",
        isOver && "bg-primary/10 ring-1 ring-inset ring-primary",
        isSelected && "bg-accent/50"
      )}
      onClick={onSelect}
      onDoubleClick={onClick}
    >
      <CornerLeftUp className="size-5" />
      <span className="flex-1 text-sm">..</span>
      {/* ...버튼 자리 — 다른 행과 높이 맞춤 */}
      <div className="size-9" />
    </div>
  );
}

// ─── DragOverlayIcon ───

function DragOverlayIcon({ item }: { item: FileItem }) {
  const className = "size-5 shrink-0";
  if (item.isFolder) return <Folder className={cn(className, "text-blue-500")} />;
  if (item.mimeType?.startsWith("image/"))
    return <Image className={cn(className, "text-green-500")} />;
  if (item.mimeType === "application/pdf")
    return <FileText className={cn(className, "text-red-500")} />;
  return <FileIcon className={cn(className, "text-muted-foreground")} />;
}

// ─── FileContextMenu (Portal) ───

function FileContextMenu({
  contextMenu,
  onClose,
  onOpen,
  onDownload,
  onRename,
  onMove,
  onDelete,
  onNewFolder,
  onUpload,
}: {
  contextMenu: ContextMenuState;
  onClose: () => void;
  onOpen: (item: FileItem) => void;
  onDownload: (item: FileItem) => void;
  onRename: (item: FileItem) => void;
  onMove: (item: FileItem) => void;
  onDelete: (item: FileItem) => void;
  onNewFolder: () => void;
  onUpload: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  // 뷰포트 경계 보정
  const [position, setPosition] = useState({ x: contextMenu.x, y: contextMenu.y });

  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = contextMenu.x + rect.width > window.innerWidth
      ? window.innerWidth - rect.width - 8
      : contextMenu.x;
    const y = contextMenu.y + rect.height > window.innerHeight
      ? window.innerHeight - rect.height - 8
      : contextMenu.y;
    setPosition({ x, y });
  }, [contextMenu.x, contextMenu.y]);

  // 바깥 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // ESC 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const { item } = contextMenu;

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      style={{ left: position.x, top: position.y }}
    >
      {item ? (
        <>
          <ContextMenuButton
            icon={item.isFolder ? FolderOpen : Eye}
            label="열기"
            shortcut="Enter"
            onClick={() => onOpen(item)}
          />
          {!item.isFolder && (
            <ContextMenuButton
              icon={Download}
              label="다운로드"
              onClick={() => onDownload(item)}
            />
          )}
          <div className="my-1 h-px bg-border" />
          <ContextMenuButton
            icon={Pencil}
            label="이름 변경"
            shortcut="F2"
            onClick={() => onRename(item)}
          />
          <ContextMenuButton
            icon={FolderInput}
            label="이동"
            onClick={() => onMove(item)}
          />
          <div className="my-1 h-px bg-border" />
          <ContextMenuButton
            icon={Trash2}
            label="삭제"
            shortcut="Del"
            variant="destructive"
            onClick={() => onDelete(item)}
          />
        </>
      ) : (
        <>
          <ContextMenuButton
            icon={FolderPlus}
            label="새 폴더"
            onClick={onNewFolder}
          />
          <ContextMenuButton
            icon={Upload}
            label="파일 업로드"
            onClick={onUpload}
          />
        </>
      )}
    </div>,
    document.body
  );
}

// ─── ContextMenuButton ───

function ContextMenuButton({
  icon: Icon,
  label,
  shortcut,
  variant,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  variant?: "destructive";
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
        variant === "destructive" && "text-destructive hover:text-destructive"
      )}
      onClick={onClick}
    >
      <Icon className="size-3.5" />
      <span className="flex-1 text-left">{label}</span>
      {shortcut && (
        <span className="ml-auto text-xs text-muted-foreground">{shortcut}</span>
      )}
    </button>
  );
}
