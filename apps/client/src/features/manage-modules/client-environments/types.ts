import type { MemoItem } from "../_base/types";
import type { HostingData, DomainData, FtpData, CustomField } from "@packages/schemas";

export interface ClientEnvironmentDTO {
  id: string;
  customerName: string;
  name: string;
  hosting: HostingData | null;
  domain: DomainData | null;
  ftp: FtpData | null;
  customFields: CustomField[] | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientEnvironmentWithMemos extends ClientEnvironmentDTO {
  memos: MemoItem[];
}

export interface ClientEnvironmentListResponse {
  items: ClientEnvironmentDTO[];
  total: number;
  page: number;
  pageSize: number;
}
