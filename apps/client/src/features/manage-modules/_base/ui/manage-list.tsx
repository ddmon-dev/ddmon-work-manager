import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { APP_CONFIG } from "@/app.config";
import { type ColumnDef } from "@tanstack/react-table";
import { DataList, useDataList, createSelectionColumn } from "@/shared/ui/data-list";
import type { ManageSheetMode } from "../types";
import { useManageSheet } from "./manage-sheet";

interface ManageListProps<TData extends { id?: string }> {
  data: TData[];
  totalCount: number;
  isLoading?: boolean;
  listColumns: ColumnDef<TData>[];
  enableBulkAction?: boolean;
  onRowClick?: (row: TData) => void;
  rowClickMode?: ManageSheetMode;
}

export function ManageList<TData extends { id?: string }>({
  data,
  totalCount,
  isLoading,
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
  const processedColumns = useMemo(() => {
    let columns: ColumnDef<TData>[] = [...listColumns];
    if (enableBulkAction) {
      columns = [createSelectionColumn<TData>(), ...columns];
    }
    return columns;
  }, [listColumns, enableBulkAction]);

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

  const handleSelectionChange = useCallback((rows: TData[]) => {
    setSelectedRows(rows);
  }, []);

  if (isLoading) return null;

  return (
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
  );
}
