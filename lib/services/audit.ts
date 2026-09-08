import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import type { AuditEvent, User } from "@/lib/types";

interface AuditRow {
  id: string;
  entity_type: AuditEvent["entityType"];
  entity_id: string;
  action: string;
  reason: string;
  actor_id: string;
  actor_name: string;
  actor_role: AuditEvent["actorRole"];
  created_at: string;
}

function toAuditEvent(row: AuditRow): AuditEvent {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    reason: row.reason,
    actorId: row.actor_id,
    actorName: row.actor_name,
    actorRole: row.actor_role,
    createdAt: row.created_at,
  };
}

/**
 * Shared audit trail used by every workflow in the console. Any state-changing
 * business action is expected to record one event here.
 */
export function recordAuditEvent(input: {
  entityType: AuditEvent["entityType"];
  entityId: string;
  action: string;
  reason: string;
  actor: User;
}): AuditEvent {
  const event: AuditEvent = {
    id: `ae_${randomUUID()}`,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    reason: input.reason,
    actorId: input.actor.id,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    createdAt: new Date().toISOString(),
  };
  getDb()
    .prepare(
      `INSERT INTO audit_events (id, entity_type, entity_id, action, reason, actor_id, actor_name, actor_role, created_at)
       VALUES (@id, @entityType, @entityId, @action, @reason, @actorId, @actorName, @actorRole, @createdAt)`,
    )
    .run(event);
  return event;
}

export function listAuditEvents(filter?: {
  entityType?: AuditEvent["entityType"];
  entityId?: string;
  limit?: number;
}): AuditEvent[] {
  const clauses: string[] = [];
  const params: Record<string, unknown> = { limit: filter?.limit ?? 200 };
  if (filter?.entityType) {
    clauses.push("entity_type = @entityType");
    params.entityType = filter.entityType;
  }
  if (filter?.entityId) {
    clauses.push("entity_id = @entityId");
    params.entityId = filter.entityId;
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = getDb()
    .prepare(`SELECT * FROM audit_events ${where} ORDER BY created_at DESC, rowid DESC LIMIT @limit`)
    .all(params) as AuditRow[];
  return rows.map(toAuditEvent);
}
