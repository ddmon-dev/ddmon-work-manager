import { useState, useEffect, useRef } from "react";
import { APP_CONFIG } from "@/app.config";
import { type ColumnDef } from "@tanstack/react-table";
import { DataList, useDataList, createSelectionColumn } from "@/shared/ui/data-list";
import { ListSkeleton } from "@/shared/ui/skeletons/list-skeleton";
import { QueryError } from "@/shared/ui/query-error";
import type { ManageSheetMode } from "../types";
import { useManageSheet } from "./manage-sheet";

export interface ManageListState {
  isLoading?: boolean;
  isFetching?: boolean;
  isPlaceholderData?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

interface ManageListProps<TData extends { id?: string }> extends ManageListState {
  data: TData[];
  totalCount: number;
  listColumns: ColumnDef<TData>[];
  enableBulkAction?: boolean;
  onRowClick?: (row: TData) => void;
  rowClickMode?: ManageSheetMode;
}

export function ManageList<TData extends { id?: string }>({
  data,
  totalCount,
  isLoading,
  isFetching,
  isPlaceholderData,
  error,
  onRetry,
  listColumns,
  enableBulkAction = false,
  onRowClick,
  rowClickMode = "modify",
}: ManageListProps<TData>) {
  const manageSheet = useManageSheet();
  const [selectedRows, setSelectedRows] = useState<TData[]>([]);
  const [selectionKey, setSelectionKey] = useState(0);
  const isInitialMount = useRef(true);

  // 컬럼 처리
  const processedColumns = (() => {
    let columns: ColumnDef<TData>[] = [...listColumns];
    if (enableBulkAction) {
      columns = [createSelectionColumn<TData>(), ...columns];
    }
    return columns;
  })();

  // 데이터 변경 시 선택 상태 초기화
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (enableBulkAction && selectedRows.length > 0) {
      setSelectedRows([]);
      setSelectionKey((prev) => prev + 1);
    }
  }, [data, enableBulkAction]);

  const { page, setPage, pageCount, sort, setSort } = useDataList({
    totalCount,
    defaultPageSize: APP_CONFIG.UI.PAGINATION.PAGE_SIZE_OPTIONS[0],
  });

  const handleRowClick = (row: TData) => {
    if (onRowClick) {
      onRowClick(row);
    } else {
      manageSheet.open({ id: row.id, mode: rowClickMode });
    }
  };

  const handleSelectionChange = (rows: TData[]) => {
    setSelectedRows(rows);
  };

  if (isLoading || isPlaceholderData) return <ListSkeleton />;
  if (error && !data.length) return <QueryError onRetry={onRetry} />;

  return (
    <div className="flex flex-1 flex-col gap-2" aria-busy={!!isFetching}>
      {error && <QueryError onRetry={onRetry} message="최신 데이터를 가져오지 못했습니다. 이전 내용을 표시합니다." />}
      {isFetching && <p role="status" className="text-xs text-muted-foreground">목록을 갱신하고 있습니다.</p>}
      <DataList
        key={enableBulkAction ? selectionKey : undefined}
        data={data}
        columns={processedColumns}
        totalCount={totalCount}
        pageCount={pageCount}
        currentPage={page}
        maxVisible={APP_CONFIG.UI.PAGINATION.MAX_VISIBLE_PAGES}
        onPageChange={setPage}
        sortingKey={sort}
        onSortingChange={setSort}
        onRowClick={handleRowClick}
        onSelectionChange={enableBulkAction ? handleSelectionChange : undefined}
      />
    </div>
  );
}
