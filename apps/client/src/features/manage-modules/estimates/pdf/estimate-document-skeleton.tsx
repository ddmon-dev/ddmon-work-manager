import { useId } from "react";
import { calculateTotal, buildPriceSummaryDisplay } from "@packages/utils";
import { A4_PAGE } from "@/shared/ui/pdf-preview-layout";
import type { EstimateDocumentData } from "./document-data";

const PAGE_MARGIN = 42;
const CONTENT_WIDTH = A4_PAGE.width - PAGE_MARGIN * 2;
const GROUP_WIDTH = 100;
const COLUMNS = [GROUP_WIDTH, CONTENT_WIDTH - GROUP_WIDTH - 34 - 44 - 72 - 10, 34, 44, 72];

function Bar({ x, y, width, height = 6 }: { x: number; y: number; width: number; height?: number }) {
  return <rect data-slot="skeleton" x={x} y={y} width={width} height={height} rx={1} fill="#e4e4e7" />;
}

function Rule({ y, x = PAGE_MARGIN, width = CONTENT_WIDTH, strong = false }: { y: number; x?: number; width?: number; strong?: boolean }) {
  return <line x1={x} x2={x + width} y1={y} y2={y} stroke={strong ? "#a1a1aa" : "#e4e4e7"} strokeWidth={strong ? 1.2 : 0.5} />;
}

/** estimate-document.tsx의 A4 좌표·여백·표 열과 문서별 항목 수를 따른다. */
export function EstimateDocumentSkeleton({ data }: { data?: EstimateDocumentData }) {
  const clipId = useId();
  const groups = data?.groups ?? [{ name: "", items: Array.from({ length: 5 }, () => ({ name: "", quantity: 1, unit: "", amount: 0 })) }];
  const metaRows = Math.max(data ? (data.clientName ? 2 : 1) : 2, data ? Number(!!data.issuer) + Number(!!data.validUntil) : 2);
  const descriptionHeight = data?.description ? 12 : 0;
  const tableY = 91 + metaRows * 13.7 + descriptionHeight + 18;
  let cursor = tableY + 17.8;
  const layout = [];
  for (const group of groups) {
    const y = cursor;
    const itemRows = [];
    for (const item of group.items) {
      const units = [...item.name].reduce((sum, char) => sum + ((char.codePointAt(0) ?? 0) > 127 ? 1 : 0.5), 0);
      const lines = Math.max(1, Math.ceil(units * 7.5 / (COLUMNS[1] - 8)));
      const height = 10.5 + lines * 11.25 + 0.5;
      itemRows.push({ y: cursor, height });
      cursor += height;
    }
    layout.push({ group, y, height: cursor - y, itemRows });
    cursor += 16.5;
  }
  const totals = data ? calculateTotal(data.groups, data.taxType, data.discountType, data.discountValue) : null;
  const summary = data && totals ? buildPriceSummaryDisplay(totals, data.taxType, data.showTaxAmount) : null;
  const summaryRows = summary ? (summary.hasDiscount ? 2 : 0) + (summary.showTaxRows ? 2 : 0) : 2;
  const summaryY = cursor + 20;
  const totalY = summaryY + summaryRows * 14 + (summaryRows ? 12.7 : 0);
  const notesY = totalY + 13.2 + 7.2 + 18 + 12;
  const notes = data ? data.notes?.split("\n").filter((line) => line.trim()) ?? [] : ["", "", ""];

  return (
    <svg aria-hidden="true" viewBox={`0 0 ${A4_PAGE.width} ${A4_PAGE.height}`} className="block size-full">
      <defs><clipPath id={clipId}><rect x={PAGE_MARGIN} y={82} width={CONTENT_WIDTH} height={700} /></clipPath></defs>
      <g className="motion-safe:animate-pulse">
        <Bar x={42} y={46} width={48} height={16} />
        <Bar x={A4_PAGE.width - 105} y={46} width={63} />
        <Bar x={A4_PAGE.width - 91} y={57} width={49} height={5} />
      </g>
      <Rule y={75} strong />
      <g clipPath={`url(#${clipId})`}>
        <g className="motion-safe:animate-pulse">
          {Array.from({ length: metaRows }, (_, row) => (
            <g key={row}>
              <Bar x={42} y={94 + row * 13.7} width={22} height={5} />
              <Bar x={86} y={93 + row * 13.7} width={row ? 168 : 96} height={7} />
              <Bar x={42 + (CONTENT_WIDTH + 18) / 2} y={94 + row * 13.7} width={28} height={5} />
              <Bar x={86 + (CONTENT_WIDTH + 18) / 2} y={93 + row * 13.7} width={62} height={6} />
            </g>
          ))}
          {descriptionHeight > 0 && <Bar x={86} y={94 + metaRows * 13.7} width={140} height={5} />}
        </g>
        <rect x={42} y={tableY} width={CONTENT_WIDTH} height={17.8} fill="#f4f4f5" />
        <Rule y={tableY + 17.8} />
        {COLUMNS.map((width, i) => (
          <Bar key={i} x={47 + COLUMNS.slice(0, i).reduce((a, b) => a + b, 0) + (i > 1 ? width - 18 : 0)} y={tableY + 6} width={18} height={5} />
        ))}
        {layout.map(({ group, y, height, itemRows }, groupIndex) => {
          return (
            <g key={groupIndex}>
              <Bar x={47} y={y + 7} width={42} />
              {group.items.map((_, i) => {
                const { y: rowY, height: rowHeight } = itemRows[i];
                return (
                  <g key={i}>
                    <Bar x={147} y={rowY + 7} width={i % 2 ? 86 : 106} />
                    <Bar x={A4_PAGE.width - 179} y={rowY + 7} width={8} />
                    <Bar x={A4_PAGE.width - 151} y={rowY + 7} width={10} />
                    <Bar x={A4_PAGE.width - 98} y={rowY + 7} width={51} />
                    {i < group.items.length - 1 && <Rule x={147} y={rowY + rowHeight} width={CONTENT_WIDTH - 105} />}
                  </g>
                );
              })}
              <rect x={42} y={y + height} width={CONTENT_WIDTH} height={16.5} fill="#f4f4f5" />
              <Bar x={A4_PAGE.width - 151} y={y + height + 5} width={15} height={5} />
              <Bar x={A4_PAGE.width - 98} y={y + height + 5} width={51} />
              <Rule y={y + height + 16.5} />
            </g>
          );
        })}
        {Array.from({ length: summaryRows }, (_, i) => (
          <g key={i}><Bar x={A4_PAGE.width - 207} y={summaryY + i * 14 + 3} width={28} height={5} /><Bar x={A4_PAGE.width - 98} y={summaryY + i * 14 + 3} width={56} /></g>
        ))}
        {summaryRows > 0 && <Rule x={A4_PAGE.width - 207} y={totalY - 6} width={165} />}
        <Bar x={A4_PAGE.width - 207} y={totalY + 2} width={62} height={7} />
        <Bar x={A4_PAGE.width - 113} y={totalY} width={71} height={10} />
        <Rule x={A4_PAGE.width - 207} y={totalY + 20.4} width={165} strong />
        {notes.length > 0 && (
          <g>
            <Rule y={notesY} />
            <Bar x={42} y={notesY + 15} width={20} height={5} />
            {notes.map((_, i) => <g key={i}><Bar x={42} y={notesY + 29 + i * 14} width={3} height={3} /><Bar x={50} y={notesY + 28 + i * 14} width={i % 2 ? 143 : 183} height={5} /></g>)}
          </g>
        )}
      </g>
      <Rule y={A4_PAGE.height - 46} />
      <Bar x={42} y={A4_PAGE.height - 39} width={157} height={5} />
      <Bar x={42} y={A4_PAGE.height - 30} width={183} height={5} />
      <Bar x={A4_PAGE.width - 58} y={A4_PAGE.height - 39} width={16} height={5} />
    </svg>
  );
}
