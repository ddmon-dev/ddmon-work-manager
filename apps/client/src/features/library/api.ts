import {
  keepPreviousData,
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

// ─── 파일 ───

export function useFilesQuery(folderId: string | null) {
  return useQuery({
    queryKey: queryKeys.files.list(folderId),
    queryFn: () =>
      api
        .get<{ items: FileItem[] }>("/files", {
          folderId: folderId ?? undefined,
        })
        .then((d) => d.items),
    placeholderData: keepPreviousData,
  });
}

export function useFilePathQuery(folderId: string | null) {
  return useQuery({
    queryKey: queryKeys.files.path(folderId ?? ""),
    queryFn: () =>
      api
        .get<{ path: { id: string; name: string }[] }>(`/files/${folderId}/path`)
        .then((d) => d.path),
    enabled: !!folderId,
  });
}

export function useUploadFile(onProgress?: (loaded: number, total: number) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, folderId }: { file: File; folderId: string | null }) =>
      new Promise<FileItem>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append("file", file);
        if (folderId) formData.append("folderId", folderId);

        if (onProgress) {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) onProgress(e.loaded, e.total);
          };
        }

        xhr.onload = () => {
          try {
            const json = JSON.parse(xhr.responseText);
            if (!json.success) return reject(new Error(json.message));
            resolve(json.data as FileItem);
          } catch {
            reject(new Error("업로드 응답을 파싱할 수 없습니다."));
          }
        };
        xhr.onerror = () => reject(new Error("네트워크 오류"));
        xhr.withCredentials = true;
        xhr.open("POST", "/api/files/upload");
        xhr.send(formData);
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.files.all }),
  });
}

export function useCreateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; folderId?: string | null }) =>
      api.post<FileItem>("/files/folder", data),
    onSuccess: (_, variables) =>
      qc.invalidateQueries({
        queryKey: queryKeys.files.list(variables.folderId ?? null),
      }),
  });
}

export function useRenameFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch<FileItem>(`/files/${id}`, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.files.all }),
  });
}

export function useMoveFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, folderId }: { id: string; folderId: string | null }) =>
      api.patch(`/files/${id}/move`, { folderId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.files.all }),
  });
}

export function useDeleteFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/files/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.files.all });
      qc.invalidateQueries({ queryKey: queryKeys.trash.all });
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

export function usePermanentDeleteFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/files/${id}/permanent`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.trash.all }),
  });
}

export function useBatchDeleteFiles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => api.post("/files/batch-delete", { ids }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.files.all });
      qc.invalidateQueries({ queryKey: queryKeys.trash.all });
    },
  });
}

export function useBatchMoveFiles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      ids,
      folderId,
    }: {
      ids: string[];
      folderId: string | null;
    }) => api.post("/files/batch-move", { ids, folderId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.files.all }),
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
