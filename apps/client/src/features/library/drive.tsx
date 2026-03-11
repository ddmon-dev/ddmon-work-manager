import { useState } from "react";
import {
  File as FileIcon,
  Folder,
  FolderPlus,
  Download,
  MoreHorizontal,
  Pencil,
  Trash2,
  Image,
  FileText,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
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
import { toast } from "sonner";
import {
  useFilesQuery,
  useCreateFolder,
  useDeleteFile,
  useRenameFile,
} from "./api";
import { FileUpload, UploadButton } from "./file-upload";
import { FolderTree } from "./folder-tree";
import { FilePreview } from "./file-preview";
import { TrashView } from "./trash";
import type { FileItem } from "./types";

export function Drive() {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [sort, setSort] = useState<"name" | "date" | "size">("name");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const { data: items, isLoading } = useFilesQuery(
    showTrash ? null : currentFolderId,
    sort,
    order
  );
  const createFolder = useCreateFolder();
  const deleteFile = useDeleteFile();
  const renameFile = useRenameFile();

  const filteredItems = searchTerm
    ? items?.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : items;

  const handleNavigate = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    setShowTrash(false);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder.mutateAsync({
      name: newFolderName.trim(),
      folderId: currentFolderId,
    });
    setNewFolderName("");
    setShowNewFolder(false);
  };

  const handleDelete = async (id: string) => {
    await deleteFile.mutateAsync(id);
    toast.success("휴지통으로 이동했습니다.");
  };

  const handleRename = async (id: string) => {
    if (!renameValue.trim()) return;
    await renameFile.mutateAsync({ id, name: renameValue.trim() });
    setRenamingId(null);
  };

  const handleFileClick = (file: FileItem) => {
    if (file.isFolder) {
      setCurrentFolderId(file.id);
      return;
    }
    const isImage = file.mimeType?.startsWith("image/");
    const isPdf = file.mimeType === "application/pdf";
    if (isImage || isPdf) {
      setPreviewFile(file);
    } else {
      window.open(`/api/files/${file.id}/download`, "_blank");
    }
  };

  const toggleSort = (field: "name" | "date" | "size") => {
    if (sort === field) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setSort(field);
      setOrder("asc");
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (file: FileItem) => {
    if (file.isFolder) return <Folder className="size-5 text-blue-500" />;
    if (file.mimeType?.startsWith("image/"))
      return <Image className="size-5 text-green-500" />;
    if (file.mimeType === "application/pdf")
      return <FileText className="size-5 text-red-500" />;
    return <FileIcon className="size-5 text-muted-foreground" />;
  };

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
            {/* 상단 툴바 */}
            <div className="flex items-center gap-2 border-b px-4 py-2">
              <Input
                placeholder="파일 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 max-w-xs"
              />
              <div className="flex gap-1 ml-auto">
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
              <div className="flex items-center gap-2 border-b px-4 py-2 bg-muted/30">
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
                <Button size="sm" className="h-8" onClick={handleCreateFolder}>
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
                      파일을 드래그 앤 드롭하거나 업로드 버튼을 사용하세요.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div>
                  {filteredItems?.map((item) => (
                    <div
                      key={item.id}
                      className="group flex items-center gap-3 border-b px-4 py-2.5 cursor-pointer hover:bg-accent/50"
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

                      <span className="text-xs text-muted-foreground w-20 text-right shrink-0">
                        {item.isFolder ? "-" : formatSize(item.size)}
                      </span>

                      <span className="text-xs text-muted-foreground w-24 text-right shrink-0">
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
    </div>
  );
}
