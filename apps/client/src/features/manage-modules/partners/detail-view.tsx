import { format } from "date-fns";
import { Badge } from "@/shared/ui/badge";
import { formatPhoneNumber } from "@/shared/utils/format";
import { SheetFooter, SheetBody, SheetContainer } from "@/shared/ui/sheet";
import {
  DetailInfoRow,
  ManageSheetClose,
  ManageSheetModeChange,
  MemoSection,
} from "../_base/ui";
import {
  useCreatePartnerMemo,
  useUpdatePartnerMemo,
  useDeletePartnerMemo,
} from "./api";
import type { PartnerWithMemos } from "./types";

interface DetailViewProps {
  data: PartnerWithMemos;
}

export function DetailView({ data }: DetailViewProps) {
  const createMemo = useCreatePartnerMemo();
  const updateMemo = useUpdatePartnerMemo();
  const deleteMemo = useDeletePartnerMemo();

  const handleAddMemo = async (content: string) => {
    await createMemo.mutateAsync({ parentId: data.id, content });
  };

  const handleUpdateMemo = async (memoId: string, content: string) => {
    await updateMemo.mutateAsync({ parentId: data.id, memoId, content });
  };

  const handleDeleteMemo = async (memoId: string) => {
    await deleteMemo.mutateAsync({ parentId: data.id, memoId });
  };

  return (
    <>
      <SheetBody>
        <SheetContainer>
          <DetailInfoRow label="이름" value={data.name} />
          <DetailInfoRow
            label="연락처"
            value={data.phone ? formatPhoneNumber(data.phone) : undefined}
          />
          <DetailInfoRow label="이메일" value={data.email} />
          <DetailInfoRow label="주소" value={data.address} />
          <DetailInfoRow label="주민등록번호" value={data.residentNumber} />
          <DetailInfoRow label="은행명" value={data.bankName} />
          <DetailInfoRow label="계좌번호" value={data.bankAccount} />
          <DetailInfoRow label="예금주" value={data.accountHolder} />
          <DetailInfoRow
            label="전문분야"
            value={
              data.specialties && data.specialties.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {data.specialties.map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              ) : undefined
            }
          />
          <DetailInfoRow label="비고" value={data.notes} vertical />
          <DetailInfoRow
            label="등록일"
            value={format(new Date(data.createdAt), "yyyy-MM-dd HH:mm")}
          />
          <DetailInfoRow
            label="수정일"
            value={format(new Date(data.updatedAt), "yyyy-MM-dd HH:mm")}
          />
        </SheetContainer>

        <SheetContainer>
          <MemoSection
            memos={data.memos}
            onAdd={handleAddMemo}
            onUpdate={handleUpdateMemo}
            onDelete={handleDeleteMemo}
          />
        </SheetContainer>
      </SheetBody>

      <SheetFooter>
        <ManageSheetClose />
        <ManageSheetModeChange mode="modify" />
      </SheetFooter>
    </>
  );
}
