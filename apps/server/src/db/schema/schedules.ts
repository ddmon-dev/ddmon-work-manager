import { pgTable, uuid, text, timestamp, date, integer } from "drizzle-orm/pg-core";

export const schedules = pgTable("schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  startTime: text("start_time"), // HH:mm, null이면 종일
  endTime: text("end_time"),
  color: text("color").notNull().default("default"),
  sortOrder: integer("sort_order").notNull().default(0),
  recurrenceType: text("recurrence_type").notNull().default("none"), // none, daily, weekly, monthly
  recurrenceEndDate: date("recurrence_end_date"),
  author: text("author"),
  updatedBy: text("updated_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
