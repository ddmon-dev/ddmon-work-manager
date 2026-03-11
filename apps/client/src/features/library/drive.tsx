import { Fragment, useState } from "react";
import {
  File as FileIcon,
  FolderPlus,
  Folder,
  Download,
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
import { FileUpload, UploadButton } from "./file-upload";
import { FolderTree } from "./folder-tree";
import { FilePreview } from "./file-preview";
import { TrashView } from "./trash";
import { useDrive } from "./use-drive";

export function Drive() {
  const {
    currentFolderId,
    showTrash,
    sort,
    order,
    searchTerm,
    previewFile,
    newFolderName,
    showNewFolder,
    renamingId,
    renameValue,
    filteredItems,
    isLoading,
    moveTargetId,
    breadcrumbs,
    setSearchTerm,
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
    formatSize,
    getFileIcon,
  } = useDrive();

  const [selectedMoveFolder, setSelectedMoveFolder] = useState<string | null>(
    null
  );

  return (
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
              <Input
                placeholder="파일 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 max-w-xs"
              />
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

            {/* 파일 목록 */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : filteredItems?.length === 0 ? (
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
                  {filteredItems?.map((item) => (
                    <div
                      key={item.id}
                      className="group flex cursor-pointer items-center gap-3 border-b px-4 py-2.5 hover:bg-accent/50"
                      onClick={() => handleFileClick(item)}
                    >
                      {getFileIcon(item)}

                      <div className="min-w-0 flex-1">
                        {renamingId === item.id ? (
                          <Input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            className="h-7 text-sm"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.nativeEvent.isComposing) return;
                              if (e.key === "Enter") handleRename(item.id);
                              if (e.key === "Escape") setRenamingId(null);
                            }}
                            onBlur={() => handleRename(item.id)}
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
                              setRenamingId(item.id);
                              setRenameValue(item.name);
                            }}
                          >
                            <Pencil className="mr-2 size-3.5" />
                            이름 변경
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setMoveTargetId(item.id);
                              setSelectedMoveFolder(currentFolderId);
                            }}
                          >
                            <FolderInput className="mr-2 size-3.5" />
                            이동
                          </DropdownMenuItem>
                          {!item.isFolder && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(
                                  `/api/files/${item.id}/download`,
                                  "_blank"
                                );
                              }}
                            >
                              <Download className="mr-2 size-3.5" />
                              다운로드
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 size-3.5" />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
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
    </div>
  );
}
