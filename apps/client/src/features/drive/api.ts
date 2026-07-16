import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/shared/lib/api-client";
import { queryKeys } from "@/shared/lib/query-keys";
import type { FileItem, TrashItem } from "./types";

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
