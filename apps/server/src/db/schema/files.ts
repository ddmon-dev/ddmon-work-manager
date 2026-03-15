import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  s3Key: text("s3_key"),
  mimeType: text("mime_type"),
  size: integer("size"),
  folderId: uuid("folder_id").references((): any => files.id, {
    onDelete: "restrict",
  }),
  isFolder: boolean("is_folder").notNull().default(false),
  author: text("author"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  isFavorited: boolean("is_favorited").notNull().default(false),
  favoriteOrder: integer("favorite_order"),
  deleted: boolean("deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  ownerType: text("owner_type").notNull().default("drive"),
  ownerId: uuid("owner_id"),
}, (table) => [
  index("idx_files_owner").on(table.ownerType, table.ownerId).where(sql`deleted = false`),
]);
