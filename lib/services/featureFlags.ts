import { getDb } from "@/lib/db";
import { requirePermission } from "@/lib/auth/permissions";
import { recordAuditEvent } from "./audit";
import { NotFoundError, ValidationError } from "./errors";
import type { FeatureFlag, FeatureFlagStatus, FlagEnvironment, ListQuery, User } from "@/lib/types";

interface FeatureFlagRow {
  id: string;
  flag_key: string;
  environment: FlagEnvironment;
  owner_id: string;
  owner_name: string;
  status: FeatureFlagStatus;
  rollout_percentage: number;
  scheduled_for: string | null;
  last_changed_at: string;
  last_changed_by_name: string;
}

const SELECT = `
  SELECT f.*, u.name AS owner_name
  FROM feature_flags f JOIN users u ON u.id = f.owner_id
`;

function toFlag(row: FeatureFlagRow): FeatureFlag {
  return {
    id: row.id,
    flagKey: row.flag_key,
    environment: row.environment,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    status: row.status,
    rolloutPercentage: row.rollout_percentage,
    scheduledFor: row.scheduled_for,
    lastChangedAt: row.last_changed_at,
    lastChangedByName: row.last_changed_by_name,
  };
}

export function listFeatureFlags(actor: User, query: ListQuery = {}): FeatureFlag[] {
  requirePermission(actor, "flags.view");
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};
  if (query.search) {
    clauses.push("(f.flag_key LIKE @search OR f.id LIKE @search OR u.name LIKE @search)");
    params.search = `%${query.search}%`;
  }
  if (query.status && query.status !== "ALL") {
    clauses.push("f.status = @status");
    params.status = query.status;
  }
  if (query.environment && query.environment !== "ALL") {
    clauses.push("f.environment = @environment");
    params.environment = query.environment;
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = getDb()
    .prepare(`${SELECT} ${where} ORDER BY f.last_changed_at DESC`)
    .all(params) as FeatureFlagRow[];
  return rows.map(toFlag);
}

export function getFeatureFlag(actor: User, id: string): FeatureFlag {
  requirePermission(actor, "flags.view");
  const row = getDb().prepare(`${SELECT} WHERE f.id = @id`).get({ id }) as FeatureFlagRow | undefined;
  if (!row) throw new NotFoundError(`Unknown feature flag: ${id}`);
  return toFlag(row);
}

export type FeatureFlagAction = "ENABLE" | "DISABLE" | "SCHEDULE" | "REQUEST_CHANGE";

export function applyFeatureFlagAction(
  actor: User,
  flagId: string,
  input: {
    action: FeatureFlagAction;
    reason: string;
    rolloutPercentage?: number;
    scheduledFor?: string;
  },
): FeatureFlag {
  const reason = input.reason?.trim() ?? "";
  if (reason.length < 5) throw new ValidationError("A reason of at least 5 characters is required");

  const current = getFeatureFlag(actor, flagId);

  if (input.action === "REQUEST_CHANGE") {
    requirePermission(actor, "flags.request_change");
    recordAuditEvent({
      entityType: "FEATURE_FLAG",
      entityId: flagId,
      action: "REQUEST_CHANGE",
      reason: `${reason} (requested from ${current.ownerName})`,
      actor,
    });
    return current;
  }

  requirePermission(actor, "flags.change");
  if (current.environment === "PRODUCTION") requirePermission(actor, "flags.change_production");

  const rollout = input.action === "DISABLE" ? 0 : (input.rolloutPercentage ?? current.rolloutPercentage);
  if (!Number.isInteger(rollout) || rollout < 0 || rollout > 100) {
    throw new ValidationError("Rollout percentage must be a whole number between 0 and 100");
  }

  let scheduledFor: string | null = null;
  if (input.action === "SCHEDULE") {
    if (!input.scheduledFor) throw new ValidationError("A scheduled time is required");
    const when = new Date(input.scheduledFor);
    if (Number.isNaN(when.getTime())) throw new ValidationError("The scheduled time is not a valid date");
    if (when.getTime() <= Date.now()) throw new ValidationError("The scheduled time must be in the future");
    scheduledFor = when.toISOString();
  }

  const status: FeatureFlagStatus =
    input.action === "ENABLE" ? "ON" : input.action === "DISABLE" ? "OFF" : "SCHEDULED";
  if (input.action !== "SCHEDULE" && current.status === status) {
    throw new ValidationError(`Flag ${current.flagKey} is already ${status.toLowerCase()}`);
  }

  getDb()
    .prepare(
      `UPDATE feature_flags
       SET status = @status, rollout_percentage = @rollout, scheduled_for = @scheduledFor,
           last_changed_at = @lastChangedAt, last_changed_by_name = @lastChangedByName
       WHERE id = @id`,
    )
    .run({
      id: flagId,
      status,
      rollout,
      scheduledFor,
      lastChangedAt: new Date().toISOString(),
      lastChangedByName: actor.name,
    });

  const detail =
    input.action === "SCHEDULE"
      ? `scheduled for ${scheduledFor} at ${rollout}% rollout`
      : `${status.toLowerCase()} at ${rollout}% rollout`;
  recordAuditEvent({
    entityType: "FEATURE_FLAG",
    entityId: flagId,
    action: input.action,
    reason: `${reason} (${detail})`,
    actor,
  });
  return getFeatureFlag(actor, flagId);
}
