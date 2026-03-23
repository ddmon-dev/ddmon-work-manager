import { format } from "date-fns";
import { SheetFooter, SheetBody, SheetContainer, SheetScrollColumn } from "@/shared/ui/sheet";
import {
  DetailInfoRow,
  ManageSheetClose,
  ManageSheetModeChange,
  MemoSection,
} from "../_base/ui";
import {
  useCreateClientEnvironmentMemo,
  useUpdateClientEnvironmentMemo,
  useDeleteClientEnvironmentMemo,
} from "./api";
import type { ClientEnvironmentWithMemos } from "./types";
import type { HostingData, DomainData, FtpData, CustomField } from "@packages/schemas";

const memoHooks = {
  useCreateMemo: useCreateClientEnvironmentMemo,
  useUpdateMemo: useUpdateClientEnvironmentMemo,
  useDeleteMemo: useDeleteClientEnvironmentMemo,
};

interface DetailViewProps {
  data: ClientEnvironmentWithMemos;
}

export function DetailView({ data }: DetailViewProps) {
  const hosting = data.hosting as HostingData | null;
  const domain = data.domain as DomainData | null;
  const rawFtp = data.ftp as FtpData | null;
  const ftp = rawFtp && (rawFtp.host || rawFtp.username || rawFtp.password) ? rawFtp : null;
  const customFields = data.customFields as CustomField[] | null;

  return (
    <>
      <SheetBody className="lg:grid-cols-[1fr_1fr]">
        <SheetScrollColumn>
          {/* 기본 정보 */}
          <SheetContainer>
            <DetailInfoRow label="사이트/서비스명" value={data.name} copyable />
            <DetailInfoRow label="고객사" value={data.customerName} copyable />
            <DetailInfoRow label="등록일" value={format(new Date(data.createdAt), "yyyy-MM-dd HH:mm")} />
            <DetailInfoRow label="수정일" value={format(new Date(data.updatedAt), "yyyy-MM-dd HH:mm")} />
            {data.notes && <DetailInfoRow label="비고" value={data.notes} vertical />}
          </SheetContainer>

          {/* 호스팅 */}
          {hosting && (
            <SheetContainer>
              <SectionTitle>호스팅</SectionTitle>
              <DetailInfoRow label="호스팅 업체" value={hosting.provider} copyable />
              <DetailInfoRow label="아이디" value={hosting.username} copyable />
              <DetailInfoRow label="비밀번호" value={hosting.password} copyable />
            </SheetContainer>
          )}

          {/* 도메인 */}
          {domain && (
            <SheetContainer>
              <SectionTitle>도메인</SectionTitle>
              <DetailInfoRow label="등록 업체" value={domain.registrar} copyable />
              <DetailInfoRow label="아이디" value={domain.username} copyable />
              <DetailInfoRow label="비밀번호" value={domain.password} copyable />
            </SheetContainer>
          )}

          {/* FTP */}
          {ftp && (
            <SheetContainer>
              <SectionTitle>FTP</SectionTitle>
              <DetailInfoRow label="호스트" value={ftp.host} copyable />
              <DetailInfoRow label="포트" value={ftp.port?.toString()} copyable />
              <DetailInfoRow label="아이디" value={ftp.username} copyable />
              <DetailInfoRow label="비밀번호" value={ftp.password} copyable />
            </SheetContainer>
          )}

          {/* 커스텀 필드 */}
          {customFields && customFields.length > 0 && (
            <SheetContainer>
              <SectionTitle>커스텀 필드</SectionTitle>
              {customFields.map((group, i) => (
                <div key={i} className="mb-3 last:mb-0">
                  <h5 className="text-xs font-medium text-muted-foreground mb-1">{group.category}</h5>
                  {group.items.map((item, j) => (
                    <DetailInfoRow key={j} label={item.label} value={item.value} copyable />
                  ))}
                </div>
              ))}
            </SheetContainer>
          )}
        </SheetScrollColumn>

        <SheetScrollColumn>
          <SheetContainer>
            <MemoSection
              parentId={data.id}
              memos={data.memos}
              hooks={memoHooks}
            />
          </SheetContainer>
        </SheetScrollColumn>
      </SheetBody>

      <SheetFooter>
        <ManageSheetClose />
        <ManageSheetModeChange mode="modify" />
      </SheetFooter>
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="text-sm font-semibold text-foreground mb-1">{children}</h4>;
}
