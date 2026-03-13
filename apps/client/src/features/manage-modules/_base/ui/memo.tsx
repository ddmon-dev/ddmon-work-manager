import { DetailSectionTitle } from "./manage-detail";
import { MemoForm } from "./memo-form";
import { MemoHistory } from "./memo-history";
import type { MemoItem } from "../types";

interface MemoHooks {
  useCreateMemo: () => { mutateAsync: (params: { parentId: string; content: string }) => Promise<unknown> };
  useUpdateMemo: () => { mutateAsync: (params: { parentId: string; memoId: string; content: string }) => Promise<unknown> };
  useDeleteMemo: () => { mutateAsync: (params: { parentId: string; memoId: string }) => Promise<unknown> };
}

interface MemoSectionProps {
  parentId: string;
  memos: MemoItem[];
  hooks: MemoHooks;
}

export function MemoSection({ parentId, memos, hooks }: MemoSectionProps) {
  const createMemo = hooks.useCreateMemo();
  const updateMemo = hooks.useUpdateMemo();
  const deleteMemo = hooks.useDeleteMemo();

  const handleAdd = async (content: string) => {
    await createMemo.mutateAsync({ parentId, content });
  };

  const handleUpdate = async (memoId: string, content: string) => {
    await updateMemo.mutateAsync({ parentId, memoId, content });
  };

  const handleDelete = async (memoId: string) => {
    await deleteMemo.mutateAsync({ parentId, memoId });
  };

  return (
    <div>
      <DetailSectionTitle>메모 히스토리</DetailSectionTitle>
      <div className="space-y-4">
        <MemoForm onSubmit={handleAdd} />
        <MemoHistory memos={memos} onUpdate={handleUpdate} onDelete={handleDelete} />
      </div>
    </div>
  );
}
