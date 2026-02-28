export type EstimateStatus = "pending" | "contracted" | "expired";

export interface EstimateVersion {
  id: string;
  version: number;
  versionLabel?: string | null;
  issuedDate?: string | null;
  isFinal: boolean;
  createdAt?: string;
}

export interface EstimateItemDTO {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  amount: string;
  sortOrder: number;
}

export interface EstimateGroupDTO {
  id: string;
  name: string;
  sortOrder: number;
  items: EstimateItemDTO[];
}

export interface EstimateSeries {
  estimateNumber: string;
  status: EstimateStatus;
  finalEstimateId?: string | null;
}

export interface EstimateListItem {
  id: string;
  estimateNumber: string;
  title: string;
  description?: string | null;
  issuedDate?: string | null;
  taxType: string;
  totalAmount: string;
  discountAmount: string;
  showTaxAmount: boolean;
  version: number;
  versionLabel?: string | null;
  createdAt: string;
  updatedAt: string;
  clientId: string;
  clientCompanyName: string;
  seriesStatus: EstimateStatus;
  finalEstimateId?: string | null;
}

export interface EstimateWithDetails {
  id: string;
  estimateNumber: string;
  title: string;
  description?: string | null;
  issuedDate?: string | null;
  issuer?: string | null;
  validUntil?: string | null;
  taxType: string;
  discountType: string;
  discountValue: string;
  showTaxAmount: boolean;
  totalAmount: string;
  discountAmount: string;
  version: number;
  versionLabel?: string | null;
  notes?: string | null;
  memo?: string | null;
  clientId: string;
  client: { id: string; companyName: string };
  groups: EstimateGroupDTO[];
  versions: EstimateVersion[];
  series: EstimateSeries;
  createdAt: string;
  updatedAt: string;
}

export interface EstimateListResponse {
  items: EstimateListItem[];
  total: number;
  page: number;
  pageSize: number;
}
