import { SheetFooter, SheetBody, SheetContainer, SheetScrollColumn } from "@/shared/ui/sheet";
import {
  DetailSectionTitle,
  FileBrowser,
  ManageSheetClose,
  ManageSheetModeChange,
  MemoSection,
  useManageSheetData,
} from "../_base/ui";
import {
  useCreateProjectMemo,
  useUpdateProjectMemo,
  useDeleteProjectMemo,
} from "./api";
import { ProjectInfoSection } from "./project-info-section";
import { PriceSummary } from "./project-price-summary";
import { ProjectPartnerSection } from "./project-partner-section";
import { EstimateVersions } from "./project-estimate-versions";
import { PaymentForm, PaymentHistory } from "./project-payment-section";
import { ProjectGantt } from "../project-schedules/gantt/project-gantt";
import type { ProjectWithDetails } from "./types";

const projectMemoHooks = {
  useCreateMemo: useCreateProjectMemo,
  useUpdateMemo: useUpdateProjectMemo,
  useDeleteMemo: useDeleteProjectMemo,
};

// ── 헤더 ────────────────────────────────────────────────────

export function ProjectDetailHeader() {
  const { prevValues: data } = useManageSheetData<ProjectWithDetails>();
  if (!data) return null;

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">{data.name}</h2>
      {data.description && (
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
          {data.description}
        </p>
      )}
    </div>
  );
}

// ── 상세 보기 ────────────────────────────────────────────────

interface DetailViewProps {
  data: ProjectWithDetails;
  refetch: () => void;
}

export function DetailView({ data, refetch }: DetailViewProps) {
  const contractAmount = data.contractAmount ? Number(data.contractAmount) : 0;

  return (
    <>
      <SheetBody className="lg:grid-cols-[2fr_2.5fr_2.5fr]">
        {/* 좌측 */}
        <SheetScrollColumn className="flex flex-col">
          <SheetContainer>
            <ProjectInfoSection data={data} />
          </SheetContainer>

          {contractAmount > 0 && (
            <SheetContainer>
              <PriceSummary
                payments={data.payments}
                contractAmount={contractAmount}
                taxType={data.taxType}
              />
            </SheetContainer>
          )}

          <SheetContainer className="border-b-0!">
            <DetailSectionTitle>입금 내역</DetailSectionTitle>
            <PaymentHistory projectId={data.id} payments={data.payments} refetch={refetch} />
          </SheetContainer>
          <SheetContainer className="sticky bottom-0 border-t border-border-dark/50 bg-background/60 backdrop-blur-md">
            <PaymentForm projectId={data.id} onSuccess={refetch} />
          </SheetContainer>
        </SheetScrollColumn>

        {/* 우측 */}
        <SheetScrollColumn>
          <SheetContainer>
            <ProjectPartnerSection
              projectId={data.id}
              partners={data.projectPartners ?? []}
              refetch={refetch}
            />
          </SheetContainer>
          {data.estimateNumber && (
            <SheetContainer>
              <EstimateVersions estimateNumber={data.estimateNumber} />
            </SheetContainer>
          )}
          <SheetContainer>
            <MemoSection
              parentId={data.id}
              memos={data.memos}
              hooks={projectMemoHooks}
            />
          </SheetContainer>
        </SheetScrollColumn>

        {/* 파일 브라우저 */}
        <SheetScrollColumn className="flex flex-col">
          <SheetContainer className="flex flex-col flex-1 min-h-0">
            <FileBrowser
              owner={{ ownerType: "project", ownerId: data.id }}
              ownerName={data.name}
              fullHeight
            />
          </SheetContainer>
        </SheetScrollColumn>
      </SheetBody>

      <SheetContainer className="border-t border-border overflow-x-auto">
        <ProjectGantt
          projectId={data.id}
          clientId={data.clientId}
          contractDate={data.contractDate}
          deliveredDate={data.deliveredDate}
          completedDate={data.completedDate}
        />
      </SheetContainer>

      <SheetFooter>
        <ManageSheetClose />
        <ManageSheetModeChange mode="modify" />
      </SheetFooter>
    </>
  );
}
