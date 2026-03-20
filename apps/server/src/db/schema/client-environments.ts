import { pgTable, uuid, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { clients } from "./clients";

export const clientEnvironments = pgTable("client_environments", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  hosting: jsonb("hosting"),
  domain: jsonb("domain"),
  ftp: jsonb("ftp"),
  customFields: jsonb("custom_fields"),
  notes: text("notes"),
  author: text("author"),
  updatedBy: text("updated_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deleted: boolean("deleted").notNull().default(false),
});

export const clientEnvironmentMemos = pgTable("client_environment_memos", {
  id: uuid("id").primaryKey().defaultRandom(),
  parentId: uuid("parent_id")
    .notNull()
    .references(() => clientEnvironments.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  author: text("author"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deleted: boolean("deleted").notNull().default(false),
});
