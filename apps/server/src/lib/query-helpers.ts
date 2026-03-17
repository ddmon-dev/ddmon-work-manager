import { eq, ilike, or } from "drizzle-orm";
import type { AnyColumn, SQL } from "drizzle-orm";
import { z } from "zod";

/** 세금타입별 기대 수금액 (VAT: 공급가액, 원천징수: 실수령액) */
export function getExpectedReceivable(amount: number, taxType: string | null): number {
  if (taxType === "withholding") return amount - Math.round(amount * 0.033);
  return amount;
}

/** 소프트 삭제 필터 */
export function softDeleteFilter(column: AnyColumn): SQL {
  return eq(column, false);
}

/** 소프트 삭제 payload */
export function softDeletePayload() {
  return { deleted: true, updatedAt: new Date() } as const;
}

/** 다중 컬럼 ILIKE 검색 필터 */
export function searchFilter(fields: AnyColumn[], term: string): SQL | undefined {
  if (!fields.length) return undefined;
  const pattern = `%${term}%`;
  return or(...fields.map((f) => ilike(f, pattern)));
}

/** 순서 변경 스키마 */
export const reorderSchema = z.object({
  items: z.array(z.object({ id: z.string().uuid(), sortOrder: z.number().int() })),
});

/** 순서 변경 일괄 실행 */
export async function executeReorder(
  items: z.infer<typeof reorderSchema>["items"],
  updateFn: (id: string, sortOrder: number) => Promise<unknown>
) {
  await Promise.all(items.map(({ id, sortOrder }) => updateFn(id, sortOrder)));
  return { updated: items.length };
}
