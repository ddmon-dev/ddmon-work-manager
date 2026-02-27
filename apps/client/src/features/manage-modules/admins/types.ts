export interface AdminDTO {
  id: string;
  name: string;
  email: string;
  username: string | null;
  superAdmin: boolean;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminListResponse {
  items: AdminDTO[];
  total: number;
  page: number;
  pageSize: number;
}
