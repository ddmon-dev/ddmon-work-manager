import { useQueryParams } from "@/shared/hooks/use-query-params";

interface UseDataListOptions {
  defaultSort?: string;
  pageKey?: string;
  pageSizeKey?: string;
  sortKey?: string;
  searchKey?: string;
  categoryKey?: string;
}

interface UseDataListParams {
  totalCount: number;
  defaultPageSize?: number;
  options?: UseDataListOptions;
}

export function useDataList({
  totalCount,
  defaultPageSize = 15,
  options,
}: UseDataListParams) {
  const { get, set } = useQueryParams();

  const pageKey = options?.pageKey || "page";
  const pageSizeKey = options?.pageSizeKey || "pageSize";
  const sortKey = options?.sortKey || "sort";
  const searchKey = options?.searchKey || "search";
  const categoryKey = options?.categoryKey || "category";

  const rawPage = Number(get(pageKey)) || 1;
  const pageSize = Number(get(pageSizeKey)) || defaultPageSize;
  const sort = get(sortKey) || options?.defaultSort || "";
  const search = get(searchKey) || "";
  const category = get(categoryKey) || "";

  const setPage = (p: number) => set(pageKey, String(p));
  const setSort = (s: string) => set(sortKey, s);
  const setSearch = (s: string) => set({ [searchKey]: s, [pageKey]: "1" });
  const setCategory = (c: string) => set(categoryKey, c);

  const pageCount = Math.ceil(totalCount / pageSize);
  const page = Math.min(Math.max(1, rawPage), Math.max(1, pageCount));

  return {
    page,
    pageSize,
    sort,
    search,
    category,
    pageCount,
    setPage,
    setSort,
    setSearch,
    setCategory,
  };
}
