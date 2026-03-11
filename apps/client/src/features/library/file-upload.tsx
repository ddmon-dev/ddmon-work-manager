import { useState, useRef, useCallback } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/shared/utils/classnames";
import { useUploadFile } from "./api";
import { toast } from "sonner";

interface FileUploadProps {
  folderId: string | null;
  children: React.ReactNode;
}

export function FileUpload({ folderId, children }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const uploadFile = useUploadFile();
  const dragCounter = useRef(0);

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      const files = Array.from(fileList);
      for (const file of files) {
        try {
          await uploadFile.mutateAsync({ file, folderId });
        } catch (err) {
          toast.error(`${file.name} 업로드 실패`);
        }
      }
      if (files.length > 0) {
        toast.success(`${files.length}개 파일 업로드 완료`);
      }
    },
    [folderId, uploadFile]
  );

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div
      className="relative flex-1"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/5">
          <div className="flex flex-col items-center gap-2 text-primary">
            <Upload className="size-8" />
            <p className="text-sm font-medium">파일을 여기에 놓으세요</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface UploadButtonProps {
  folderId: string | null;
}

export function UploadButton({ folderId }: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadFile = useUploadFile();

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      try {
        await uploadFile.mutateAsync({ file, folderId });
      } catch {
        toast.error(`${file.name} 업로드 실패`);
      }
    }
    if (files.length > 0) {
      toast.success(`${files.length}개 파일 업로드 완료`);
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        )}
      >
        <Upload className="size-4" />
        업로드
      </button>
    </>
  );
}
