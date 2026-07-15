import { like, desc } from "drizzle-orm";
import type { db } from "../db";
import { estimateSeries } from "../db/schema/estimates";
import { projects } from "../db/schema/projects";

/** db.transaction 콜백이 받는 트랜잭션 객체 타입 */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * EST-YYYY-NNN 형식 견적서 번호 생성
 *
 * MAX+1 방식이라 동시 트랜잭션에서는 중복 번호가 나올 수 있고,
 * 그 경우 estimate_number PK 제약이 최종 방어선이 된다 (단일 사용자 운영 전제).
 */
export async function generateEstimateNumber(tx: Tx): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `EST-${year}-`;

  const rows = await tx
    .select({ estimateNumber: estimateSeries.estimateNumber })
    .from(estimateSeries)
    .where(like(estimateSeries.estimateNumber, `${prefix}%`))
    .orderBy(desc(estimateSeries.estimateNumber))
    .limit(1);

  let nextNum = 1;
  if (rows.length > 0) {
    const lastNum = parseInt(rows[0].estimateNumber.slice(prefix.length), 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `${prefix}${String(nextNum).padStart(3, "0")}`;
}

/**
 * PRJ-YYYY-NNN 형식 프로젝트 번호 생성
 *
 * MAX+1 방식이라 동시 트랜잭션에서는 중복 번호가 나올 수 있고,
 * 그 경우 project_number unique 제약이 최종 방어선이 된다 (단일 사용자 운영 전제).
 */
export async function generateProjectNumber(tx: Tx): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PRJ-${year}-`;

  const rows = await tx
    .select({ projectNumber: projects.projectNumber })
    .from(projects)
    .where(like(projects.projectNumber, `${prefix}%`))
    .orderBy(desc(projects.projectNumber))
    .limit(1);

  let nextNum = 1;
  if (rows.length > 0 && rows[0].projectNumber) {
    const lastNum = parseInt(rows[0].projectNumber.slice(prefix.length), 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `${prefix}${String(nextNum).padStart(3, "0")}`;
}
