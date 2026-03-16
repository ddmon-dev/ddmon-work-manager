import { useState, useRef, useMemo } from "react";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import FocusTrap from "focus-trap-react";
import {
  File as FileIcon,
  FolderPlus,
  ArrowUpDown,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/shared/ui/empty";
import { cn } from "@/shared/utils/classnames";
import { DndContext, DragOverlay, pointerWithin } from "@dnd-kit/core";
import { FileUploadZone as FileUpload, UploadButton } from "@/shared/ui/file-upload-zone";
import { FolderTree } from "./folder-tree";
import { TrashView } from "./trash";
import { useDrive } from "./use-drive";
import { useUploadFile } from "./api";
import { useClickOutside } from "@/shared/hooks/use-click-outside";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/shared/ui/resizable";
import type { PanelImperativeHandle } from "react-resizable-panels";
import {
  Breadcrumbs,
  ParentFolderRow,
  DraggableFileRow,
  DragOverlayContent,
  FileContextMenu,
  ScopedDialogRenderer,
  menuAction,
  menuSeparator,
  type MenuItem,
  FILE_ACTIONS,
  multiLabel,
  useFileDnd,
  HiddenUploadInput,
  NewFolderInput,
} from "@/shared/ui/file-browser";

export function Drive() {
  const {
    currentFolderId,
    showTrash,
    sort,
    order,
    newFolderName,
    showNewFolder,
    renaming,
    items,
    isLoading,
    breadcrumbs,
    setNewFolderName,
    setShowNewFolder,
    setRenameValue,
    setShowTrash,
    handleNavigate,
    navigateToBreadcrumb,
    handleCreateFolder,
    handleDelete,
    handleRename,
    handleFileClick,
    toggleSort,
    handleDragDrop,
    handleDragToTrash,
    handleToggleFavorite,
    handleCopy,
    handlePaste,
    handleMovePaste,
    handleDuplicate,
    openContextMenu,
    closeContextMenu,
    selectedIds,
    contextMenu,
    parentFolderFocused,
    clipboard,
    selectItem,
    clearSelection,
    isItemFocused,
    startRename,
    cancelRename,
    cancelNewFolder,
    isMultiSelection,
    dragRect,
    dragContainerRef,
    handleDragSelectStart,
    wasDragSelectingRef,
    handleKeyDown,
    dialogState,
    onDialogConfirm,
    onDialogCancel,
    onDialogAlertClose,
    portalRef,
  } = useDrive();

  const [showTree, setShowTree] = useState(true);
  const [trapActive, setTrapActive] = useState(false);
  const treePanelRef = useRef<PanelImperativeHandle>(null);
  const uploadFile = useUploadFile();
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const newFolderRef = useRef<HTMLDivElement>(null);

  useClickOutside(newFolderRef, cancelNewFolder, showNewFolder);

  const dnd = useFileDnd({
    items,
    selectedIds,
    clearSelection,
    handleDragDrop,
    uploadFile,
    onTrashDrop: handleDragToTrash,
  });

  // ─── 컨텍스트 메뉴 아이템 ───

  const menuItems: MenuItem[] = useMemo(() => {
    if (!contextMenu) return [];
    const { item, source } = contextMenu;
    const isMulti = isMultiSelection(item?.id);
    const hasClipboard = !!clipboard;
    const a = FILE_ACTIONS;

    // 빈 영역 우클릭
    if (!item) {
      return [
        menuAction(a.NEW_FOLDER.icon, a.NEW_FOLDER.label, () => setShowNewFolder(true), { shortcut: a.NEW_FOLDER.shortcut }),
        menuAction(a.UPLOAD.icon, a.UPLOAD.label, () => uploadInputRef.current?.click()),
        ...(hasClipboard ? [
          menuSeparator(),
          menuAction(a.PASTE.icon, a.PASTE.label, () => handlePaste(), { shortcut: a.PASTE.shortcut }),
          menuAction(a.MOVE_PASTE.icon, a.MOVE_PASTE.label, () => handleMovePaste(), { shortcut: a.MOVE_PASTE.shortcut }),
        ] : []),
      ];
    }

    // 다중 선택
    if (isMulti) {
      return [
        menuAction(a.COPY.icon, multiLabel(a.COPY.label, selectedIds.size), () => handleCopy(), { shortcut: a.COPY.shortcut }),
        ...(hasClipboard ? [
          menuSeparator(),
          menuAction(a.PASTE.icon, a.PASTE.label, () => handlePaste(), { shortcut: a.PASTE.shortcut }),
          menuAction(a.MOVE_PASTE.icon, a.MOVE_PASTE.label, () => handleMovePaste(), { shortcut: a.MOVE_PASTE.shortcut }),
        ] : []),
        menuSeparator(),
        menuAction(a.DELETE.icon, multiLabel(a.DELETE.label, selectedIds.size), () => handleDelete(item.id), { shortcut: a.DELETE.shortcut, variant: "destructive" }),
      ];
    }

    // 트리 소스
    if (source === "tree") {
      const favAction = item.isFavorited ? a.FAVORITE_REMOVE : a.FAVORITE_ADD;
      return [
        menuAction(a.RENAME.icon, a.RENAME.label, () => startRename(item.id, item.name, "tree"), { shortcut: a.RENAME.shortcut }),
        menuAction(favAction.icon, favAction.label, () => handleToggleFavorite(item.id, item.isFavorited)),
        menuSeparator(),
        menuAction(a.DELETE.icon, a.DELETE.label, () => handleDelete(item.id), { shortcut: a.DELETE.shortcut, variant: "destructive" }),
      ];
    }

    // 즐겨찾기 소스
    if (source === "favorite") {
      return [
        menuAction(item.isFolder ? a.OPEN_FOLDER.icon : a.OPEN_FILE.icon, a.OPEN_FILE.label, () => handleFileClick(item), { shortcut: a.OPEN_FILE.shortcut }),
        menuAction(a.FAVORITE_REMOVE.icon, a.FAVORITE_REMOVE.label, () => handleToggleFavorite(item.id, item.isFavorited)),
        menuSeparator(),
        menuAction(a.RENAME.icon, a.RENAME.label, () => startRename(item.id, item.name, "favorite"), { shortcut: a.RENAME.shortcut }),
      ];
    }

    // 리스트 소스 (기본)
    const favAction = item.isFavorited ? a.FAVORITE_REMOVE : a.FAVORITE_ADD;
    return [
      menuAction(item.isFolder ? a.OPEN_FOLDER.icon : a.OPEN_FILE.icon, a.OPEN_FILE.label, () => handleFileClick(item), { shortcut: a.OPEN_FILE.shortcut }),
      ...(!item.isFolder ? [menuAction(a.DOWNLOAD.icon, a.DOWNLOAD.label, () => window.open(`/api/files/${item.id}/download`, "_blank"))] : []),
      menuAction(favAction.icon, favAction.label, () => handleToggleFavorite(item.id, item.isFavorited)),
      menuSeparator(),
      menuAction(a.COPY.icon, a.COPY.label, () => handleCopy(), { shortcut: a.COPY.shortcut }),
      menuAction(a.DUPLICATE.icon, a.DUPLICATE.label, () => handleDuplicate(), { shortcut: a.DUPLICATE.shortcut }),
      ...(hasClipboard ? [
        menuAction(a.PASTE.icon, a.PASTE.label, () => handlePaste(), { shortcut: a.PASTE.shortcut }),
        menuAction(a.MOVE_PASTE.icon, a.MOVE_PASTE.label, () => handleMovePaste(), { shortcut: a.MOVE_PASTE.shortcut }),
      ] : []),
      menuSeparator(),
      menuAction(a.RENAME.icon, a.RENAME.label, () => startRename(item.id, item.name, "list"), { shortcut: a.RENAME.shortcut }),
      menuSeparator(),
      menuAction(a.DELETE.icon, a.DELETE.label, () => handleDelete(item.id), { shortcut: a.DELETE.shortcut, variant: "destructive" }),
    ];
  }, [contextMenu, selectedIds, clipboard, isMultiSelection, setShowNewFolder, handlePaste, handleMovePaste, handleCopy, handleDelete, handleFileClick, handleDuplicate, handleToggleFavorite, startRename]);


  return (
    <DndContext
      sensors={dnd.sensors}
      collisionDetection={pointerWithin}
      onDragStart={dnd.handleDragStart}
      onDragEnd={dnd.handleDragEnd}
    >
    <ResizablePanelGroup orientation="horizontal" className="h-full">
      {/* 좌측: 폴더 트리 */}
      <ResizablePanel
        id="tree"
        panelRef={treePanelRef}
        defaultSize="20%"
        minSize="0px"
        maxSize="40%"
        collapsible
        collapsedSize="0px"
        onResize={() => {
          const collapsed = treePanelRef.current?.isCollapsed() ?? false;
          setShowTree(!collapsed);
        }}
      >
        <FolderTree
          currentFolderId={currentFolderId}
          onNavigate={handleNavigate}
          onFileClick={handleFileClick}
          showTrash
          onTrashClick={() => setShowTrash(true)}
          isTrashActive={showTrash}
          onContextMenu={(e, item) => openContextMenu(e, item, "tree")}
          onFavContextMenu={(e, item) => openContextMenu(e, item, "favorite")}
          renamingId={renaming?.source === "tree" ? renaming.id : null}
          favRenamingId={renaming?.source === "favorite" ? renaming.id : null}
          renameValue={renaming?.value ?? ""}
          onRenameChange={setRenameValue}
          onRenameSubmit={handleRename}
          onRenameCancel={cancelRename}
        />
      </ResizablePanel>
      <ResizableHandle className={cn(!showTree && "opacity-0")} />

      {/* 우측: 파일 목록 */}
      <ResizablePanel id="content">
      {showTrash ? (
        <div className="h-full">
          <TrashView />
        </div>
      ) : (
        <FileUpload folderId={currentFolderId}>
          <FocusTrap
            active={trapActive}
            focusTrapOptions={{
              clickOutsideDeactivates: true,
              escapeDeactivates: false,
              initialFocus: false,
              setReturnFocus: false,
              fallbackFocus: () => dragContainerRef.current!,
              onDeactivate: () => setTrapActive(false),
            }}
          >
            <div
              className="flex h-full select-none flex-col"
              onMouseDown={() => !trapActive && setTrapActive(true)}
            >
              {/* 브레드크럼 + 트리 토글 */}
              <div className="flex min-w-0 items-center gap-1 border-b bg-muted/30 px-2 py-2 text-sm">
                <button
                  className="-my-1 shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={() => {
                    if (showTree) {
                      treePanelRef.current?.collapse();
                    } else {
                      treePanelRef.current?.expand();
                    }
                  }}
                >
                  {showTree ? (
                    <PanelLeftClose className="size-4" />
                  ) : (
                    <PanelLeftOpen className="size-4" />
                  )}
                </button>
                <Breadcrumbs
                  breadcrumbs={breadcrumbs}
                  onNavigate={navigateToBreadcrumb}
                  className="border-0 bg-transparent px-0 py-0"
                />
              </div>

              {/* 상단 툴바 */}
              <div className="flex items-center gap-2 border-b px-4 py-2">
                {/* 선택 카운트 표시 */}
                {selectedIds.size > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {selectedIds.size}개 선택
                  </span>
                )}
                <div className="ml-auto flex gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8">
                        <ArrowUpDown className="mr-1 size-3.5" />
                        정렬
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" container={portalRef.current}>
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
                ref={dragContainerRef}
                tabIndex={-1}
                onKeyDown={handleKeyDown}
                className="relative flex-1 overflow-y-auto outline-none hide-scrollbar"
                onMouseDown={handleDragSelectStart}
                onClick={(e) => {
                  if (wasDragSelectingRef.current) {
                    wasDragSelectingRef.current = false;
                    return;
                  }
                  if (e.target === e.currentTarget) {
                    clearSelection();
                  }
                }}
                onContextMenu={(e) => {
                  if (!(e.target as HTMLElement).closest("[data-item-id]")) {
                    openContextMenu(e, null);
                  }
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
                    isFocused={parentFolderFocused}
                    onClick={() =>
                      navigateToBreadcrumb(breadcrumbs.length - 2)
                    }
                  />
                )}

                {/* 새 폴더 입력 */}
                {showNewFolder && (
                  <NewFolderInput
                    ref={newFolderRef}
                    value={newFolderName}
                    onChange={setNewFolderName}
                    onCreate={handleCreateFolder}
                    onCancel={cancelNewFolder}
                  />
                )}

                {!isLoading && items?.length === 0 ? (
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
                  <div role="listbox" aria-multiselectable aria-label="파일 목록">
                    {items?.map((item) => (
                      <DraggableFileRow
                        key={item.id}
                        item={item}
                        renamingId={renaming?.source === "list" ? renaming.id : null}
                        renameValue={renaming?.value ?? ""}
                        isMoving={item.id === dnd.movingId}
                        isGroupDragging={
                          !!dnd.draggedItem &&
                          selectedIds.has(dnd.draggedItem.id) &&
                          selectedIds.has(item.id)
                        }
                        isSelected={selectedIds.has(item.id)}
                        isDropDisabled={dnd.isDropDisabled(item)}
                        isFocused={isItemFocused(item.id)}
                        onSelect={(e) => selectItem(item.id, e)}
                        onFileClick={handleFileClick}
                        onContextMenu={openContextMenu}
                        onRenameChange={setRenameValue}
                        onRenameSubmit={handleRename}
                        onRenameCancel={cancelRename}
                        onDropUpload={dnd.handleDropUpload}
                      />
                    ))}
                  </div>
                )}

                {/* 드래그 선택 사각형 */}
                {dragRect && (
                  <div
                    className="pointer-events-none fixed z-10 border border-primary/50 bg-primary/10"
                    style={{
                      left: dragRect.x,
                      top: dragRect.y,
                      width: dragRect.width,
                      height: dragRect.height,
                    }}
                  />
                )}
              </div>

              {/* Portal 영역 (overflow 밖, 트랩 안) */}
              <ScopedDialogRenderer
                dialogState={dialogState}
                onConfirm={onDialogConfirm}
                onCancel={onDialogCancel}
                onAlertClose={onDialogAlertClose}
                container={portalRef.current}
              />
              {contextMenu && (
                <FileContextMenu
                  x={contextMenu.x}
                  y={contextMenu.y}
                  items={menuItems}
                  onClose={closeContextMenu}
                  container={portalRef.current}
                />
              )}
              <div ref={portalRef} />
            </div>
          </FocusTrap>
        </FileUpload>
      )}
      </ResizablePanel>

      <DragOverlay dropAnimation={null} modifiers={[snapCenterToCursor]}>
        {dnd.draggedItem && (
          <DragOverlayContent
            draggedItem={dnd.draggedItem}
            dragCount={dnd.dragCount}
            dragRowWidth={dnd.dragRowWidth}
          />
        )}
      </DragOverlay>

      {/* 빈 영역 컨텍스트 메뉴에서 파일 업로드용 hidden input */}
      <HiddenUploadInput
        ref={uploadInputRef}
        folderId={currentFolderId}
        uploadFile={uploadFile}
      />
    </ResizablePanelGroup>
    </DndContext>
  );
}
