import { DetailSectionTitle } from "./manage-detail";
import { MemoForm } from "./memo-form";
import { MemoHistory } from "./memo-history";
import type { MemoItem } from "../types";

interface MemoSectionProps {
  memos: MemoItem[];
  onAdd: (content: string) => Promise<void>;
  onUpdate: (memoId: string, content: string) => Promise<void>;
  onDelete: (memoId: string) => Promise<void>;
}

export function MemoSection({
  memos,
  onAdd,
  onUpdate,
  onDelete,
}: MemoSectionProps) {
  return (
    <div>
      <DetailSectionTitle>메모 히스토리</DetailSectionTitle>
      <div className="space-y-4">
        <MemoForm onSubmit={onAdd} />
        <MemoHistory memos={memos} onUpdate={onUpdate} onDelete={onDelete} />
      </div>
    </div>
  );
}
