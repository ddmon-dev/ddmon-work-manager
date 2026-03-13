import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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
      // 에러 toast는 mutation onError에서 처리
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      <div className="relative">
        <FormTextarea
          control={form.control}
          name="content"
          placeholder="메모를 입력하세요..."
          className="min-h-[100px]! pb-10!"
        />
        <div className="absolute bottom-2 right-2 flex gap-1">
          {isEditMode && (
            <Button
              type="button"
              variant="secondary"
              size="xs"
              rounded="full"
              onClick={onCancel}
            >
              취소
            </Button>
          )}
          <LoadingButton
            type="submit"
            size={isEditMode ? "xs" : "default"}
            rounded="full"
            isLoading={form.formState.isSubmitting}
          >
            저장
          </LoadingButton>
        </div>
      </div>
    </form>
  );
}
