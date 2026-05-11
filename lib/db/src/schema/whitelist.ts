import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const whitelistedUsersTable = pgTable("whitelisted_users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  addedBy: text("added_by"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WhitelistedUser = typeof whitelistedUsersTable.$inferSelect;
export type InsertWhitelistedUser = typeof whitelistedUsersTable.$inferInsert;
