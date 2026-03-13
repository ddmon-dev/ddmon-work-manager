import type { MemoItem } from "../_base/types";

export interface PartnerDTO {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  residentNumber: string | null;
  bankName: string | null;
  bankAccount: string | null;
  accountHolder: string | null;
  specialties: string[] | null;
  notes: string | null;
  author: string | null;
  updatedBy: string | null;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerWithMemos extends PartnerDTO {
  memos: MemoItem[];
}

export interface PartnerListResponse {
  items: PartnerDTO[];
  total: number;
  page: number;
  pageSize: number;
}
