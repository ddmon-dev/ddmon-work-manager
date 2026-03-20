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
    badge?: string;
    detail: string;
    show: boolean;
  }[] = [
    {
      type: "invoice",
      icon: <FileText className="size-3.5" />,
      title: "세금계산서",
      badge: invoiceCount > 0 ? `${invoiceCount}건` : undefined,
      detail: invoiceCount > 0
        ? `${formatCurrency(invoiceTotal)}원 (수금 ${invoiceCollectionRate}%)`
        : "발행 내역 없음",
      show: isVat && contractAmount > 0,
    },
    {
      type: "financial",
      icon: <ArrowLeftRight className="size-3.5" />,
      title: "거래 내역",
      badge: expenseCount > 0 ? `${expenseCount}건` : undefined,
      detail: expenseCount > 0
        ? `지출 ${formatCurrency(expenseTotal)}원`
        : "거래 내역 없음",
      show: true,
    },
    {
      type: "partner",
      icon: <Users className="size-3.5" />,
      title: "파트너",
      badge: partnerCount > 0 ? `${partnerCount}명` : undefined,
      detail: partnerCount > 0
        ? partnerNames.join(", ") + (partnerCount > 3 ? " ..." : "")
        : "배치된 파트너 없음",
      show: true,
    },
    {
      type: "estimate",
      icon: <FileSpreadsheet className="size-3.5" />,
      title: "견적서",
      detail: data.estimateNumber ?? "",
      show: !!data.estimateNumber,
    },
    {
      type: "file",
      icon: <FolderOpen className="size-3.5" />,
      title: "파일",
      detail: "파일 관리",
      show: true,
    },
  ];

  const visibleCards = cards.filter((c) => c.show);

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {visibleCards.map((card) => {
        const isActive = activePanel === card.type;
        return (
          <button
            key={card.type}
            type="button"
            onClick={() => onSelect(card.type)}
            className={cn(
              "flex flex-col gap-1 rounded-lg border px-3 py-2.5 text-left transition-all",
              isActive
                ? "border-primary bg-primary/5 shadow-sm"
                : "bg-muted/20 hover:bg-muted/40"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className={cn("shrink-0", isActive ? "text-primary" : "text-muted-foreground")}>
                  {card.icon}
                </span>
                <span className="text-xs font-medium">{card.title}</span>
              </div>
              {card.badge && (
                <span className={cn(
                  "text-[10px] font-medium rounded-full px-1.5 py-0.5",
                  isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {card.badge}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{card.detail}</p>
          </button>
        );
      })}
    </div>
  );
}
