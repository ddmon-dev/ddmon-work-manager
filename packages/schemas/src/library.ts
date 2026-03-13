import { z } from "zod";

// 라이브러리 게시판
export const libraryBoardWriteSchema = z.object({
  name: z.string().min(1, "게시판 이름을 입력해주세요."),
  description: z.string().optional(),
});

export type LibraryBoardWriteInput = z.infer<typeof libraryBoardWriteSchema>;

// 라이브러리 문서
export const libraryDocumentWriteSchema = z.object({
  boardId: z.string().uuid("게시판을 선택해주세요."),
  title: z.string().min(1, "제목을 입력해주세요."),
  content: z.string().optional(),
});

export type LibraryDocumentWriteInput = z.infer<typeof libraryDocumentWriteSchema>;

// 파일 이름 변경
export const fileRenameSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요."),
});

export type FileRenameInput = z.infer<typeof fileRenameSchema>;

// 즐겨찾기 토글
export const fileFavoriteSchema = z.object({
  isFavorited: z.boolean(),
});

export type FileFavoriteInput = z.infer<typeof fileFavoriteSchema>;

// 폴더 생성
export const folderCreateSchema = z.object({
  name: z.string().min(1, "폴더 이름을 입력해주세요."),
  folderId: z.string().uuid().nullable().optional(),
});

export type FolderCreateInput = z.infer<typeof folderCreateSchema>;

// 배치 삭제
export const batchDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, "하나 이상의 항목을 선택해주세요."),
});

export type BatchDeleteInput = z.infer<typeof batchDeleteSchema>;

// 배치 이동
export const batchMoveSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, "하나 이상의 항목을 선택해주세요."),
  folderId: z.string().uuid().nullable(),
});

export type BatchMoveInput = z.infer<typeof batchMoveSchema>;

// 즐겨찾기 순서 변경
export const favoriteReorderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export type FavoriteReorderInput = z.infer<typeof favoriteReorderSchema>;

// 파일 복사
export const fileCopySchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  folderId: z.string().uuid().nullable(),
});

export type FileCopyInput = z.infer<typeof fileCopySchema>;
