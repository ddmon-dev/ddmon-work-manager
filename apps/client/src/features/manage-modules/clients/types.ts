import type { MemoItem } from "../_base/types";

export interface ClientDTO {
  id: string;
  companyName: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  author: string | null;
  updatedBy: string | null;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientWithMemos extends ClientDTO {
  memos: MemoItem[];
}

export interface ClientListResponse {
  items: ClientDTO[];
  total: number;
  page: number;
  pageSize: number;
}
