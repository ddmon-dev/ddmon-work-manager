import { useState, useRef } from "react";
import { Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Spinner } from "@/shared/ui/spinner";
import { useMindnote } from "../context";
import { MindnoteItem } from "./mindnote-item";

export function MindnoteSheet() {
  const { isOpen, close, mindnotes, isLoading, addMindnote, editMindnote, removeMindnote } =
    useMindnote();
  const [newContent, setNewContent] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleAdd = async () => {
    const trimmed = newContent.trim();
    if (!trimmed) return;
    await addMindnote(trimmed);
    setNewContent("");
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleAdd();
    }
    if (e.key === "Escape") {
      setIsAdding(false);
      setNewContent("");
    }
  };

  const handleStartAdding = () => {
    setIsAdding(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent side="right" className="md:max-w-md w-full flex flex-col p-0 gap-0">
        <SheetHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-base">마인드노트</SheetTitle>
          {!isAdding && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleStartAdding}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isAdding && (
            <div className="rounded-lg border border-primary/30 bg-card p-3 space-y-2">
              <Textarea
                ref={textareaRef}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="마인드노트를 입력하세요..."
                className="min-h-[80px] resize-none text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsAdding(false);
                    setNewContent("");
                  }}
                >
                  취소
                </Button>
                <Button size="sm" onClick={handleAdd} disabled={!newContent.trim()}>
                  저장
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : mindnotes.length === 0 && !isAdding ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm">아직 마인드노트가 없습니다.</p>
              <Button variant="link" size="sm" className="mt-1" onClick={handleStartAdding}>
                첫 번째 노트 작성하기
              </Button>
            </div>
          ) : (
            mindnotes.map((mindnote) => (
              <MindnoteItem
                key={mindnote.id}
                mindnote={mindnote}
                onEdit={editMindnote}
                onDelete={removeMindnote}
              />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
