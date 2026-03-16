import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "./api-client";
import { queryKeys } from "./query-keys";
import type { FileItem } from "./file-types";

export type FileOwnerType = "drive" | "partner" | "project";

export interface FileOwner {
  ownerType: FileOwnerType;
  ownerId: string;
}

function fileQueryKey(folderId: string | null, owner?: FileOwner) {
  return owner
    ? queryKeys.files.listByOwner(owner.ownerType, owner.ownerId, folderId)
    : queryKeys.files.list(folderId);
}

export function useFilesQuery(folderId: string | null, owner?: FileOwner) {
  return useQuery({
    queryKey: fileQueryKey(folderId, owner),
    queryFn: () =>
      api
        .get<{ items: FileItem[] }>("/files", {
          folderId: folderId ?? undefined,
          ...(owner ? { ownerType: owner.ownerType, ownerId: owner.ownerId } : {}),
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

export function useUploadFile(
  owner?: FileOwner,
  onProgress?: (loaded: number, total: number) => void
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, folderId }: { file: File; folderId: string | null }) =>
      new Promise<FileItem>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append("file", file);
        if (folderId) formData.append("folderId", folderId);
        if (owner) {
          formData.append("ownerType", owner.ownerType);
          formData.append("ownerId", owner.ownerId);
        }

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

export function useCreateFolder(owner?: FileOwner) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; folderId?: string | null }) =>
      api.post<FileItem>("/files/folder", {
        ...data,
        ...(owner ? { ownerType: owner.ownerType, ownerId: owner.ownerId } : {}),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.files.all }),
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

export function usePermanentDeleteFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/files/${id}/permanent`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.files.all });
      qc.invalidateQueries({ queryKey: queryKeys.trash.all });
    },
  });
}

export function useBatchPermanentDeleteFiles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => api.post("/files/batch-permanent-delete", { ids }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.files.all });
      qc.invalidateQueries({ queryKey: queryKeys.trash.all });
    },
  });
}

export function useOpenFile() {
  return useMutation({
    mutationFn: (id: string) => api.post(`/files/${id}/open`),
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

export function useDuplicateFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<FileItem>(`/files/${id}/duplicate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.files.all }),
  });
}

export function useCopyFiles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      ids,
      folderId,
    }: {
      ids: string[];
      folderId: string | null;
    }) => api.post("/files/copy", { ids, folderId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.files.all }),
  });
}
