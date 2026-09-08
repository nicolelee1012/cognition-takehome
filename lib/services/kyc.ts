import { getDb } from "@/lib/db";
import { requirePermission } from "@/lib/auth/permissions";
import { recordAuditEvent } from "./audit";
import { NotFoundError, ValidationError } from "./errors";
import { getUser } from "./users";
import type { KycCase, KycDocument, KycStatus, ListQuery, RiskLevel, User } from "@/lib/types";

interface KycRow {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_country: string;
  account_opened_at: string;
  risk_level: RiskLevel;
  status: KycStatus;
  assigned_reviewer_id: string;
  reviewer_name: string;
  submitted_at: string;
  risk_flags: string;
  documents: string;
}

const SELECT = `
  SELECT c.*, u.name AS reviewer_name
  FROM kyc_cases c JOIN users u ON u.id = c.assigned_reviewer_id
`;

function toCase(row: KycRow): KycCase {
  return {
    id: row.id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerCountry: row.customer_country,
    accountOpenedAt: row.account_opened_at,
    riskLevel: row.risk_level,
    status: row.status,
    assignedReviewerId: row.assigned_reviewer_id,
    assignedReviewerName: row.reviewer_name,
    submittedAt: row.submitted_at,
    riskFlags: JSON.parse(row.risk_flags) as string[],
    documents: JSON.parse(row.documents) as KycDocument[],
  };
}

export function listKycCases(actor: User, query: ListQuery = {}): KycCase[] {
  requirePermission(actor, "kyc.view");
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};
  if (query.search) {
    clauses.push("(c.customer_name LIKE @search OR c.id LIKE @search OR u.name LIKE @search)");
    params.search = `%${query.search}%`;
  }
  if (query.status && query.status !== "ALL") {
    clauses.push("c.status = @status");
    params.status = query.status;
  }
  if (query.risk && query.risk !== "ALL") {
    clauses.push("c.risk_level = @risk");
    params.risk = query.risk;
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = getDb().prepare(`${SELECT} ${where} ORDER BY c.submitted_at DESC`).all(params) as KycRow[];
  return rows.map(toCase);
}

export function getKycCase(actor: User, id: string): KycCase {
  requirePermission(actor, "kyc.view");
  const row = getDb().prepare(`${SELECT} WHERE c.id = @id`).get({ id }) as KycRow | undefined;
  if (!row) throw new NotFoundError(`Unknown KYC case: ${id}`);
  return toCase(row);
}

export type KycAction = "APPROVE" | "REJECT" | "ESCALATE" | "REASSIGN";

const RESULTING_STATUS: Record<Exclude<KycAction, "REASSIGN">, KycStatus> = {
  APPROVE: "APPROVED",
  REJECT: "REJECTED",
  ESCALATE: "ESCALATED",
};

export function applyKycAction(
  actor: User,
  caseId: string,
  input: { action: KycAction; reason: string; assigneeId?: string },
): KycCase {
  const reason = input.reason?.trim() ?? "";
  if (reason.length < 5) throw new ValidationError("A reason of at least 5 characters is required");

  const current = getKycCase(actor, caseId);

  if (input.action === "REASSIGN") {
    requirePermission(actor, "kyc.reassign");
    if (!input.assigneeId) throw new ValidationError("An assignee is required");
    const assignee = getUser(input.assigneeId);
    getDb().prepare("UPDATE kyc_cases SET assigned_reviewer_id = ? WHERE id = ?").run(assignee.id, caseId);
    recordAuditEvent({
      entityType: "KYC_CASE",
      entityId: caseId,
      action: "REASSIGN",
      reason: `${reason} (reassigned to ${assignee.name})`,
      actor,
    });
    return getKycCase(actor, caseId);
  }

  requirePermission(actor, "kyc.review");
  if (current.status === "ESCALATED") requirePermission(actor, "kyc.resolve_escalated");
  if (current.status === "APPROVED" || current.status === "REJECTED") {
    throw new ValidationError(`Case ${caseId} is already ${current.status.toLowerCase()}`);
  }
  if (input.action === "APPROVE" && current.riskLevel === "HIGH") {
    requirePermission(actor, "kyc.approve_high_risk");
  }
  if (input.action === "ESCALATE" && current.status === "ESCALATED") {
    throw new ValidationError("Case is already escalated");
  }

  getDb().prepare("UPDATE kyc_cases SET status = ? WHERE id = ?").run(RESULTING_STATUS[input.action], caseId);
  recordAuditEvent({ entityType: "KYC_CASE", entityId: caseId, action: input.action, reason, actor });
  return getKycCase(actor, caseId);
}
