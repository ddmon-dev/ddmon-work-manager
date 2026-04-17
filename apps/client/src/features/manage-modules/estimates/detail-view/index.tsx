import { CopyPlus, FolderPlus } from "lucide-react";
import { useNavigate } from "react-router";
import {
  SheetFooter,
  SheetBody,
  SheetScrollColumn,
  SheetContainer,
} from "@/shared/ui/sheet";
import { Button } from "@/shared/ui/button";
import { Separator } from "@/shared/ui/separator";
import { NewlineText } from "@/shared/ui/newline-text";
import { DetailInfoRow, ManageSheetClose, ManageSheetModeChange, useManageSheet } from "../../_base/ui";
import { StatusButtons } from "../status-buttons";
import { VersionSelector } from "../version-selector";
import { EstimatePdfPreview } from "../pdf/estimate-pdf-preview";
import { EstimateInfo } from "./estimate-info";
import { ItemGroups } from "./item-groups";
import { PriceSummary } from "./price-summary";
import type { EstimateWithDetails } from "../types";

interface DetailViewProps {
  data: EstimateWithDetails;
  refetch: () => void;
}

export function DetailView({ data, refetch }: DetailViewProps) {
  const sheet = useManageSheet();
  const navigate = useNavigate();
  const currentId = sheet.data?.id;
  const mode = sheet.data?.mode;

  const estimateNumber = data.estimateNumber;
  const status = data.series?.status ?? "pending";
  const finalEstimateId = data.series?.finalEstimateId;
  const versions = data.versions ?? [];
  const currentVersion = versions.find((v) => v.id === currentId);
  const hasLinkedProject = !!data.linkedProject;

  return (
    <>
      {/* 견적서 헤더 (번호, 버전, 상태 버튼) */}
      <div className="border-b px-4 md:px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
          <span className="font-semibold text-base shrink-0">{estimateNumber}</span>
          {mode === "view" && (
            <>
              <Separator orientation="vertical" className="h-[20px]! hidden md:block" />
              <StatusButtons
                estimateNumber={estimateNumber}
                currentStatus={status}
                finalEstimateId={finalEstimateId}
                versions={versions}
                onSuccess={refetch}
              />
            </>
          )}
          {currentVersion && mode && (
            <>
              <Separator orientation="vertical" className="h-[20px]! hidden md:block" />
              <VersionSelector
                currentId={currentId ?? ""}
                version={currentVersion.version}
                versionLabel={currentVersion.versionLabel}
                finalEstimateId={finalEstimateId}
                versions={versions}
                mode={mode}
              />
            </>
          )}
          {mode === "view" && (
            <>
              <Separator orientation="vertical" className="h-[20px]! hidden md:block" />
              <Button
                variant="black"
                size="xs"
                rounded="full"
                onClick={() => sheet.open({ id: currentId!, mode: "duplicate", meta: { versionOf: estimateNumber } })}
              >
                <CopyPlus className="size-3.5" />
                새 버전
              </Button>
            </>
          )}
          {mode === "view" && status === "contracted" && !hasLinkedProject && (
            <>
              <Separator orientation="vertical" className="h-[20px]! hidden md:block" />
              <Button
                variant="default-outline"
                size="xs"
                rounded="full"
                onClick={() => navigate(`/projects?create_from=${estimateNumber}`)}
              >
                <FolderPlus className="size-3.5" />
                프로젝트 생성
              </Button>
            </>
          )}
        </div>
      </div>

      <SheetBody className="lg:grid-cols-[1fr_800px]">
        {/* 좌측: 상세 정보 */}
        <SheetScrollColumn>
          {/* 히어로 영역 */}
          <SheetContainer>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight">{data.title}</h2>
              {data.description && (
                <p className="text-sm text-muted-foreground">{data.description}</p>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
                <span className="font-medium text-foreground">
                  {data.estimateNumber}
                  {data.version > 1 && ` v${data.version}`}
                </span>
                <span className="text-border">|</span>
                <span>{data.client?.companyName}</span>
                {data.billingClient && data.billingClient.id !== data.clientId && (
                  <>
                    <span className="text-border">|</span>
                    <span>청구: {data.billingClient.companyName}</span>
                  </>
                )}
              </div>
            </div>
          </SheetContainer>

          {/* 메타 정보 */}
          <SheetContainer>
            <EstimateInfo data={data} />
          </SheetContainer>

          {/* 견적 항목 */}
          <SheetContainer>
            <ItemGroups groups={data.groups} />
          </SheetContainer>

          {/* 금액 요약 */}
          <SheetContainer>
            <PriceSummary
              groups={data.groups}
              taxType={data.taxType}
              discountType={data.discountType}
              discountValue={Number(data.discountValue) || 0}
              showTaxAmount={data.showTaxAmount ?? true}
            />
          </SheetContainer>

          {/* 비고/메모 */}
          {(data.notes || data.memo) && (
            <SheetContainer>
              <div className="space-y-4">
                {data.notes && (
                  <DetailInfoRow
                    label="비고"
                    value={
                      <ul className="list-disc list-outside pl-5 space-y-1">
                        {data.notes!.split("\n").filter(line => line.trim()).map((line, i) => (
                          <li key={i}>{line.trim()}</li>
                        ))}
                      </ul>
                    }
                    vertical
                    valueClassName="text-left text-wrap"
                  />
                )}
                {data.memo && (
                  <DetailInfoRow
                    label="내부 메모"
                    value={<NewlineText>{data.memo}</NewlineText>}
                    vertical
                    valueClassName="text-left text-pretty"
                  />
                )}
              </div>
            </SheetContainer>
          )}
        </SheetScrollColumn>

        {/* 우측: PDF 미리보기 */}
        <div className="hidden lg:flex flex-col min-h-0">
          <EstimatePdfPreview estimate={data} />
        </div>
      </SheetBody>

      <SheetFooter>
        <ManageSheetClose />
        <ManageSheetModeChange mode="modify" variant="black" />
      </SheetFooter>
    </>
  );
}
