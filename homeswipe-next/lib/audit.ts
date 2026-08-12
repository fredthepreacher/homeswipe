import { dbAdmin } from "./db";
import { auditLogsTable } from "./schema";

export async function logAction(params: {
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: number | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
}) {
  try {
    await dbAdmin.insert(auditLogsTable).values({
      userId: params.userId ?? null,
      userName: params.userName ?? null,
      userRole: params.userRole ?? null,
      action: params.action,
      entityType: params.entityType ?? null,
      entityId: params.entityId ?? null,
      details: params.details ? JSON.stringify(params.details) : null,
      ipAddress: params.ipAddress ?? null,
    });
  } catch {
    // never let audit logging break request flow
  }
}
