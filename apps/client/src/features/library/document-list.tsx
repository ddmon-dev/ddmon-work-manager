import { Plus, FileText, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/shared/ui/empty";
import { cn } from "@/shared/utils/classnames";
import { useDocumentsQuery, useCreateDocument, useDeleteDocument } from "./api";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface DocumentListProps {
  boardId: string | null;
  selectedDocId: string | null;
  onSelectDoc: (id: string) => void;
}

export function DocumentList({
  boardId,
  selectedDocId,
  onSelectDoc,
}: DocumentListProps) {
  const { data: documents, isLoading } = useDocumentsQuery(boardId);
  const createDocument = useCreateDocument();
  const deleteDocument = useDeleteDocument();

  const handleCreate = async () => {
    if (!boardId) return;
    const created = await createDocument.mutateAsync({
      boardId,
      title: "새 문서",
    });
    onSelectDoc(created.id);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteDocument.mutateAsync(id);
  };

  if (!boardId) {
    return (
      <Empty className="h-full border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileText />
          </EmptyMedia>
          <EmptyTitle>게시판을 선택하세요</EmptyTitle>
          <EmptyDescription>
            좌측에서 게시판을 선택하거나 새로 만들어 주세요.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="text-sm font-medium">
          문서 ({documents?.length ?? 0})
        </span>
        <Button size="sm" onClick={handleCreate} disabled={createDocument.isPending}>
          <Plus className="mr-1 size-4" />
          새 문서
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {documents?.length === 0 && (
          <Empty className="h-full border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileText />
              </EmptyMedia>
              <EmptyTitle>문서가 없습니다</EmptyTitle>
              <EmptyDescription>
                새 문서를 작성해 보세요.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        {documents?.map((doc) => (
          <div
            key={doc.id}
            className={cn(
              "group flex items-center justify-between border-b px-4 py-3 cursor-pointer hover:bg-accent/50",
              selectedDocId === doc.id && "bg-accent/50"
            )}
            onClick={() => onSelectDoc(doc.id)}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{doc.title}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(doc.updatedAt), {
                  addSuffix: true,
                  locale: ko,
                })}
                {doc.updatedBy && ` · ${doc.updatedBy}`}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 opacity-0 group-hover:opacity-100"
              onClick={(e) => handleDelete(e, doc.id)}
            >
              <Trash2 className="size-3.5 text-muted-foreground" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
