import { DetailInfoRow } from "../_base/ui";
import { StatusBadge } from "./status-badge";
import { WorkPhaseIndicator } from "./work-phase-indicator";
import type { ProjectWithDetails } from "./types";

interface ProjectInfoSectionProps {
  data: ProjectWithDetails;
}

export function ProjectInfoSection({ data }: ProjectInfoSectionProps) {
  return (
    <>
      <DetailInfoRow label="프로젝트 번호" value={data.projectNumber} />
      <DetailInfoRow label="고객" value={data.client?.companyName} />
      {data.estimateNumber && (
        <DetailInfoRow label="견적서 번호" value={data.estimateNumber} />
      )}
      <DetailInfoRow
        label="상태"
        value={<StatusBadge projectId={data.id} status={data.status} />}
      />
      <DetailInfoRow
        label="작업단계"
        value={<WorkPhaseIndicator projectId={data.id} workPhase={data.workPhase} />}
      />
      <DetailInfoRow label="계약일" value={data.contractDate} />
      <DetailInfoRow label="납품일" value={data.deliveredDate} />
      <DetailInfoRow label="완료일" value={data.completedDate} />
    </>
  );
}
