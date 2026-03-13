import { useState } from "react";
import { format } from "date-fns";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/shared/ui/popover";
import { useDialog } from "@/shared/ui/app-dialog";
import type { MemoItem } from "../types";
import { MemoForm } from "./memo-form";

interface MemoHistoryProps {
  memos: MemoItem[];
  onUpdate: (memoId: string, content: string) => Promise<void>;
  onDelete: (memoId: string) => Promise<void>;
}

export function MemoHistory({ memos, onUpdate, onDelete }: MemoHistoryProps) {
  return (
    <ul className="space-y-0 divide-y border rounded-lg">
      {memos.map((memo) => (
        <li
          key={memo.id}
          className="group relative py-3 px-3 text-sm space-y-1 overflow-hidden"
        >
          <p className="whitespace-pre-wrap">{memo.content}</p>
          <div className="flex items-end justify-between gap-x-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{memo.author ?? "알 수 없음"}</span>
              <span>-</span>
              <span>
                {format(new Date(memo.createdAt), "yyyy-MM-dd HH:mm")}
              </span>
            </div>
            <MemoActions
              memo={memo}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          </div>
        </li>
      ))}
      {memos.length === 0 && (
        <li className="py-6 text-center text-sm text-muted-foreground">
          등록된 메모가 없습니다.
        </li>
      )}
    </ul>
  );
}

function MemoActions({
  memo,
  onUpdate,
  onDelete,
}: {
  memo: MemoItem;
  onUpdate: (memoId: string, content: string) => Promise<void>;
  onDelete: (memoId: string) => Promise<void>;
}) {
  const dialog = useDialog();
  const [editOpen, setEditOpen] = useState(false);

  const handleDelete = () => {
    dialog.confirm({
      title: "메모 삭제",
      description: "이 메모를 삭제하시겠습니까?",
      variant: "destructive",
      confirmText: "삭제",
      onConfirm: async () => {
        try {
          await onDelete(memo.id);
        } catch {
          // 에러 toast는 mutation onError에서 처리
        }
      },
    });
  };

  return (
    <nav className="flex items-center -mb-1.5 -mr-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
      <Popover open={editOpen} onOpenChange={setEditOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon-xs">
            <PencilIcon className="size-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80">
          <MemoForm
            memo={memo}
            onSubmit={(content) => onUpdate(memo.id, content)}
            onSuccess={() => setEditOpen(false)}
            onCancel={() => setEditOpen(false)}
          />
        </PopoverContent>
      </Popover>
      <Button variant="ghost" size="icon-xs" onClick={handleDelete}>
        <Trash2Icon className="size-3" />
      </Button>
    </nav>
  );
}
