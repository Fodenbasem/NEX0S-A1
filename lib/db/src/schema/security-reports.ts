import { pgTable, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const securityReportsTable = pgTable("security_reports", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id"),
  userId: text("user_id").notNull(),
  compositeScore: integer("composite_score").notNull().default(0),
  owaspScores: jsonb("owasp_scores"),
  findings: jsonb("findings"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSecurityReportSchema = createInsertSchema(securityReportsTable).omit({ id: true, createdAt: true });
export type InsertSecurityReport = z.infer<typeof insertSecurityReportSchema>;
export type SecurityReport = typeof securityReportsTable.$inferSelect;
