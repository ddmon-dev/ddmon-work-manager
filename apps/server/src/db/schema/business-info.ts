import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const businessInfo = pgTable("business_info", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),         // 상호명
  ceo: text("ceo"),           // 대표자명
  bizNumber: text("biz_number"), // 사업자번호
  address: text("address"),   // 주소
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
