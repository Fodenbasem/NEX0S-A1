import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const aiRequestsTable = pgTable("ai_requests", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id"),
  userId: text("user_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  model: text("model"),
  tokensIn: integer("tokens_in"),
  tokensOut: integer("tokens_out"),
  latencyMs: integer("latency_ms"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAiRequestSchema = createInsertSchema(aiRequestsTable).omit({ id: true, createdAt: true });
export type InsertAiRequest = z.infer<typeof insertAiRequestSchema>;
export type AiRequest = typeof aiRequestsTable.$inferSelect;
