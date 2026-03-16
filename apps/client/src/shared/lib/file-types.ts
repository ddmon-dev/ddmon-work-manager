import { createElement, type ReactNode } from "react";
import {
  File as FileIcon,
  Folder,
  Image,
  FileText,
} from "lucide-react";

/** 파일/폴더 타입에 따른 아이콘 반환 */
export function getFileIconComponent(
  file: { isFolder: boolean; mimeType?: string | null },
  sizeClass: string
): ReactNode {
  if (file.isFolder)
    return createElement(Folder, { className: `${sizeClass} text-blue-500` });
  if (file.mimeType?.startsWith("image/"))
    return createElement(Image, { className: `${sizeClass} text-green-500` });
  if (file.mimeType === "application/pdf")
    return createElement(FileText, { className: `${sizeClass} text-red-500` });
  return createElement(FileIcon, {
    className: `${sizeClass} text-muted-foreground`,
  });
}

// 파일/폴더
export interface FileItem {
  id: string;
  name: string;
  s3Key: string | null;
  mimeType: string | null;
  size: number | null;
  folderId: string | null;
  isFolder: boolean;
  isFavorited: boolean;
  favoriteOrder: number | null;
  author: string | null;
  createdAt: string;
  updatedAt: string;
  ownerType: "drive" | "partner";
  ownerId: string | null;
}
