import { useState, useRef, useCallback } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/shared/utils/classnames";
import { Spinner } from "@/shared/ui/spinner";
import { Button } from "@/shared/ui/button";
import { useUploadFile, type FileOwner } from "@/shared/lib/file-api";
import { toast } from "sonner";

/** 파일 배열을 순차 업로드하는 공유 함수 */
export async function uploadFiles(
  fileList: File[],
  folderId: string | null,
  uploadMutation: ReturnType<typeof useUploadFile>
): Promise<{ successCount: number; failCount: number }> {
  let successCount = 0;
  let failCount = 0;
  for (const file of fileList) {
    try {
      await uploadMutation.mutateAsync({ file, folderId });
      successCount++;
    } catch (err) {
      toast.error(`${file.name} 업로드 실패`, {
        description: err instanceof Error ? err.message : undefined,
      });
      failCount++;
    }
  }
  if (successCount > 0) {
    toast.success(`${successCount}개 파일 업로드 완료`);
  }
  return { successCount, failCount };
}

interface FileUploadZoneProps {
  folderId: string | null;
  owner?: FileOwner;
  children: React.ReactNode;
}

export function FileUploadZone({ folderId, owner, children }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
    loaded: number;
    fileTotal: number;
  } | null>(null);
  const uploadFile = useUploadFile(owner, (loaded, total) => {
    setUploadProgress((prev) =>
      prev ? { ...prev, loaded, fileTotal: total } : null
    );
  });
  const dragCounter = useRef(0);

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      const files = Array.from(fileList);
      if (files.length === 0) return;
      let successCount = 0;
      let failCount = 0;
      const failReasons: string[] = [];
      for (let i = 0; i < files.length; i++) {
        setUploadProgress({ current: i + 1, total: files.length, loaded: 0, fileTotal: 0 });
        try {
          await uploadFile.mutateAsync({ file: files[i], folderId });
          successCount++;
        } catch (err) {
          failCount++;
          const message = err instanceof Error ? err.message : "";
          if (message && !failReasons.includes(message)) failReasons.push(message);
        }
      }
      setUploadProgress(null);
      if (successCount > 0) {
        toast.success(`${successCount}개 파일 업로드 완료`);
      }
      if (failCount > 0) {
        toast.error(`${failCount}개 파일 업로드 실패`, {
          description: failReasons.join("\n") || undefined,
        });
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

  const handleDropCapture = () => {
    dragCounter.current = 0;
    setIsDragging(false);
  };

  const percent =
    uploadProgress && uploadProgress.fileTotal > 0
      ? Math.round((uploadProgress.loaded / uploadProgress.fileTotal) * 100)
      : 0;

  return (
    <div
      className={cn(
        "relative flex flex-col h-full min-w-0 flex-1 transition-colors",
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
        <div className="absolute bottom-4 left-1/2 z-50 w-72 -translate-x-1/2 rounded-lg border bg-background px-4 py-3 shadow-md">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Spinner className="size-4" />
              업로드 중 ({uploadProgress.current}/{uploadProgress.total})
            </span>
            <span className="text-xs text-muted-foreground">{percent}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-200"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface UploadButtonProps {
  folderId: string | null;
  owner?: FileOwner;
  size?: "sm" | "xs";
}

export function UploadButton({ folderId, owner, size = "sm" }: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadFile = useUploadFile(owner);
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    await uploadFiles(Array.from(files), folderId, uploadFile);
    setIsUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <input ref={inputRef} type="file" multiple className="hidden" onChange={handleChange} />
      <Button
        size={size === "xs" ? "xs" : "sm"}
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
      >
        <Upload />
        {isUploading ? "업로드 중..." : "업로드"}
      </Button>
    </>
  );
}
