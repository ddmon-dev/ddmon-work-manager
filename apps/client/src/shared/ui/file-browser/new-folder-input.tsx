import { Folder } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/utils/classnames";

interface NewFolderInputProps {
  ref: React.RefObject<HTMLDivElement | null>;
  value: string;
  onChange: (value: string) => void;
  onCreate: () => void;
  onCancel: () => void;
  compact?: boolean;
}

export function NewFolderInput({
  ref,
  value,
  onChange,
  onCreate,
  onCancel,
  compact,
}: NewFolderInputProps) {
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-2 bg-muted/30",
        compact ? "px-3 py-1.5" : "border-b px-4 py-2"
      )}
    >
      <Folder className={cn("text-blue-500", compact ? "size-4" : "size-5")} />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="폴더 이름"
        className={cn("max-w-xs", compact ? "h-7 text-sm" : "h-8")}
        autoFocus
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return;
          if (e.key === "Enter") onCreate();
          if (e.key === "Escape") onCancel();
        }}
      />
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          className={cn(compact ? "h-6 text-xs" : "h-7")}
          onClick={onCreate}
        >
          생성
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={cn(compact ? "h-6 text-xs" : "h-7")}
          onClick={onCancel}
        >
          취소
        </Button>
      </div>
    </div>
  );
}
