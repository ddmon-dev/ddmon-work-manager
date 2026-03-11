import { X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import type { FileItem } from "./types";

interface FilePreviewProps {
  file: FileItem | null;
  onClose: () => void;
}

export function FilePreview({ file, onClose }: FilePreviewProps) {
  if (!file) return null;

  const isImage = file.mimeType?.startsWith("image/");
  const isPdf = file.mimeType === "application/pdf";

  if (!isImage && !isPdf) return null;

  const downloadUrl = `/api/files/${file.id}/download`;

  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="pr-8 truncate">{file.name}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto">
          {isImage && (
            <img
              src={downloadUrl}
              alt={file.name}
              className="mx-auto max-h-[70vh] object-contain"
            />
          )}
          {isPdf && (
            <iframe
              src={downloadUrl}
              title={file.name}
              className="h-[70vh] w-full rounded border"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
