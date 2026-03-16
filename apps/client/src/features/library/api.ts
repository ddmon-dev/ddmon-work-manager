import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/shared/lib/api-client";
import { queryKeys } from "@/shared/lib/query-keys";
import type {
  LibraryBoard,
  LibraryDocumentSummary,
  LibraryDocument,
  FileItem,
  TrashItem,
} from "./types";
import type {
  LibraryBoardWriteInput,
  LibraryDocumentWriteInput,
} from "@packages/schemas";

// ─── 게시판 ───

export function useBoardsQuery() {
  return useQuery({
    queryKey: queryKeys.libraryBoards.list(),
    queryFn: () =>
      api.get<{ items: LibraryBoard[] }>("/library-boards").then((d) => d.items),
  });
}

export function useCreateBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: LibraryBoardWriteInput) =>
      api.post<LibraryBoard>("/library-boards", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.libraryBoards.all }),
  });
}

export function useUpdateBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: LibraryBoardWriteInput }) =>
      api.patch<LibraryBoard>(`/library-boards/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.libraryBoards.all }),
  });
}

export function useDeleteBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/library-boards/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.libraryBoards.all }),
  });
}

export function useReorderBoards() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      api.put("/library-boards/reorder", { ids }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.libraryBoards.all }),
  });
}

// ─── 문서 ───

export function useDocumentsQuery(boardId: string | null) {
  return useQuery({
    queryKey: queryKeys.libraryDocuments.list(boardId ?? ""),
    queryFn: () =>
      api
        .get<{ items: LibraryDocumentSummary[] }>("/library-documents", { boardId: boardId! })
        .then((d) => d.items),
    enabled: !!boardId,
  });
}

export function useDocumentQuery(id: string | null) {
  return useQuery({
    queryKey: queryKeys.libraryDocuments.detail(id ?? ""),
    queryFn: () => api.get<LibraryDocument>(`/library-documents/${id}`),
    enabled: !!id,
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: LibraryDocumentWriteInput) =>
      api.post<LibraryDocument>("/library-documents", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.libraryDocuments.all }),
  });
}

export function useUpdateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<{ title: string; content: string }>;
    }) => api.patch<LibraryDocument>(`/library-documents/${id}`, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.libraryDocuments.all });
      qc.invalidateQueries({
        queryKey: queryKeys.libraryDocuments.detail(variables.id),
      });
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/library-documents/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.libraryDocuments.all });
      qc.invalidateQueries({ queryKey: queryKeys.trash.all });
    },
  });
}

export function useMoveDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, boardId }: { id: string; boardId: string }) =>
      api.patch(`/library-documents/${id}/move`, { boardId }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.libraryDocuments.all }),
  });
}

export function useRestoreDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch(`/library-documents/${id}/restore`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.libraryDocuments.all });
      qc.invalidateQueries({ queryKey: queryKeys.trash.all });
    },
  });
}

export function usePermanentDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/library-documents/${id}/permanent`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.trash.all }),
  });
}

// ─── 파일 (공통 훅은 shared에서 re-export) ───

export {
  useFilesQuery,
  useFilePathQuery,
  useUploadFile,
  useCreateFolder,
  useRenameFile,
  useDeleteFile,
  usePermanentDeleteFile,
  useBatchPermanentDeleteFiles,
  useOpenFile,
  useBatchDeleteFiles,
  useBatchMoveFiles,
  useDuplicateFile,
  useCopyFiles,
} from "@/shared/lib/file-api";

export function useFavoritesQuery() {
  return useQuery({
    queryKey: queryKeys.files.favorites,
    queryFn: () =>
      api
        .get<{ items: FileItem[] }>("/files", { favorites: "true" })
        .then((d) => d.items),
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isFavorited }: { id: string; isFavorited: boolean }) =>
      api.patch<FileItem>(`/files/${id}/favorite`, { isFavorited }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.files.all });
    },
  });
}

export function useRestoreFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/files/${id}/restore`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.files.all });
      qc.invalidateQueries({ queryKey: queryKeys.trash.all });
    },
  });
}

// ─── 휴지통 ───

export function useTrashQuery() {
  return useQuery({
    queryKey: queryKeys.trash.list(),
    queryFn: () =>
      api.get<{ items: TrashItem[] }>("/trash").then((d) => d.items),
  });
}

export function useEmptyTrash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete("/trash/empty"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.trash.all });
      qc.invalidateQueries({ queryKey: queryKeys.files.all });
      qc.invalidateQueries({ queryKey: queryKeys.libraryDocuments.all });
    },
  });
}

export function useReorderFavorites() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      api.put("/files/favorites/reorder", { ids }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.files.favorites }),
  });
}

// ─── 에디터 이미지 업로드 ───

export async function uploadEditorImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/uploads", {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data.url;
}
