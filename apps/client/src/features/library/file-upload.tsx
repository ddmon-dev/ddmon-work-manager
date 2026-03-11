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
    // 폴더 행에서 stopPropagation 된 경우 여기까지 오지 않음
    // 폴더가 아닌 영역에 드롭된 경우에만 현재 폴더로 업로드
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // 캡처 단계에서 드래그 상태 정리 (자식의 stopPropagation과 무관하게 항상 실행)
  const handleDropCapture = () => {
    dragCounter.current = 0;
    setIsDragging(false);
  };

  return (
    <div
      className={cn(
        "relative flex-1 transition-colors",
        isDragging && "bg-primary/5 ring-2 ring-inset ring-primary/30"
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDropCapture={handleDropCapture}
      onDrop={handleDrop}
    >
      {children}
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
