export interface PaginationParams {
  page: number;
  pageSize: number;
  search?: string;
}

export interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
