import type { ProjectStatus, WorkPhase } from "./types";

export const CONFIG = {
  moduleName: "프로젝트",
} as const;

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  pending: "대기중",
  active: "진행중",
  settling: "정산중",
  completed: "완료",
  discarded: "폐기",
};

export const WORK_PHASE_LABELS: Record<WorkPhase, string> = {
  preparing: "착수대기",
  working: "작업중",
  reviewing: "검수중",
  delivered: "납품완료",
};

export const PROJECT_STATUS_OPTIONS = Object.entries(PROJECT_STATUS_LABELS).map(
  ([value, label]) => ({ value, label })
);

export const WORK_PHASE_OPTIONS = Object.entries(WORK_PHASE_LABELS).map(
  ([value, label]) => ({ value, label })
);

export const TAX_TYPE_OPTIONS = [
  { value: "exclusive", label: "VAT 별도" },
  { value: "inclusive", label: "VAT 포함" },
  { value: "withholding", label: "원천징수(3.3%)" },
];
