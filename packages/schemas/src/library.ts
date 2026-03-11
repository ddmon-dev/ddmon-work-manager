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

// 폴더 생성
export const folderCreateSchema = z.object({
  name: z.string().min(1, "폴더 이름을 입력해주세요."),
  folderId: z.string().uuid().nullable().optional(),
});

export type FolderCreateInput = z.infer<typeof folderCreateSchema>;
