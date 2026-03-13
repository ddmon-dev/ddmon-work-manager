import { useState, useEffect } from "react";
import { Plus, MoreHorizontal, Pencil, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/utils/classnames";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { useBoardsQuery, useDeleteBoard, useReorderBoards } from "./api";
import { BoardDialog } from "./board-dialog";
import type { LibraryBoard } from "./types";

interface BoardListProps {
  selectedBoardId: string | null;
  onSelectBoard: (id: string) => void;
}

export function BoardList({ selectedBoardId, onSelectBoard }: BoardListProps) {
  const { data: serverBoards, isLoading } = useBoardsQuery();
  const [boards, setBoards] = useState<LibraryBoard[]>([]);
  const deleteBoard = useDeleteBoard();
  const reorderBoards = useReorderBoards();

  useEffect(() => {
    if (serverBoards) setBoards(serverBoards);
  }, [serverBoards]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBoards((prev) => {
      const oldIndex = prev.findIndex((b) => b.id === active.id);
      const newIndex = prev.findIndex((b) => b.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const reordered = arrayMove(prev, oldIndex, newIndex);
      reorderBoards.mutate(reordered.map((b) => b.id));
      return reordered;
    });
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editBoard, setEditBoard] = useState<LibraryBoard | null>(null);

  const handleEdit = (board: LibraryBoard) => {
    setEditBoard(board);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditBoard(null);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteBoard.mutateAsync(id);
  };

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">게시판</span>
        <Button variant="ghost" size="icon" className="size-7" onClick={handleCreate}>
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-1">
        {boards?.length === 0 && (
          <p className="p-3 text-center text-sm text-muted-foreground">
            게시판이 없습니다
          </p>
        )}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={boards?.map((b) => b.id) ?? []}
            strategy={verticalListSortingStrategy}
          >
            {boards?.map((board) => (
              <SortableBoardItem
                key={board.id}
                board={board}
                isSelected={selectedBoardId === board.id}
                onSelect={() => onSelectBoard(board.id)}
                onEdit={() => handleEdit(board)}
                onDelete={() => handleDelete(board.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      <BoardDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        board={editBoard}
      />
    </div>
  );
}

function SortableBoardItem({
  board,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: {
  board: LibraryBoard;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: board.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-1 rounded-md px-1 py-2 text-sm cursor-pointer hover:bg-accent",
        isSelected && "bg-accent font-medium"
      )}
      onClick={onSelect}
    >
      <button
        type="button"
        className="shrink-0 cursor-grab touch-none text-muted-foreground opacity-0 group-hover:opacity-100"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>
      <span className="truncate flex-1">{board.name}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 opacity-0 group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit()}>
            <Pencil className="mr-2 size-3.5" />
            수정
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDelete()} className="text-destructive">
            <Trash2 className="mr-2 size-3.5" />
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
