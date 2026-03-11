import { useEffect, useMemo } from "react";
import { BlockNoteEditor } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import { uploadEditorImage } from "./api";

interface DocumentEditorProps {
  content: string | null;
  onChange: (content: string) => void;
}

export function DocumentEditor({ content, onChange }: DocumentEditorProps) {
  const initialContent = useMemo(() => {
    if (!content) return undefined;
    try {
      return JSON.parse(content);
    } catch {
      return undefined;
    }
  }, []);

  const editor = useCreateBlockNote({
    initialContent,
    uploadFile: async (file: File) => {
      const url = await uploadEditorImage(file);
      return url;
    },
  });

  useEffect(() => {
    if (!editor) return;

    // content가 외부에서 변경되었을 때 에디터 동기화
    if (content) {
      try {
        const parsed = JSON.parse(content);
        const currentContent = JSON.stringify(editor.document);
        const newContent = JSON.stringify(parsed);
        if (currentContent !== newContent) {
          editor.replaceBlocks(editor.document, parsed);
        }
      } catch {
        // ignore parse errors
      }
    }
  }, [content]);

  const handleChange = () => {
    const json = JSON.stringify(editor.document);
    onChange(json);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <BlockNoteView
        editor={editor}
        onChange={handleChange}
        theme="light"
        className="min-h-[500px]"
      />
    </div>
  );
}
