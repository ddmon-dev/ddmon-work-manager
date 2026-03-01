import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { Badge } from "@/shared/ui/badge";
import { formatCurrency } from "@/shared/utils/format";
import type { OutstandingProject } from "./types";

const STATUS_LABELS: Record<string, string> = {
  pending: "대기",
  active: "진행",
  settling: "정산",
  completed: "완료",
  discarded: "폐기",
};

const STATUS_VARIANTS: Record<
  string,
  "outline" | "secondary" | "default" | "destructive"
> = {
  pending: "outline",
  active: "default",
  settling: "secondary",
  completed: "default",
  discarded: "destructive",
};

interface OutstandingTableProps {
  projects: OutstandingProject[];
}

export function OutstandingTable({ projects }: OutstandingTableProps) {
  return (
    <section className="overflow-hidden rounded-lg border">
      <div className="flex items-center px-4 py-3 border-b">
        <h2 className="text-base font-semibold">미수금 프로젝트</h2>
      </div>
      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          미수금 프로젝트가 없습니다
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>프로젝트명</TableHead>
              <TableHead>클라이언트</TableHead>
              <TableHead className="text-center">세금유형</TableHead>
              <TableHead className="text-right">청구액</TableHead>
              <TableHead className="text-right">입금액</TableHead>
              <TableHead className="text-right">잔액</TableHead>
              <TableHead className="text-center">상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="font-medium">{project.name}</TableCell>
                <TableCell>{project.clientName}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={project.taxType === "vat" ? "default" : "outline"}>
                    {project.taxType === "vat" ? "부가세" : "원천"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(project.billedAmount)}원
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(project.paidAmount)}원
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(project.outstanding)}원
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={STATUS_VARIANTS[project.status] ?? "outline"}>
                    {STATUS_LABELS[project.status] ?? project.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
