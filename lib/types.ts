export type Role = "ANALYST" | "MANAGER";

export interface User {
  id: string;
  name: string;
  role: Role;
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type KycStatus = "PENDING" | "APPROVED" | "REJECTED" | "ESCALATED";

export interface KycCase {
  id: string;
  customerName: string;
  customerEmail: string;
  customerCountry: string;
  accountOpenedAt: string;
  riskLevel: RiskLevel;
  status: KycStatus;
  assignedReviewerId: string;
  assignedReviewerName: string;
  submittedAt: string;
  riskFlags: string[];
  documents: KycDocument[];
}

export type DocumentStatus = "VERIFIED" | "PENDING" | "FAILED";

export interface KycDocument {
  type: string;
  status: DocumentStatus;
  checkedAt: string | null;
}

export type RefundStatus = "PENDING" | "APPROVED" | "DENIED" | "ESCALATED";

export interface RefundRequest {
  id: string;
  customerName: string;
  amountCents: number;
  currency: string;
  reasonCode: string;
  status: RefundStatus;
  assignedReviewerId: string;
  assignedReviewerName: string;
  submittedAt: string;
  originalChargeId: string;
}

export interface AuditEvent {
  id: string;
  entityType: "KYC_CASE" | "REFUND_REQUEST";
  entityId: string;
  action: string;
  reason: string;
  actorId: string;
  actorName: string;
  actorRole: Role;
  createdAt: string;
}

export interface ListQuery {
  search?: string;
  status?: string;
  risk?: string;
}
