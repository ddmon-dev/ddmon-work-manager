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

// 파일/폴더
export interface FileItem {
  id: string;
  name: string;
  s3Key: string | null;
  mimeType: string | null;
  size: number | null;
  folderId: string | null;
  isFolder: boolean;
  author: string | null;
  createdAt: string;
  updatedAt: string;
}

// 검색 결과 (folderPath 포함)
export interface FileSearchItem extends FileItem {
  folderPath: string;
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
