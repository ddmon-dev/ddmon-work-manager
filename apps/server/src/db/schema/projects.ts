import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  date,
  numeric,
  integer,
} from "drizzle-orm/pg-core";
import { clients } from "./clients";
import { estimateSeries } from "./estimates";
import { partners } from "./partners";

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "restrict" }),
  // 독립 엔티티: 견적서 없이도 프로젝트 생성 가능 (nullable)
  estimateNumber: text("estimate_number").references(
    () => estimateSeries.estimateNumber,
    { onDelete: "set null" }
  ),
  // 프로젝트 번호는 앱 레이어에서 생성 (Phase 3에서 트리거 또는 앱 로직 처리)
  projectNumber: text("project_number").unique(),
  name: text("name").notNull(),
  status: text("status").notNull().default("pending"), // pending, active, settling, completed, discarded
  workPhase: text("work_phase").notNull().default("preparing"), // preparing, working, reviewing, delivered
  contractDate: date("contract_date").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  completedDate: date("completed_date"),
  deliveredDate: date("delivered_date"),
  description: text("description"),
  notes: text("notes"),
  // 프로젝트 자체 계약 금액 (견적서와 독립)
  contractAmount: numeric("contract_amount", { precision: 15, scale: 2 }),
  // withholding(원천징수), vat(부가세 10%)
  taxType: text("tax_type"),
  author: text("author"),
  updatedBy: text("updated_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deleted: boolean("deleted").notNull().default(false),
});

export const projectInvoices = pgTable("project_invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  paymentType: text("payment_type").notNull().default("deposit"), // deposit, interim, balance, additional
  description: text("description").notNull().default(""),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull().default("0"),
  issueDate: date("issue_date").notNull(),
  deleted: boolean("deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectCollections = pgTable("project_collections", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  invoiceId: uuid("invoice_id")
    .references(() => projectInvoices.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull().default("0"),
  paidDate: date("paid_date").notNull(),
  paymentType: text("payment_type").notNull().default("deposit"), // deposit, interim, balance, additional
  description: text("description").notNull().default(""),
  deleted: boolean("deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectExpenses = pgTable("project_expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull().default("0"),
  expenseDate: date("expense_date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deleted: boolean("deleted").notNull().default(false),
});

export const partnerPayments = pgTable("partner_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  partnerId: uuid("partner_id")
    .notNull()
    .references(() => partners.id, { onDelete: "restrict" }),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull().default("0"),
  paidDate: date("paid_date").notNull(),
  taxType: text("tax_type").notNull().default("withholding"), // withholding, vat
  withholdingReported: boolean("withholding_reported").notNull().default(false),
  withholdingReportedDate: date("withholding_reported_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deleted: boolean("deleted").notNull().default(false),
});

export const projectMemos = pgTable("project_memos", {
  id: uuid("id").primaryKey().defaultRandom(),
  parentId: uuid("parent_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  author: text("author"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deleted: boolean("deleted").notNull().default(false),
});
