import { formatCurrency } from "@/shared/utils/format";
import { calculateGroupSubtotal } from "@packages/utils";
import type { EstimateGroupDTO } from "../types";

export function ItemGroups({ groups }: { groups: EstimateGroupDTO[] }) {
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.id} className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">{group.name}</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-xs text-muted-foreground/70">항목명</th>
                <th className="text-right py-2 text-xs text-muted-foreground/70 w-20">수량</th>
                <th className="text-center py-2 text-xs text-muted-foreground/70 w-16">단위</th>
                <th className="text-right py-2 text-xs text-muted-foreground/70 w-28">금액</th>
              </tr>
            </thead>
            <tbody>
              {group.items.map((item) => (
                <tr key={item.id} className="border-b border-dashed last:border-0">
                  <td className="py-2 whitespace-pre-line">{item.name}</td>
                  <td className="text-right py-2 tabular-nums">{Number(item.quantity)}</td>
                  <td className="text-center py-2">{item.unit}</td>
                  <td className="text-right py-2 tabular-nums font-medium">
                    {formatCurrency(Number(item.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end gap-2 text-sm bg-muted/30 px-4 py-2 -mx-4">
            <span className="text-muted-foreground">소계</span>
            <span className="font-medium tabular-nums">
              {formatCurrency(
                calculateGroupSubtotal(group.items.map((i) => ({ amount: Number(i.amount) })))
              )}
              원
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
