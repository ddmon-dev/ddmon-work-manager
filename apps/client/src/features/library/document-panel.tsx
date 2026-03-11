import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Spinner } from "@/shared/ui/spinner";
import { Sheet, SheetContent, SheetTitle } from "@/shared/ui/sheet";
import { toast } from "sonner";
import { useDocumentQuery, useUpdateDocument } from "./api";
import { DocumentEditor } from "./document-editor";

interface DocumentPanelProps {
  docId: string | null;
  onClose: () => void;
}

export function DocumentPanel({ docId, onClose }: DocumentPanelProps) {
  const { data: doc, isLoading } = useDocumentQuery(docId);
  const updateDocument = useUpdateDocument();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (doc) {
      setTitle(doc.title);
      setContent(doc.content);
      setIsDirty(false);
    }
  }, [doc]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setIsDirty(true);
  };

  const handleContentChange = useCallback((value: string) => {
    setContent(value);
    setIsDirty(true);
  }, []);

  const handleSave = async () => {
    if (!docId) return;
    await updateDocument.mutateAsync({
      id: docId,
      data: { title, content: content ?? undefined },
    });
    setIsDirty(false);
    toast.success("저장되었습니다.");
  };

  return (
    <Sheet open={!!docId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-none md:rounded-l-xl"
      >
        <SheetTitle className="sr-only">문서 편집</SheetTitle>
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner className="size-6" />
          </div>
        ) : (
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={onClose}
              >
                <ArrowLeft className="size-4" />
              </Button>
              <Input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="flex-1 border-0 text-lg font-semibold shadow-none focus-visible:ring-0"
                placeholder="문서 제목"
              />
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!isDirty || updateDocument.isPending}
              >
                <Save className="mr-1 size-4" />
                저장
              </Button>
            </div>

            {/* Editor */}
            <DocumentEditor
              content={doc?.content ?? null}
              onChange={handleContentChange}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
