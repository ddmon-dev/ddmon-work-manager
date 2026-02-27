import { format } from "date-fns";
import { formatPhoneNumber } from "@/shared/utils/format";
import { Badge } from "@/shared/ui/badge";
import { SheetFooter, SheetBody, SheetContainer } from "@/shared/ui/sheet";
import {
  DetailInfoRow,
  ManageSheetClose,
  ManageSheetModeChange,
} from "../_base/ui";
import type { AdminDTO } from "./types";

interface DetailViewProps {
  data: AdminDTO;
  refetch: () => void;
}

export function DetailView({ data }: DetailViewProps) {
  return (
    <>
      <SheetBody>
        <SheetContainer>
          <DetailInfoRow label="사용자명" value={data.username} />
          <DetailInfoRow label="이름" value={data.name} />
          <DetailInfoRow label="이메일" value={data.email} />
          <DetailInfoRow
            label="연락처"
            value={data.phone ? formatPhoneNumber(data.phone) : undefined}
          />
          <DetailInfoRow
            label="권한"
            value={
              data.superAdmin ? (
                <Badge variant="default">최고 관리자</Badge>
              ) : (
                <Badge variant="secondary">일반</Badge>
              )
            }
          />
          <DetailInfoRow
            label="등록일"
            value={format(new Date(data.createdAt), "yyyy-MM-dd HH:mm")}
          />
          <DetailInfoRow
            label="수정일"
            value={format(new Date(data.updatedAt), "yyyy-MM-dd HH:mm")}
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
