import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const businessInfo = pgTable("business_info", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),         // 상호명
  nameEn: text("name_en"),   // 영문 상호명
  ceo: text("ceo"),           // 대표자명
  bizNumber: text("biz_number"), // 사업자번호
  address: text("address"),   // 주소
  bankName: text("bank_name"),         // 은행명
  bankAccount: text("bank_account"),   // 계좌번호
  accountHolder: text("account_holder"), // 예금주
  bizType: text("biz_type"),           // 업태
  bizItem: text("biz_item"),           // 종목
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
