import { cn } from "@/shared/utils/classnames";
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

  const cards: {
    type: PanelType;
    icon: React.ReactNode;
    label: string;
    show: boolean;
  }[] = [
    {
      type: "invoice",
      icon: <FileText className="size-3.5" />,
      label: "세금계산서",
      show: isVat && contractAmount > 0,
    },
    {
      type: "financial",
      icon: <ArrowLeftRight className="size-3.5" />,
      label: "거래 내역",
      show: true,
    },
    {
      type: "partner",
      icon: <Users className="size-3.5" />,
      label: "파트너",
      show: true,
    },
    {
      type: "estimate",
      icon: <FileSpreadsheet className="size-3.5" />,
      label: "견적서",
      show: !!data.estimateNumber,
    },
    {
      type: "file",
      icon: <FolderOpen className="size-3.5" />,
      label: "파일",
      show: true,
    },
  ];

  const visibleCards = cards.filter((c) => c.show);

  return (
    <div className="flex items-center gap-1">
      {visibleCards.map((card) => {
        const isActive = activePanel === card.type;
        return (
          <button
            key={card.type}
            type="button"
            onClick={() => onSelect(card.type)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {card.icon}
            {card.label}
          </button>
        );
      })}
    </div>
  );
}
