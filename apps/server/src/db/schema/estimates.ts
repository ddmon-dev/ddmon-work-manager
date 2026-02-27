import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  date,
  numeric,
  integer,
  unique,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { clients } from "./clients";

// 견적서 계열 (estimate_number 단위 상태 관리)
export const estimateSeries = pgTable("estimate_series", {
  estimateNumber: text("estimate_number").primaryKey(),
  status: text("status").notNull().default("pending"), // pending, contracted, expired
  // 순환 참조 FK (finalEstimateId -> estimates.id)는 Phase 3에서 추가
  finalEstimateId: uuid("final_estimate_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const estimates = pgTable(
  "estimates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    estimateNumber: text("estimate_number")
      .notNull()
      .references(() => estimateSeries.estimateNumber),
    title: text("title").notNull(),
    description: text("description"),
    issuedDate: date("issued_date"),
    issuer: text("issuer"),
    validUntil: date("valid_until"),
    // VAT 전용: inclusive(포함), exclusive(별도)
    taxType: text("tax_type").notNull().default("exclusive"),
    discountType: text("discount_type").notNull().default("none"), // none, amount, percentage
    discountValue: numeric("discount_value", { precision: 12, scale: 2 }).default("0"),
    notes: text("notes"),
    memo: text("memo"),
    author: text("author").references(() => user.id, { onDelete: "set null" }),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
    version: integer("version").notNull().default(1),
    versionLabel: text("version_label"),
    totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).default("0"),
    discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).default("0"),
    showTaxAmount: boolean("show_tax_amount").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deleted: boolean("deleted").notNull().default(false),
  },
  (t) => [unique().on(t.estimateNumber, t.version)]
);

export const estimateItemGroups = pgTable("estimate_item_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  estimateId: uuid("estimate_id")
    .notNull()
    .references(() => estimates.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const estimateItems = pgTable("estimate_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => estimateItemGroups.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  unit: text("unit").default(""),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
