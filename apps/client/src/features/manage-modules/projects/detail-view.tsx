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
import { ProjectFinancialSection, TransactionForm } from "./project-financial-section";
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
  if (contractAmount > 0 && data.taxType === "vat") return "invoice";
  if (contractAmount > 0) return "financial";
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
      <SheetBody className="lg:grid-cols-[380px_1fr]">
        {/* 좌측 마스터 */}
        <SheetScrollColumn className="flex flex-col">
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

          <SheetContainer>
            <SummaryCards
              data={data}
              activePanel={activePanel}
              onSelect={setActivePanel}
            />
          </SheetContainer>

          <SheetContainer>
            <MemoSection
              parentId={data.id}
              memos={data.memos}
              hooks={projectMemoHooks}
            />
          </SheetContainer>
        </SheetScrollColumn>

        {/* 우측 디테일 */}
        <SheetScrollColumn className="flex flex-col">
          {activePanel === "invoice" && data.taxType === "vat" && contractAmount > 0 && (
            <SheetContainer>
              <ProjectInvoiceSection
                projectId={data.id}
                invoices={data.invoices ?? []}
                collections={data.collections ?? []}
                refetch={refetch}
              />
            </SheetContainer>
          )}

          {activePanel === "financial" && (
            <>
              <SheetContainer className="border-b-0!">
                <ProjectFinancialSection
                  projectId={data.id}
                  collections={data.collections ?? []}
                  expenses={data.expenses ?? []}
                  partnerPayments={data.partnerPayments ?? []}
                  projectPartners={data.projectPartners ?? []}
                  taxType={data.taxType}
                  refetch={refetch}
                />
              </SheetContainer>
              <SheetContainer className="sticky bottom-0 border-t border-border-dark/50 bg-background/60 backdrop-blur-md">
                <TransactionForm
                  projectId={data.id}
                  projectPartners={data.projectPartners ?? []}
                  taxType={data.taxType}
                  onSuccess={refetch}
                />
              </SheetContainer>
            </>
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
