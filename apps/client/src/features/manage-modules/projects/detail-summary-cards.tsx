import { cn } from "@/shared/utils/classnames";
import { formatCurrency } from "@/shared/utils/format";
import { FileText, ArrowLeftRight, Users, FileSpreadsheet, FolderOpen } from "lucide-react";
import type { ProjectWithDetails } from "./types";

export type PanelType = "invoice" | "financial" | "partner" | "estimate" | "file";

interface SummaryCardsProps {
  data: ProjectWithDetails;
  activePanel: PanelType;
  onSelect: (panel: PanelType) => void;
}

export function SummaryCards({ data, activePanel, onSelect }: SummaryCardsProps) {
  const contractAmount = data.contractAmount ? Number(data.contractAmount) : 0;
  const isVat = data.taxType === "vat";

  const invoiceCount = data.invoices?.length ?? 0;
  const invoiceTotal = (data.invoices ?? []).reduce((sum, inv) => sum + Number(inv.amount), 0);
  const collectionTotal = (data.collections ?? []).reduce((sum, c) => sum + Number(c.amount), 0);
  const invoiceCollectionRate = invoiceTotal > 0
    ? Math.round((collectionTotal / invoiceTotal) * 100)
    : 0;

  const expenseCount = (data.expenses?.length ?? 0) + (data.partnerPayments?.length ?? 0);
  const expenseTotal =
    (data.expenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0) +
    (data.partnerPayments ?? []).reduce((sum, pp) => sum + Number(pp.amount), 0);

  const partnerCount = data.projectPartners?.length ?? 0;
  const partnerNames = (data.projectPartners ?? [])
    .map((pp) => pp.partner.name)
    .slice(0, 3);

  const cards: {
    type: PanelType;
    icon: React.ReactNode;
    title: string;
    detail: string;
    show: boolean;
  }[] = [
    {
      type: "invoice",
      icon: <FileText className="size-4" />,
      title: "세금계산서",
      detail: invoiceCount > 0
        ? `${invoiceCount}건 / ${formatCurrency(invoiceTotal)}원 (${invoiceCollectionRate}%)`
        : "발행 내역 없음",
      show: isVat && contractAmount > 0,
    },
    {
      type: "financial",
      icon: <ArrowLeftRight className="size-4" />,
      title: "거래 내역",
      detail: expenseCount > 0
        ? `${expenseCount}건 / 지출 ${formatCurrency(expenseTotal)}원`
        : "거래 내역 없음",
      show: true,
    },
    {
      type: "partner",
      icon: <Users className="size-4" />,
      title: "파트너",
      detail: partnerCount > 0
        ? `${partnerCount}명 (${partnerNames.join(", ")}${partnerCount > 3 ? " ..." : ""})`
        : "배치된 파트너 없음",
      show: true,
    },
    {
      type: "estimate",
      icon: <FileSpreadsheet className="size-4" />,
      title: "견적서",
      detail: data.estimateNumber ?? "연결된 견적서 없음",
      show: !!data.estimateNumber,
    },
    {
      type: "file",
      icon: <FolderOpen className="size-4" />,
      title: "파일",
      detail: "파일 관리",
      show: true,
    },
  ];

  const visibleCards = cards.filter((c) => c.show);

  return (
    <div className="flex flex-col gap-1.5">
      {visibleCards.map((card) => (
        <button
          key={card.type}
          type="button"
          onClick={() => onSelect(card.type)}
          className={cn(
            "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
            activePanel === card.type
              ? "border-primary bg-primary/5"
              : "hover:border-border-dark/50 hover:bg-muted/30"
          )}
        >
          <span className={cn(
            "shrink-0",
            activePanel === card.type ? "text-primary" : "text-muted-foreground"
          )}>
            {card.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{card.title}</p>
            <p className="text-xs text-muted-foreground truncate">{card.detail}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
