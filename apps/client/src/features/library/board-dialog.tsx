import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { libraryBoardWriteSchema, type LibraryBoardWriteInput } from "@packages/schemas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/ui/dialog";
import { FormTextInput } from "@/shared/ui/form";
import { Button } from "@/shared/ui/button";
import { useCreateBoard, useUpdateBoard } from "./api";
import type { LibraryBoard } from "./types";
import type { Resolver } from "react-hook-form";

interface BoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  board?: LibraryBoard | null;
}

export function BoardDialog({ open, onOpenChange, board }: BoardDialogProps) {
  const isEdit = !!board;
  const createBoard = useCreateBoard();
  const updateBoard = useUpdateBoard();

  const { control, handleSubmit, reset } = useForm<LibraryBoardWriteInput>({
    resolver: zodResolver(libraryBoardWriteSchema) as Resolver<LibraryBoardWriteInput>,
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: board?.name ?? "",
        description: board?.description ?? "",
      });
    }
  }, [open, board, reset]);

  const onSubmit = async (data: LibraryBoardWriteInput) => {
    if (isEdit) {
      await updateBoard.mutateAsync({ id: board.id, data });
    } else {
      await createBoard.mutateAsync(data);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "게시판 수정" : "게시판 생성"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormTextInput
            control={control}
            name="name"
            label="이름"
            placeholder="게시판 이름"
          />
          <FormTextInput
            control={control}
            name="description"
            label="설명"
            placeholder="게시판 설명 (선택)"
            optional
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={createBoard.isPending || updateBoard.isPending}>
              {isEdit ? "수정" : "생성"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
