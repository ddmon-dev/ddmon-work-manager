import { pgTable, uuid, text, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { clients } from "./clients";
import { projects } from "./projects";

export const schedules = pgTable("schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  startTime: text("start_time"), // HH:mm, null이면 종일
  endTime: text("end_time"),
  location: text("location"),
  color: text("color").notNull().default("default"),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
  recurrenceType: text("recurrence_type").notNull().default("none"), // none, daily, weekly, monthly
  recurrenceEndDate: date("recurrence_end_date"),
  author: text("author"),
  updatedBy: text("updated_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deleted: boolean("deleted").notNull().default(false),
});
