import { useState } from "react";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/utils/classnames";
import { useBoardsQuery, useDeleteBoard } from "./api";
import { BoardDialog } from "./board-dialog";
import type { LibraryBoard } from "./types";

interface BoardListProps {
  selectedBoardId: string | null;
  onSelectBoard: (id: string) => void;
}

export function BoardList({ selectedBoardId, onSelectBoard }: BoardListProps) {
  const { data: boards, isLoading } = useBoardsQuery();
  const deleteBoard = useDeleteBoard();

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
        {boards?.map((board) => (
          <div
            key={board.id}
            className={cn(
              "group flex items-center justify-between rounded-md px-3 py-2 text-sm cursor-pointer hover:bg-accent",
              selectedBoardId === board.id && "bg-accent font-medium"
            )}
            onClick={() => onSelectBoard(board.id)}
          >
            <span className="truncate">{board.name}</span>
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
                <DropdownMenuItem onClick={() => handleEdit(board)}>
                  <Pencil className="mr-2 size-3.5" />
                  수정
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDelete(board.id)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 size-3.5" />
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>

      <BoardDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        board={editBoard}
      />
    </div>
  );
}
