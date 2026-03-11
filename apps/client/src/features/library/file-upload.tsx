import { useState, useRef, useCallback } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/shared/utils/classnames";
import { Spinner } from "@/shared/ui/spinner";
import { useUploadFile } from "./api";
import { toast } from "sonner";

interface FileUploadProps {
  folderId: string | null;
  children: React.ReactNode;
}

export function FileUpload({ folderId, children }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const uploadFile = useUploadFile();
  const dragCounter = useRef(0);

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      const files = Array.from(fileList);
      if (files.length === 0) return;
      setUploadProgress({ current: 0, total: files.length });
      let successCount = 0;
      for (let i = 0; i < files.length; i++) {
        setUploadProgress({ current: i + 1, total: files.length });
        try {
          await uploadFile.mutateAsync({ file: files[i], folderId });
          successCount++;
        } catch {
          toast.error(`${files[i].name} 업로드 실패`);
        }
      }
      setUploadProgress(null);
      if (successCount > 0) {
        toast.success(`${successCount}개 파일 업로드 완료`);
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
      {uploadProgress && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg border bg-background px-4 py-2 shadow-md">
          <Spinner className="size-4" />
          <span className="text-sm">
            업로드 중 ({uploadProgress.current}/{uploadProgress.total})
          </span>
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
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsUploading(true);
    let successCount = 0;
    for (const file of Array.from(files)) {
      try {
        await uploadFile.mutateAsync({ file, folderId });
        successCount++;
      } catch {
        toast.error(`${file.name} 업로드 실패`);
      }
    }
    setIsUploading(false);
    if (successCount > 0) {
      toast.success(`${successCount}개 파일 업로드 완료`);
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <input ref={inputRef} type="file" multiple className="hidden" onChange={handleChange} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90",
          isUploading && "opacity-50 cursor-not-allowed"
        )}
      >
        <Upload className="size-4" />
        {isUploading ? "업로드 중..." : "업로드"}
      </button>
    </>
  );
}
