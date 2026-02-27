import { eq, ilike, or } from "drizzle-orm";
import type { AnyColumn, SQL } from "drizzle-orm";

/** 소프트 삭제 필터 */
export function softDeleteFilter(column: AnyColumn): SQL {
  return eq(column, false);
}

/** 다중 컬럼 ILIKE 검색 필터 */
export function searchFilter(fields: AnyColumn[], term: string): SQL | undefined {
  if (!fields.length) return undefined;
  const pattern = `%${term}%`;
  return or(...fields.map((f) => ilike(f, pattern)));
}
