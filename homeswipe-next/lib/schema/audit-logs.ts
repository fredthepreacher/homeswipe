import { pgTable, text, serial, integer, timestamp, index } from "drizzle-orm/pg-core";

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  userName: text("user_name"),
  userRole: text("user_role"),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  details: text("details"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  // The admin log is ordered by recency, and the stats endpoint counts
  // today's entries — both scan this column on the fastest-growing table.
  createdAtIdx: index("audit_logs_created_at_idx").on(t.createdAt),
}));

export type AuditLog = typeof auditLogsTable.$inferSelect;
