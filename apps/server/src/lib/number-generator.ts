import { like, desc } from "drizzle-orm";
import { estimateSeries } from "../db/schema/estimates";
import { projects } from "../db/schema/projects";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TxLike = any;

/**
 * EST-YYYY-NNN 형식 견적서 번호 생성
 * 트랜잭션 내에서 호출하여 동시성 문제 방지
 */
export async function generateEstimateNumber(tx: TxLike): Promise<string> {
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
 * 트랜잭션 내에서 호출하여 동시성 문제 방지
 */
export async function generateProjectNumber(tx: TxLike): Promise<string> {
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
