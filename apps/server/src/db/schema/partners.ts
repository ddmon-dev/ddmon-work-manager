import { pgTable, uuid, text, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const partners = pgTable("partners", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  residentNumber: text("resident_number"),
  bankName: text("bank_name"),
  bankAccount: text("bank_account"),
  accountHolder: text("account_holder"),
  specialties: text("specialties").array(),
  notes: text("notes"),
  author: text("author"),
  updatedBy: text("updated_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deleted: boolean("deleted").notNull().default(false),
});

export const partnerMemos = pgTable("partner_memos", {
  id: uuid("id").primaryKey().defaultRandom(),
  parentId: uuid("parent_id")
    .notNull()
    .references(() => partners.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  author: text("author"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deleted: boolean("deleted").notNull().default(false),
});

export const projectPartners = pgTable("project_partners", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  partnerId: uuid("partner_id")
    .notNull()
    .references(() => partners.id, { onDelete: "restrict" }),
  roles: text("roles").array(),
  amount: numeric("amount"),
  taxType: text("tax_type").notNull().default("withholding"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
