import { sql } from "drizzle-orm";
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
  index,
  check,
  jsonb,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { clients } from "./clients";

// 견적서 계열 (estimate_number 단위 상태 관리)
export const estimateSeries = pgTable(
  "estimate_series",
  {
    estimateNumber: text("estimate_number").primaryKey(),
    status: text("status").notNull().default("pending"), // pending, contracted, expired
    finalEstimateId: uuid("final_estimate_id").references(
      (): AnyPgColumn => estimates.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "check_final_consistency",
      sql`(${t.status} = 'contracted') = (${t.finalEstimateId} IS NOT NULL)`
    ),
  ]
);

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
    validUntil: date("valid_until"),
    // withholding(원천징수), vat(부가세 10%)
    taxType: text("tax_type").notNull().default("vat"),
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deleted: boolean("deleted").notNull().default(false),
    publisherInfo: jsonb("publisher_info"),
  },
  (t) => [
    unique().on(t.estimateNumber, t.version),
    index("idx_estimates_client_id").on(t.clientId),
    index("idx_estimates_estimate_number").on(t.estimateNumber),
    index("idx_estimates_issued_date").on(t.issuedDate),
    index("idx_estimates_deleted").on(t.deleted),
  ]
);

export const estimateItemGroups = pgTable(
  "estimate_item_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    estimateId: uuid("estimate_id")
      .notNull()
      .references(() => estimates.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_estimate_item_groups_estimate_id").on(t.estimateId)]
);

export const estimateItems = pgTable(
  "estimate_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => estimateItemGroups.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
    unit: text("unit").default(""),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_estimate_items_group_id").on(t.groupId)]
);
