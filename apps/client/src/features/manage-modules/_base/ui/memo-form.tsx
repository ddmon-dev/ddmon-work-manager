import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CRUD_ERRORS } from "@/shared/constants/error-messages";
import { Button } from "@/shared/ui/button";
import { LoadingButton } from "@/shared/ui/loading-button";
import { FormTextarea } from "@/shared/ui/form";
import type { MemoItem } from "../types";

const formSchema = z.object({
  content: z.string().min(1, "메모 내용을 입력해주세요."),
});

interface MemoFormProps {
  onSubmit: (content: string) => Promise<void>;
  memo?: MemoItem;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function MemoForm({ onSubmit, memo, onSuccess, onCancel }: MemoFormProps) {
  const isEditMode = !!memo;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { content: memo?.content ?? "" },
  });

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      await onSubmit(data.content.trim());
      onSuccess?.();
      if (!isEditMode) form.reset();
    } catch {
      toast.error(isEditMode ? CRUD_ERRORS.UPDATE_FAILED("메모") : CRUD_ERRORS.CREATE_FAILED("메모"));
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
      <FormTextarea
        control={form.control}
        name="content"
        placeholder="메모를 입력하세요..."
        className="min-h-[100px]!"
      />
      {isEditMode ? (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onCancel}
          >
            취소
          </Button>
          <LoadingButton
            type="submit"
            size="sm"
            isLoading={form.formState.isSubmitting}
          >
            저장
          </LoadingButton>
        </div>
      ) : (
        <LoadingButton
          type="submit"
          isLoading={form.formState.isSubmitting}
          size="sm"
        >
          저장
        </LoadingButton>
      )}
    </form>
  );
}
