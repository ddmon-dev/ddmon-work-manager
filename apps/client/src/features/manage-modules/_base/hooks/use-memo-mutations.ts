import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/lib/api-client";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { CRUD_ERRORS } from "@/shared/constants/error-messages";
import type { MemoItem } from "../types";

interface MemoHooksConfig<TData extends { memos: MemoItem[] }> {
  /** API 경로 프리픽스 (e.g. "/clients", "/projects") */
  basePath: string;
  /** 상세 조회 캐시 키 생성 함수 */
  detailQueryKey: (parentId: string) => readonly unknown[];
}

export function createMemoHooks<TData extends { memos: MemoItem[] }>(
  config: MemoHooksConfig<TData>
) {
  function useCreateMemo() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
      mutationFn: ({ parentId, content }: { parentId: string; content: string }) =>
        api.post(`${config.basePath}/${parentId}/memos`, { content }),
      onMutate: async ({ parentId, content }) => {
        const queryKey = config.detailQueryKey(parentId);
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData<TData>(queryKey);
        const optimisticAuthor = user ? `${user.name}(${user.username ?? ""})` : null;
        queryClient.setQueryData<TData>(queryKey, (old) =>
          old
            ? {
                ...old,
                memos: [
                  {
                    id: crypto.randomUUID(),
                    content,
                    author: optimisticAuthor,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                  ...old.memos,
                ],
              }
            : old
        );
        return { previous };
      },
      onError: (_err, { parentId }, context) => {
        if (context?.previous) queryClient.setQueryData(config.detailQueryKey(parentId), context.previous);
        toast.error(CRUD_ERRORS.CREATE_FAILED("메모"));
      },
      onSettled: (_data, _err, { parentId }) => {
        queryClient.invalidateQueries({ queryKey: config.detailQueryKey(parentId) });
      },
    });
  }

  function useUpdateMemo() {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: ({
        parentId,
        memoId,
        content,
      }: {
        parentId: string;
        memoId: string;
        content: string;
      }) => api.patch(`${config.basePath}/memos/${memoId}`, { content }),
      onMutate: async ({ parentId, memoId, content }) => {
        const queryKey = config.detailQueryKey(parentId);
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData<TData>(queryKey);
        queryClient.setQueryData<TData>(queryKey, (old) =>
          old
            ? {
                ...old,
                memos: old.memos.map((m) =>
                  m.id === memoId ? { ...m, content } : m
                ),
              }
            : old
        );
        return { previous };
      },
      onError: (_err, { parentId }, context) => {
        if (context?.previous) queryClient.setQueryData(config.detailQueryKey(parentId), context.previous);
        toast.error(CRUD_ERRORS.UPDATE_FAILED("메모"));
      },
      onSettled: (_data, _err, { parentId }) => {
        queryClient.invalidateQueries({ queryKey: config.detailQueryKey(parentId) });
      },
    });
  }

  function useDeleteMemo() {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: ({ memoId }: { parentId: string; memoId: string }) =>
        api.delete(`${config.basePath}/memos/${memoId}`),
      onMutate: async ({ parentId, memoId }) => {
        const queryKey = config.detailQueryKey(parentId);
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData<TData>(queryKey);
        queryClient.setQueryData<TData>(queryKey, (old) =>
          old
            ? { ...old, memos: old.memos.filter((m) => m.id !== memoId) }
            : old
        );
        return { previous };
      },
      onError: (_err, { parentId }, context) => {
        if (context?.previous) queryClient.setQueryData(config.detailQueryKey(parentId), context.previous);
        toast.error(CRUD_ERRORS.DELETE_FAILED("메모"));
      },
      onSettled: (_data, _err, { parentId }) => {
        queryClient.invalidateQueries({ queryKey: config.detailQueryKey(parentId) });
      },
    });
  }

  return { useCreateMemo, useUpdateMemo, useDeleteMemo };
}
