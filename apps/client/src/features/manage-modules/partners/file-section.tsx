import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { format } from "date-fns";
import {
  FolderPlus,
  CornerLeftUp,
  Download,
  Eye,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronRight,
  ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
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
import { cn } from "@/shared/utils/classnames";
import { formatFileSize } from "@/shared/utils/format";
import { useDialog } from "@/shared/ui/app-dialog";
import { getFileIconComponent, type FileItem } from "@/shared/lib/file-types";
import {
  useFilesQuery,
  useFilePathQuery,
  useCreateFolder,
  useRenameFile,
  usePermanentDeleteFile,
  useOpenFile,
  type FileOwner,
} from "@/shared/lib/file-api";
import {
  FileUploadZone,
  UploadButton,
} from "@/shared/ui/file-upload-zone";

type SortKey = "name" | "updatedAt" | "size";
type SortDir = "asc" | "desc";

interface FileSectionProps {
  partnerId: string;
}

export function FileSection({ partnerId }: FileSectionProps) {
  const owner: FileOwner = { ownerType: "partner", ownerId: partnerId };
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("새 폴더");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const newFolderInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const { data: items = [] } = useFilesQuery(currentFolderId, owner);
  const { data: pathSegments = [] } = useFilePathQuery(currentFolderId);
  const createFolder = useCreateFolder(owner);
  const renameFile = useRenameFile();
  const permanentDelete = usePermanentDeleteFile();
  const openFile = useOpenFile();
  const { confirm } = useDialog();

  // 정렬
  const sortedItems = useMemo(() => {
    const sorted = [...items];
    sorted.sort((a, b) => {
      // 폴더 우선
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name, "ko");
          break;
        case "updatedAt":
          cmp = a.updatedAt.localeCompare(b.updatedAt);
          break;
        case "size":
          cmp = (a.size ?? 0) - (b.size ?? 0);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [items, sortKey, sortDir]);

  // 정렬 토글
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // 새 폴더 생성
  useEffect(() => {
    if (isCreatingFolder) newFolderInputRef.current?.select();
  }, [isCreatingFolder]);

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) {
      setIsCreatingFolder(false);
      return;
    }
    try {
      await createFolder.mutateAsync({ name, folderId: currentFolderId });
    } catch {
      toast.error("폴더 생성 실패");
    }
    setIsCreatingFolder(false);
    setNewFolderName("새 폴더");
  };

  // 이름 변경
  useEffect(() => {
    if (renamingId) renameInputRef.current?.select();
  }, [renamingId]);

  const handleRename = async () => {
    if (!renamingId) return;
    const name = renameValue.trim();
    if (!name) {
      setRenamingId(null);
      return;
    }
    try {
      await renameFile.mutateAsync({ id: renamingId, name });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "이름 변경 실패");
    }
    setRenamingId(null);
  };

  // 삭제 (영구)
  const handleDelete = useCallback(
    async (item: FileItem) => {
      confirm({
        title: `"${item.name}" 삭제`,
        description: item.isFolder
          ? "이 폴더와 하위 파일이 영구 삭제됩니다. 이 작업은 되돌릴 수 없습니다."
          : "이 파일이 영구 삭제됩니다. 이 작업은 되돌릴 수 없습니다.",
        variant: "destructive",
        confirmText: "삭제",
        onConfirm: async () => {
          try {
            await permanentDelete.mutateAsync(item.id);
            toast.success("삭제되었습니다");
          } catch {
            toast.error("삭제 실패");
          }
        },
      });
    },
    [confirm, permanentDelete]
  );

  // 다운로드
  const handleDownload = useCallback((item: FileItem) => {
    const link = document.createElement("a");
    link.href = `/api/files/${item.id}/download`;
    link.download = item.name;
    link.click();
  }, []);

  // 파일 열기
  const handleOpen = useCallback(
    (item: FileItem) => {
      openFile.mutate(item.id);
    },
    [openFile]
  );

  // 폴더 더블클릭
  const handleDoubleClick = (item: FileItem) => {
    if (item.isFolder) {
      setCurrentFolderId(item.id);
    }
  };

  // 키보드 처리
  const handleKeyDown = (e: React.KeyboardEvent, callback: () => void) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter") {
      e.preventDefault();
      callback();
    } else if (e.key === "Escape") {
      setIsCreatingFolder(false);
      setRenamingId(null);
    }
  };

  return (
    <FileUploadZone folderId={currentFolderId} owner={owner}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">파일</h3>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => toggleSort(sortKey === "name" ? "updatedAt" : sortKey === "updatedAt" ? "size" : "name")}
            >
              <ArrowUpDown className="mr-1 size-3" />
              {sortKey === "name" ? "이름" : sortKey === "updatedAt" ? "날짜" : "크기"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setIsCreatingFolder(true)}
            >
              <FolderPlus className="mr-1 size-3" />
              새 폴더
            </Button>
            <UploadButton folderId={currentFolderId} owner={owner} />
          </div>
        </div>

        {/* 브레드크럼 */}
        {currentFolderId && (
          <nav className="flex items-center gap-1 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => setCurrentFolderId(null)}
              className="hover:text-foreground cursor-pointer"
            >
              파일
            </button>
            {pathSegments.map((seg, i) => (
              <span key={seg.id} className="flex items-center gap-1">
                <ChevronRight className="size-3" />
                {i === pathSegments.length - 1 ? (
                  <span className="text-foreground font-medium">{seg.name}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCurrentFolderId(seg.id)}
                    className="hover:text-foreground cursor-pointer"
                  >
                    {seg.name}
                  </button>
                )}
              </span>
            ))}
          </nav>
        )}

        {/* 파일 목록 */}
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="px-3 py-1.5 font-medium">이름</th>
                <th className="hidden w-20 px-3 py-1.5 font-medium md:table-cell">크기</th>
                <th className="hidden w-28 px-3 py-1.5 font-medium md:table-cell">수정일</th>
                <th className="w-10 px-3 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {/* 상위 폴더 */}
              {currentFolderId && (
                <tr
                  className="cursor-pointer border-b hover:bg-muted/30"
                  onDoubleClick={() => {
                    // 상위 폴더로 이동: pathSegments의 마지막 이전 요소
                    const parent = pathSegments.length >= 2
                      ? pathSegments[pathSegments.length - 2]
                      : null;
                    setCurrentFolderId(parent?.id ?? null);
                  }}
                >
                  <td className="px-3 py-2" colSpan={4}>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CornerLeftUp className="size-4" />
                      <span>상위 폴더</span>
                    </div>
                  </td>
                </tr>
              )}

              {/* 새 폴더 입력 */}
              {isCreatingFolder && (
                <tr className="border-b">
                  <td className="px-3 py-1.5" colSpan={4}>
                    <div className="flex items-center gap-2">
                      {getFileIconComponent({ isFolder: true }, "size-4")}
                      <Input
                        ref={newFolderInputRef}
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onBlur={handleCreateFolder}
                        onKeyDown={(e) => handleKeyDown(e, handleCreateFolder)}
                        className="h-7 text-sm"
                        autoFocus
                      />
                    </div>
                  </td>
                </tr>
              )}

              {/* 파일/폴더 행 */}
              {sortedItems.map((item) => (
                <tr
                  key={item.id}
                  className="cursor-default border-b last:border-b-0 hover:bg-muted/30"
                  onDoubleClick={() => handleDoubleClick(item)}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {getFileIconComponent(item, "size-4")}
                      {renamingId === item.id ? (
                        <Input
                          ref={renameInputRef}
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={handleRename}
                          onKeyDown={(e) => handleKeyDown(e, handleRename)}
                          className="h-7 text-sm"
                          autoFocus
                        />
                      ) : (
                        <span className="truncate">{item.name}</span>
                      )}
                    </div>
                  </td>
                  <td className="hidden px-3 py-2 text-xs text-muted-foreground md:table-cell">
                    {item.isFolder ? "-" : formatFileSize(item.size ?? 0)}
                  </td>
                  <td className="hidden px-3 py-2 text-xs text-muted-foreground md:table-cell">
                    {format(new Date(item.updatedAt), "yyyy-MM-dd")}
                  </td>
                  <td className="px-3 py-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!item.isFolder && (
                          <>
                            <DropdownMenuItem onClick={() => handleOpen(item)}>
                              <Eye className="mr-2 size-4" />
                              열기
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload(item)}>
                              <Download className="mr-2 size-4" />
                              다운로드
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem
                          onClick={() => {
                            setRenamingId(item.id);
                            setRenameValue(item.name);
                          }}
                        >
                          <Pencil className="mr-2 size-4" />
                          이름 변경
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 className="mr-2 size-4" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}

              {/* 빈 상태 */}
              {sortedItems.length === 0 && !isCreatingFolder && (
                <tr>
                  <td colSpan={4} className="py-8">
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia />
                        <EmptyTitle>파일이 없습니다</EmptyTitle>
                        <EmptyDescription>
                          파일을 업로드하거나 폴더를 생성하세요
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </FileUploadZone>
  );
}
