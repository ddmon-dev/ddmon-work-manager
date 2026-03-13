import { format } from "date-fns";
import { formatPhoneNumber } from "@/shared/utils/format";
import { SheetFooter, SheetBody, SheetContainer } from "@/shared/ui/sheet";
import {
  DetailInfoRow,
  ManageSheetClose,
  ManageSheetModeChange,
  MemoSection,
} from "../_base/ui";
import {
  useCreateClientMemo,
  useUpdateClientMemo,
  useDeleteClientMemo,
} from "./api";
import type { ClientWithMemos } from "./types";

const clientMemoHooks = {
  useCreateMemo: useCreateClientMemo,
  useUpdateMemo: useUpdateClientMemo,
  useDeleteMemo: useDeleteClientMemo,
};

interface DetailViewProps {
  data: ClientWithMemos;
}

export function DetailView({ data }: DetailViewProps) {
  return (
    <>
      <SheetBody>
        <SheetContainer>
          <DetailInfoRow label="회사명" value={data.companyName} />
          <DetailInfoRow label="담당자" value={data.contactName} />
          <DetailInfoRow
            label="연락처"
            value={data.phone ? formatPhoneNumber(data.phone) : undefined}
          />
          <DetailInfoRow label="이메일" value={data.email} />
          <DetailInfoRow label="주소" value={data.address} />
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
            parentId={data.id}
            memos={data.memos}
            hooks={clientMemoHooks}
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
