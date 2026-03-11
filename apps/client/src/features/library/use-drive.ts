import { useState, useCallback, type ReactNode } from "react";
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
  useCreateFolder,
  useDeleteFile,
  useRenameFile,
  useMoveFile,
} from "./api";
import type { FileItem } from "./types";

interface Breadcrumb {
  id: string | null;
  name: string;
}

export function useDrive() {
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
  const [moveTargetId, setMoveTargetId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([
    { id: null, name: "전체 파일" },
  ]);

  const { data: items, isLoading } = useFilesQuery(
    showTrash ? null : currentFolderId,
    sort,
    order
  );
  const createFolder = useCreateFolder();
  const deleteFile = useDeleteFile();
  const renameFile = useRenameFile();
  const moveFile = useMoveFile();

  const filteredItems = searchTerm
    ? items?.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : items;

  const handleNavigate = useCallback(
    (folderId: string | null, folderName?: string) => {
      setCurrentFolderId(folderId);
      setShowTrash(false);

      if (folderId === null) {
        setBreadcrumbs([{ id: null, name: "전체 파일" }]);
      } else if (folderName) {
        setBreadcrumbs((prev) => [...prev, { id: folderId, name: folderName }]);
      }
    },
    []
  );

  const navigateToBreadcrumb = useCallback(
    (index: number) => {
      const crumb = breadcrumbs[index];
      setCurrentFolderId(crumb.id);
      setBreadcrumbs(breadcrumbs.slice(0, index + 1));
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
      handleNavigate(file.id, file.name);
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

  const handleMove = async (targetFolderId: string | null) => {
    if (!moveTargetId) return;
    await moveFile.mutateAsync({ id: moveTargetId, folderId: targetFolderId });
    toast.success("이동했습니다.");
    setMoveTargetId(null);
  };

  return {
    // 상태
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
    // 세터
    setSearchTerm,
    setPreviewFile,
    setNewFolderName,
    setShowNewFolder,
    setRenamingId,
    setRenameValue,
    setShowTrash,
    setMoveTargetId,
    // 핸들러
    handleNavigate,
    navigateToBreadcrumb,
    handleCreateFolder,
    handleDelete,
    handleRename,
    handleFileClick,
    toggleSort,
    handleMove,
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
