import { getDb } from "@/lib/db";
import { ANALYST_REFUND_LIMIT_CENTS, can, requirePermission } from "@/lib/auth/permissions";
import { recordAuditEvent } from "./audit";
import { NotFoundError, ValidationError } from "./errors";
import type { ListQuery, RefundRequest, RefundStatus, User } from "@/lib/types";

interface RefundRow {
  id: string;
  customer_name: string;
  amount_cents: number;
  currency: string;
  reason_code: string;
  status: RefundStatus;
  assigned_reviewer_id: string;
  reviewer_name: string;
  submitted_at: string;
  original_charge_id: string;
}

const SELECT = `
  SELECT r.*, u.name AS reviewer_name
  FROM refund_requests r JOIN users u ON u.id = r.assigned_reviewer_id
`;

function toRefund(row: RefundRow): RefundRequest {
  return {
    id: row.id,
    customerName: row.customer_name,
    amountCents: row.amount_cents,
    currency: row.currency,
    reasonCode: row.reason_code,
    status: row.status,
    assignedReviewerId: row.assigned_reviewer_id,
    assignedReviewerName: row.reviewer_name,
    submittedAt: row.submitted_at,
    originalChargeId: row.original_charge_id,
  };
}

export function listRefunds(actor: User, query: ListQuery = {}): RefundRequest[] {
  requirePermission(actor, "refunds.view");
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};
  if (query.search) {
    clauses.push("(r.customer_name LIKE @search OR r.id LIKE @search OR r.original_charge_id LIKE @search)");
    params.search = `%${query.search}%`;
  }
  if (query.status && query.status !== "ALL") {
    clauses.push("r.status = @status");
    params.status = query.status;
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = getDb().prepare(`${SELECT} ${where} ORDER BY r.submitted_at DESC`).all(params) as RefundRow[];
  return rows.map(toRefund);
}

export function getRefund(actor: User, id: string): RefundRequest {
  requirePermission(actor, "refunds.view");
  const row = getDb().prepare(`${SELECT} WHERE r.id = @id`).get({ id }) as RefundRow | undefined;
  if (!row) throw new NotFoundError(`Unknown refund request: ${id}`);
  return toRefund(row);
}

export type RefundAction = "APPROVE" | "DENY";

export function applyRefundAction(
  actor: User,
  refundId: string,
  input: { action: RefundAction; reason: string },
): RefundRequest {
  const reason = input.reason?.trim() ?? "";
  if (reason.length < 5) throw new ValidationError("A reason of at least 5 characters is required");

  requirePermission(actor, "refunds.review");
  const current = getRefund(actor, refundId);
  if (current.status !== "PENDING") {
    throw new ValidationError(`Refund ${refundId} is already ${current.status.toLowerCase()}`);
  }
  if (
    input.action === "APPROVE" &&
    current.amountCents > ANALYST_REFUND_LIMIT_CENTS &&
    !can(actor, "refunds.approve_large")
  ) {
    throw new ValidationError("Refunds above the analyst limit require a manager");
  }

  getDb()
    .prepare("UPDATE refund_requests SET status = ? WHERE id = ?")
    .run(input.action === "APPROVE" ? "APPROVED" : "DENIED", refundId);
  recordAuditEvent({ entityType: "REFUND_REQUEST", entityId: refundId, action: input.action, reason, actor });
  return getRefund(actor, refundId);
}
