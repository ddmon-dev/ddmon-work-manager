import { useState, useRef, useEffect } from "react";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [isOpen]);

  const handleAdd = async () => {
    const trimmed = newContent.trim();
    if (!trimmed) return;
    await addMindnote(trimmed);
    setNewContent("");
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent side="right" className="md:max-w-md w-full flex flex-col p-0 gap-0">
        <SheetHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-base">마인드노트</SheetTitle>
        </SheetHeader>

        <div className="min-h-0 h-auto flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : mindnotes.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm">아직 마인드노트가 없습니다.</p>
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

        <div className="border-t px-4 py-3 space-y-2">
          <Textarea
            ref={textareaRef}
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="마인드노트를 입력하세요..."
            className="min-h-[80px] resize-none text-sm"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Cmd+Enter 저장
            </p>
            <Button size="sm" onClick={handleAdd} disabled={!newContent.trim()}>
              저장
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
