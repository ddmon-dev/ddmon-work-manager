import { RotateCcw, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/shared/ui/empty";
import {
  useTrashQuery,
  useRestoreDocument,
  useRestoreFile,
  usePermanentDeleteDocument,
  usePermanentDeleteFile,
  useEmptyTrash,
} from "./api";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";

export function TrashView() {
  const { data: items, isLoading } = useTrashQuery();
  const restoreDocument = useRestoreDocument();
  const restoreFile = useRestoreFile();
  const permanentDeleteDocument = usePermanentDeleteDocument();
  const permanentDeleteFile = usePermanentDeleteFile();
  const emptyTrash = useEmptyTrash();

  const handleRestore = async (id: string, type: "document" | "file") => {
    if (type === "document") {
      await restoreDocument.mutateAsync(id);
    } else {
      await restoreFile.mutateAsync(id);
    }
    toast.success("복원되었습니다.");
  };

  const handlePermanentDelete = async (
    id: string,
    type: "document" | "file"
  ) => {
    if (type === "document") {
      await permanentDeleteDocument.mutateAsync(id);
    } else {
      await permanentDeleteFile.mutateAsync(id);
    }
    toast.success("영구 삭제되었습니다.");
  };

  const handleEmptyTrash = async () => {
    await emptyTrash.mutateAsync();
    toast.success("휴지통을 비웠습니다.");
  };

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!items?.length) {
    return (
      <Empty className="h-full border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Trash2 />
          </EmptyMedia>
          <EmptyTitle>휴지통이 비어있습니다</EmptyTitle>
          <EmptyDescription>
            삭제된 항목이 여기에 표시됩니다.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="text-sm font-medium">
          휴지통 ({items.length})
        </span>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleEmptyTrash}
          disabled={emptyTrash.isPending}
        >
          <AlertTriangle className="mr-1 size-3.5" />
          비우기
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {items.map((item) => (
          <div
            key={`${item.type}-${item.id}`}
            className="flex items-center justify-between border-b px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {item.type === "document" ? item.title : item.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.type === "document" ? "문서" : item.isFolder ? "폴더" : "파일"}
                {" · "}
                {formatDistanceToNow(new Date(item.deletedAt), {
                  addSuffix: true,
                  locale: ko,
                })}
                {" 삭제"}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => handleRestore(item.id, item.type)}
              >
                <RotateCcw className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-destructive"
                onClick={() => handlePermanentDelete(item.id, item.type)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
