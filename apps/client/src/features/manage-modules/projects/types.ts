import type { MemoItem } from "../_base/types";

export type ProjectStatus = "pending" | "active" | "settling" | "completed" | "discarded";
export type WorkPhase = "preparing" | "working" | "reviewing" | "delivered";
export type TaxType = "withholding" | "vat";

export interface ProjectClientInfo {
  id: string;
  companyName: string;
}

export interface PaymentDTO {
  id: string;
  projectId: string;
  description: string;
  amount: string;
  paidDate: string;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDTO {
  id: string;
  projectNumber: string;
  clientId: string;
  client: ProjectClientInfo;
  estimateNumber: string | null;
  name: string;
  description: string | null;
  status: ProjectStatus;
  workPhase: WorkPhase;
  contractDate: string;
  completedDate: string | null;
  deliveredDate: string | null;
  notes: string | null;
  contractAmount: string | null;
  taxType: TaxType | null;
  totalPaid: number;
  author: string;
  updatedBy: string | null;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectWithDetails extends Omit<ProjectDTO, "totalPaid"> {
  payments: PaymentDTO[];
  memos: MemoItem[];
}

export interface ProjectListResponse {
  items: ProjectDTO[];
  total: number;
  page: number;
  pageSize: number;
}
