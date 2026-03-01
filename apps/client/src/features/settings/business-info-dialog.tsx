import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { FieldGroup } from "@/shared/ui/field";
import { FormTextInput } from "@/shared/ui/form";
import { useBusinessInfo, useUpdateBusinessInfo } from "./api";

const schema = z.object({
  name: z.string().min(1, "상호명을 입력해주세요."),
  ceo: z.string().min(1, "대표자명을 입력해주세요."),
  bizNumber: z.string().min(1, "사업자번호를 입력해주세요."),
  address: z.string().min(1, "주소를 입력해주세요."),
});

type FormValues = z.infer<typeof schema>;

interface BusinessInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BusinessInfoDialog({ open, onOpenChange }: BusinessInfoDialogProps) {
  const { data: bizInfo } = useBusinessInfo();
  const { mutate: update, isPending } = useUpdateBusinessInfo();

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", ceo: "", bizNumber: "", address: "" },
  });

  useEffect(() => {
    if (open && bizInfo) {
      reset({
        name: bizInfo.name ?? "",
        ceo: bizInfo.ceo ?? "",
        bizNumber: bizInfo.bizNumber ?? "",
        address: bizInfo.address ?? "",
      });
    }
  }, [open, bizInfo, reset]);

  const onSubmit = (values: FormValues) => {
    update(values, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>사업자 정보</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup className="py-2">
            <FormTextInput control={control} name="name" label="상호명" placeholder="회사명" />
            <FormTextInput control={control} name="ceo" label="대표자명" placeholder="홍길동" />
            <FormTextInput
              control={control}
              name="bizNumber"
              label="사업자번호"
              placeholder="000-00-00000"
            />
            <FormTextInput control={control} name="address" label="주소" placeholder="사업장 주소" />
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
