import * as React from "react";
import {
  type ColumnDef,
  type RowData,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { APP_CONFIG } from "@/app.config";
import { cn } from "@/shared/utils/classnames";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { Spinner } from "@/shared/ui/spinner";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/shared/ui/pagination";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { SortingButton } from "./sorting-button";
import { PageSizeSelect } from "./page-size-select";
import { ListEmpty } from "./list-empty";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string;
    headerClassName?: string;
    cellClassName?: string;
    truncate?: boolean;
  }
}

interface DataListProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];

  totalCount: number;
  pageCount: number;
  currentPage?: number;
  maxVisible?: number;
  mobileMaxVisible?: number;
  onPageChange?: (page: number) => void;

  sortingKey?: string;
  onSortingChange?: (key: string) => void;

  onSelectionChange?: (rows: TData[]) => void;

  isLoading?: boolean;

  onRowClick?: (row: TData) => void;
}

export function DataList<TData>({
  data,
  columns,
  totalCount,
  pageCount,
  currentPage = 1,
  maxVisible,
  mobileMaxVisible,
  onPageChange,
  sortingKey,
  onSortingChange,
  onSelectionChange,
  onRowClick,
  isLoading,
}: DataListProps<TData>) {
  const [rowSelection, setRowSelection] = React.useState({});

  const processedColumns = React.useMemo(() => {
    return columns.map((col) => {
      if (
        col.enableSorting &&
        typeof col.header === "string" &&
        "accessorKey" in col
      ) {
        const columnKey = col.accessorKey as string;
        const headerText = col.header;
        return {
          ...col,
          header: () => (
            <SortingButton
              columnKey={columnKey}
              currentSortKey={sortingKey}
              onSort={onSortingChange}
            >
              {headerText}
            </SortingButton>
          ),
        };
      }
      return col;
    });
  }, [columns, sortingKey, onSortingChange]);

  const table = useReactTable({
    data,
    columns: processedColumns,
    getCoreRowModel: getCoreRowModel(),
    defaultColumn: { size: undefined },
    onRowSelectionChange: setRowSelection,
    state: { rowSelection },
  });

  React.useEffect(() => {
    if (onSelectionChange) {
      const selectedRows = table
        .getFilteredSelectedRowModel()
        .rows.map((row) => row.original);
      onSelectionChange(selectedRows);
    }
  }, [rowSelection, table, onSelectionChange]);

  const handleRowClick = (
    event: React.MouseEvent<HTMLTableRowElement>,
    row: TData
  ) => {
    const eventTarget = event.target as HTMLElement;
    const currentTarget = event.currentTarget as HTMLElement;
    if (!currentTarget.contains(eventTarget)) return;
    const isInteractive = eventTarget.closest(
      "button, input, select, textarea, a"
    );
    if (isInteractive) return;
    onRowClick?.(row);
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="flex items-center justify-between mb-2 pl-2 md:pl-4">
        <span className="text-sm text-muted-foreground font-semibold">
          Total ({totalCount})
        </span>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const size = header.column.columnDef.size;
                  const meta = header.column.columnDef.meta;
                  return (
                    <TableHead
                      key={header.id}
                      style={size ? { width: size } : undefined}
                      className={cn(
                        "font-semibold text-center",
                        meta?.className,
                        meta?.headerClassName
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <div className="flex items-center justify-center h-[200px]">
                    <Spinner />
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={(event) => handleRowClick(event, row.original)}
                  className="hover:bg-muted/50 cursor-pointer"
                >
                  {row.getVisibleCells().map((cell) => {
                    const size = cell.column.columnDef.size;
                    const meta = cell.column.columnDef.meta;
                    const cellContent = flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext()
                    );
                    return (
                      <TableCell
                        key={cell.id}
                        style={size ? { width: size } : undefined}
                        className={cn(
                          "text-center",
                          meta?.className,
                          meta?.cellClassName
                        )}
                      >
                        {meta?.truncate ? (
                          <div className="truncate w-[90%]">{cellContent}</div>
                        ) : (
                          cellContent
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <ListEmpty />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="my-2" />

      <div className="sticky bottom-0 bg-background flex items-center justify-center border-t p-4 -mx-4 rounded-b-lg md:justify-between mt-auto">
        <DataListPagination
          pageCount={pageCount}
          currentPage={currentPage}
          maxVisible={maxVisible}
          mobileMaxVisible={mobileMaxVisible}
          onPageChange={onPageChange}
        />
        <div className="ml-auto hidden md:block">
          <PageSizeSelect />
        </div>
      </div>
    </div>
  );
}

interface DataListPaginationProps {
  pageCount: number;
  currentPage: number;
  maxVisible?: number;
  mobileMaxVisible?: number;
  onPageChange?: (page: number) => void;
}

function DataListPagination({
  pageCount: rawPageCount,
  maxVisible = APP_CONFIG.UI.PAGINATION.MAX_VISIBLE_PAGES,
  mobileMaxVisible = APP_CONFIG.UI.PAGINATION.MOBILE_MAX_VISIBLE_PAGES,
  currentPage,
  onPageChange,
}: DataListPaginationProps) {
  const pageCount = Math.max(1, rawPageCount);
  const isMobile = useIsMobile();
  const effectiveMaxVisible = isMobile ? mobileMaxVisible : maxVisible;

  const canPreviousPage = currentPage > 1;
  const canNextPage = currentPage < pageCount;

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];

    if (pageCount <= effectiveMaxVisible) {
      for (let i = 1; i <= pageCount; i++) pages.push(i);
    } else {
      const sideCount = Math.floor((effectiveMaxVisible - 3) / 2);
      pages.push(1);
      if (currentPage > sideCount + 2) pages.push("ellipsis");
      const start = Math.max(2, currentPage - sideCount);
      const end = Math.min(pageCount - 1, currentPage + sideCount);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < pageCount - sideCount - 1) pages.push("ellipsis");
      pages.push(pageCount);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <Pagination className="justify-center md:justify-start">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => canPreviousPage && onPageChange?.(currentPage - 1)}
            className={
              !canPreviousPage
                ? "pointer-events-none opacity-50"
                : "cursor-pointer"
            }
          />
        </PaginationItem>

        {pageNumbers.map((page, index) =>
          page === "ellipsis" ? (
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={page}>
              <PaginationLink
                onClick={() => onPageChange?.(page)}
                isActive={page === currentPage}
                className="cursor-pointer"
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          )
        )}

        <PaginationItem>
          <PaginationNext
            onClick={() => canNextPage && onPageChange?.(currentPage + 1)}
            className={
              !canNextPage ? "pointer-events-none opacity-50" : "cursor-pointer"
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
