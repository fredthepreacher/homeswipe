import { db } from "@workspace/db";
import { auditLogsTable } from "@workspace/db";

export async function logAction(params: {
  userId?: number | null;
  userName?: string | null;
  userRole?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: number | null;
  details?: Record<string, any> | null;
  ipAddress?: string | null;
}) {
  try {
    await db.insert(auditLogsTable).values({
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
