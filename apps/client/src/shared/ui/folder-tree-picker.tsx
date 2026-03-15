import { useState } from "react";
import { Folder, ChevronRight } from "lucide-react";
import { cn } from "@/shared/utils/classnames";
import { useFilesQuery, type FileOwner } from "@/shared/lib/file-api";

interface FolderTreePickerProps {
  owner?: FileOwner;
  selectedFolderId: string | null;
  onSelect: (folderId: string | null) => void;
  excludeIds?: string[];
}

export function FolderTreePicker({
  owner,
  selectedFolderId,
  onSelect,
  excludeIds = [],
}: FolderTreePickerProps) {
  return (
    <div className="space-y-0.5">
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
          selectedFolderId === null && "bg-accent font-medium"
        )}
        onClick={() => onSelect(null)}
      >
        <Folder className="size-4 text-blue-500" />
        루트
      </button>
      <FolderNodes
        folderId={null}
        owner={owner}
        selectedFolderId={selectedFolderId}
        onSelect={onSelect}
        excludeIds={excludeIds}
        depth={0}
      />
    </div>
  );
}

function FolderNodes({
  folderId,
  owner,
  selectedFolderId,
  onSelect,
  excludeIds,
  depth,
}: {
  folderId: string | null;
  owner?: FileOwner;
  selectedFolderId: string | null;
  onSelect: (folderId: string | null) => void;
  excludeIds: string[];
  depth: number;
}) {
  const { data: items } = useFilesQuery(folderId, owner);
  const folders =
    items?.filter((i) => i.isFolder && !excludeIds.includes(i.id)) ?? [];
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  if (folders.length === 0) return null;

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div style={{ paddingLeft: depth > 0 ? 16 : 0 }}>
      {folders.map((folder) => (
        <div key={folder.id}>
          <div
            role="button"
            tabIndex={0}
            className={cn(
              "flex w-full items-center gap-1 rounded-sm px-2 py-1 text-left text-sm hover:bg-accent",
              selectedFolderId === folder.id && "bg-accent font-medium"
            )}
            onClick={() => onSelect(folder.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSelect(folder.id);
            }}
          >
            <span
              role="button"
              tabIndex={0}
              className="shrink-0 rounded p-0.5 hover:bg-accent-foreground/10"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(folder.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.stopPropagation();
                  toggleExpand(folder.id);
                }
              }}
            >
              <ChevronRight
                className={cn(
                  "size-3 transition-transform",
                  expandedIds.has(folder.id) && "rotate-90"
                )}
              />
            </span>
            <Folder className="size-4 text-blue-500" />
            <span className="truncate">{folder.name}</span>
          </div>
          {expandedIds.has(folder.id) && (
            <FolderNodes
              folderId={folder.id}
              owner={owner}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
              excludeIds={excludeIds}
              depth={depth + 1}
            />
          )}
        </div>
      ))}
    </div>
  );
}
