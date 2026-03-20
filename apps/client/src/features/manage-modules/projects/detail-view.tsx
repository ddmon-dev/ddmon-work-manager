import { useState } from "react";
import { SheetFooter, SheetBody, SheetContainer, SheetScrollColumn } from "@/shared/ui/sheet";
import {
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
import { ProjectInvoiceSection } from "./project-invoice-section";
import { ProjectPartnerSection } from "./project-partner-section";
import { EstimateVersions } from "./project-estimate-versions";
import { ProjectExpenseSection } from "./project-expense-section";
import { ProjectGantt } from "../project-schedules/gantt/project-gantt";
import { SummaryCards, type PanelType } from "./detail-summary-cards";
import type { ProjectWithDetails } from "./types";

const projectMemoHooks = {
  useCreateMemo: useCreateProjectMemo,
  useUpdateMemo: useUpdateProjectMemo,
  useDeleteMemo: useDeleteProjectMemo,
};

function getDefaultPanel(data: ProjectWithDetails): PanelType {
  const contractAmount = data.contractAmount ? Number(data.contractAmount) : 0;
  if (contractAmount > 0) return "finance";
  return "partner";
}

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
  const [activePanel, setActivePanel] = useState<PanelType>(() => getDefaultPanel(data));

  return (
    <>
      <SheetBody className="lg:grid-cols-[minmax(0,2fr)_minmax(0,7fr)_minmax(0,3fr)]">
        {/* 좌측: 기본정보 + 금액요약 */}
        <SheetScrollColumn>
          <SheetContainer>
            <ProjectInfoSection data={data} />
          </SheetContainer>

          {contractAmount > 0 && (
            <SheetContainer>
              <PriceSummary
                collections={data.collections ?? []}
                expenses={data.expenses ?? []}
                partnerPayments={data.partnerPayments ?? []}
                contractAmount={contractAmount}
                taxType={data.taxType}
              />
            </SheetContainer>
          )}
        </SheetScrollColumn>

        {/* 중앙: 요약 카드(가로 탭) + 선택 패널 */}
        <SheetScrollColumn className="flex flex-col">
          <SheetContainer className="py-3">
            <SummaryCards
              data={data}
              activePanel={activePanel}
              onSelect={setActivePanel}
            />
          </SheetContainer>

          {activePanel === "finance" && contractAmount > 0 && (
            <div className="grid grid-cols-2 divide-x">
              <SheetContainer>
                <ProjectInvoiceSection
                  projectId={data.id}
                  invoices={data.invoices ?? []}
                  collections={data.collections ?? []}
                  contractAmount={contractAmount}
                  taxType={data.taxType}
                  refetch={refetch}
                />
              </SheetContainer>
              <SheetContainer>
                <ProjectExpenseSection
                  projectId={data.id}
                  expenses={data.expenses ?? []}
                  partnerPayments={data.partnerPayments ?? []}
                  projectPartners={data.projectPartners ?? []}
                  refetch={refetch}
                />
              </SheetContainer>
            </div>
          )}

          {activePanel === "partner" && (
            <SheetContainer>
              <ProjectPartnerSection
                projectId={data.id}
                partners={data.projectPartners ?? []}
                refetch={refetch}
              />
            </SheetContainer>
          )}

          {activePanel === "estimate" && data.estimateNumber && (
            <SheetContainer>
              <EstimateVersions estimateNumber={data.estimateNumber} />
            </SheetContainer>
          )}

          {activePanel === "file" && (
            <SheetContainer className="flex flex-col flex-1 min-h-0">
              <FileBrowser
                owner={{ ownerType: "project", ownerId: data.id }}
                ownerName={data.name}
                fullHeight
              />
            </SheetContainer>
          )}
        </SheetScrollColumn>

        {/* 우측: 메모 */}
        <SheetScrollColumn>
          <SheetContainer>
            <MemoSection
              parentId={data.id}
              memos={data.memos}
              hooks={projectMemoHooks}
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
