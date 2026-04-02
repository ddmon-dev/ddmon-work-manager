import { useState, useEffect } from "react";
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
import { FormTextInput, FormBizNumberInput } from "@/shared/ui/form";
import { CopyButton } from "@/shared/ui/copy-button";
import { useBusinessInfo, useUpdateBusinessInfo } from "./api";

const schema = z.object({
  name: z.string().min(1, "상호명을 입력해주세요."),
  nameEn: z.string().optional(),
  ceo: z.string().min(1, "대표자명을 입력해주세요."),
  bizNumber: z.string().min(1, "사업자번호를 입력해주세요."),
  address: z.string().min(1, "주소를 입력해주세요."),
  bizType: z.string().optional(),
  bizItem: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  accountHolder: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface BusinessInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="text-muted-foreground w-20 shrink-0 text-sm">{label}</span>
      {value ? (
        <CopyButton value={value} className="text-sm">
          {value}
        </CopyButton>
      ) : (
        <span className="text-sm">-</span>
      )}
    </div>
  );
}

export function BusinessInfoDialog({ open, onOpenChange }: BusinessInfoDialogProps) {
  const { data: bizInfo } = useBusinessInfo();
  const { mutate: update, isPending } = useUpdateBusinessInfo();
  const [isEditing, setIsEditing] = useState(false);

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      nameEn: "",
      ceo: "",
      bizNumber: "",
      address: "",
      bizType: "",
      bizItem: "",
      bankName: "",
      bankAccount: "",
      accountHolder: "",
    },
  });

  useEffect(() => {
    if (open) setIsEditing(false);
  }, [open]);

  useEffect(() => {
    if (isEditing && bizInfo) {
      reset({
        name: bizInfo.name ?? "",
        nameEn: bizInfo.nameEn ?? "",
        ceo: bizInfo.ceo ?? "",
        bizNumber: bizInfo.bizNumber ?? "",
        address: bizInfo.address ?? "",
        bizType: bizInfo.bizType ?? "",
        bizItem: bizInfo.bizItem ?? "",
        bankName: bizInfo.bankName ?? "",
        bankAccount: bizInfo.bankAccount ?? "",
        accountHolder: bizInfo.accountHolder ?? "",
      });
    }
  }, [isEditing, bizInfo, reset]);

  const onSubmit = (values: FormValues) => {
    update(values, { onSuccess: () => setIsEditing(false) });
  };

  if (isEditing) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>사업자 정보 수정</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <FieldGroup className="py-2">
              <FormTextInput control={control} name="name" label="상호명" placeholder="회사명" />
              <FormTextInput control={control} name="nameEn" label="영문 상호명" placeholder="Company Name" />
              <FormTextInput control={control} name="ceo" label="대표자명" placeholder="홍길동" />
              <FormBizNumberInput
                control={control}
                name="bizNumber"
                label="사업자번호"
                placeholder="000-00-00000"
              />
              <FormTextInput control={control} name="address" label="주소" placeholder="사업장 주소" />
              <div className="grid grid-cols-2 gap-3">
                <FormTextInput control={control} name="bizType" label="업태" placeholder="서비스업" />
                <FormTextInput control={control} name="bizItem" label="종목" placeholder="소프트웨어 개발" />
              </div>
              <FormTextInput control={control} name="bankName" label="은행명" placeholder="국민은행" />
              <FormTextInput control={control} name="bankAccount" label="계좌번호" placeholder="000-000000-00-000" />
              <FormTextInput control={control} name="accountHolder" label="예금주" placeholder="홍길동" />
            </FieldGroup>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>사업자 정보</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-4">
          <div>
            <InfoRow
              label="상호명"
              value={bizInfo?.name && bizInfo?.nameEn
                ? `${bizInfo.name}(${bizInfo.nameEn})`
                : bizInfo?.name}
            />
            <InfoRow label="대표자명" value={bizInfo?.ceo} />
            <InfoRow label="사업자번호" value={bizInfo?.bizNumber} />
            <InfoRow label="주소" value={bizInfo?.address} />
            <InfoRow label="업태" value={bizInfo?.bizType} />
            <InfoRow label="종목" value={bizInfo?.bizItem} />
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-xs font-medium">계좌 정보</p>
            <InfoRow label="은행명" value={bizInfo?.bankName} />
            <InfoRow label="계좌번호" value={bizInfo?.bankAccount} />
            <InfoRow label="예금주" value={bizInfo?.accountHolder} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
          <Button variant="black" onClick={() => setIsEditing(true)}>
            수정
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
