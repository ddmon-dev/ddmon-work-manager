import { pgTable, uuid, text, timestamp, date, integer } from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const projectScheduleLanes = pgTable("project_schedule_lanes", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectSchedules = pgTable("project_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  laneId: uuid("lane_id")
    .notNull()
    .references(() => projectScheduleLanes.id, { onDelete: "cascade" }),
  category: text("category").notNull().default("development"),
  categoryColor: text("category_color"),
  title: text("title"),
  description: text("description"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  sortOrder: integer("sort_order").notNull().default(0),
  author: text("author"),
  updatedBy: text("updated_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
