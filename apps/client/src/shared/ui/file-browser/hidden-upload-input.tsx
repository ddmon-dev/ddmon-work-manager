import { uploadFiles } from "@/shared/ui/file-upload-zone";
import { useUploadFile } from "@/shared/lib/file-api";

interface HiddenUploadInputProps {
  ref: React.RefObject<HTMLInputElement | null>;
  folderId: string | null;
  uploadFile: ReturnType<typeof useUploadFile>;
}

export function HiddenUploadInput({
  ref,
  folderId,
  uploadFile,
}: HiddenUploadInputProps) {
  return (
    <input
      ref={ref}
      type="file"
      multiple
      className="hidden"
      onChange={async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        await uploadFiles(Array.from(files), folderId, uploadFile);
        e.target.value = "";
      }}
    />
  );
}
