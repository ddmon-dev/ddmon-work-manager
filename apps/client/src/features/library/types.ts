// 라이브러리 게시판
export interface LibraryBoard {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// 라이브러리 문서 (목록용)
export interface LibraryDocumentSummary {
  id: string;
  boardId: string;
  title: string;
  author: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  sortOrder: number;
}

// 라이브러리 문서 (상세)
export interface LibraryDocument extends LibraryDocumentSummary {
  content: string | null;
  deleted: boolean;
  deletedAt: string | null;
}

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
}

// 휴지통 아이템
export interface TrashItem {
  id: string;
  type: "document" | "file";
  deletedAt: string;
  // document
  title?: string;
  boardId?: string;
  // file
  name?: string;
  isFolder?: boolean;
  mimeType?: string | null;
  size?: number | null;
}
