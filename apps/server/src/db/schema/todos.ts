import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  date,
  integer,
  unique,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const todos = pgTable("todos", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  completed: boolean("completed").notNull().default(false),
  todoDate: date("todo_date").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  color: text("color").notNull().default("slate"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  // soft delete 없음 (기존 시스템에서 제거됨)
});

export const todoTimeBlocks = pgTable(
  "todo_time_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    todoId: uuid("todo_id")
      .notNull()
      .references(() => todos.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    blockDate: date("block_date").notNull(),
    startSlot: integer("start_slot").notNull(), // 0~47 (30분 단위)
    durationSlots: integer("duration_slots").notNull().default(2),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.todoId, t.blockDate)]
);
