import type { AuditEvent, KycCase, ListQuery, RefundRequest, ToolRequest, User } from "@/lib/types";
import { ACTOR_HEADER } from "@/lib/api/constants";

/**
 * The only place the UI knows how business data is fetched. Today it talks to
 * the local Next.js API routes; pointing `BASE_URL` at an existing KYC or
 * refunds REST service (and adjusting these functions) would not change any
 * component.
 */
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

class ApiError extends Error {}

async function request<T>(path: string, actorId: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      [ACTOR_HEADER]: actorId,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new ApiError(payload.error ?? `Request failed: ${response.status}`);
  return payload;
}

function toQueryString(query: ListQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status && query.status !== "ALL") params.set("status", query.status);
  if (query.risk && query.risk !== "ALL") params.set("risk", query.risk);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const api = {
  listUsers: () => request<{ users: User[] }>("/users", "system").then((r) => r.users),

  listKycCases: (actorId: string, query: ListQuery) =>
    request<{ cases: KycCase[] }>(`/kyc-cases${toQueryString(query)}`, actorId).then((r) => r.cases),

  getKycCase: (actorId: string, id: string) =>
    request<{ case: KycCase; auditEvents: AuditEvent[] }>(`/kyc-cases/${id}`, actorId),

  applyKycAction: (
    actorId: string,
    id: string,
    body: { action: string; reason: string; assigneeId?: string },
  ) =>
    request<{ case: KycCase; auditEvents: AuditEvent[] }>(`/kyc-cases/${id}/actions`, actorId, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listRefunds: (actorId: string, query: ListQuery) =>
    request<{ refunds: RefundRequest[] }>(`/refunds${toQueryString(query)}`, actorId).then((r) => r.refunds),

  getRefund: (actorId: string, id: string) =>
    request<{ refund: RefundRequest; auditEvents: AuditEvent[] }>(`/refunds/${id}`, actorId),

  applyRefundAction: (actorId: string, id: string, body: { action: string; reason: string }) =>
    request<{ refund: RefundRequest }>(`/refunds/${id}/actions`, actorId, {
      method: "POST",
      body: JSON.stringify(body),
    }).then((r) => r.refund),

  listToolRequests: (actorId: string, query: ListQuery) =>
    request<{ toolRequests: ToolRequest[] }>(`/tool-requests${toQueryString(query)}`, actorId).then(
      (r) => r.toolRequests,
    ),

  getToolRequest: (actorId: string, id: string) =>
    request<{ toolRequest: ToolRequest; auditEvents: AuditEvent[] }>(`/tool-requests/${id}`, actorId),

  createToolRequest: (
    actorId: string,
    body: { title: string; workflowSummary: string; records: string; actions: string; roleNotes: string },
  ) =>
    request<{ toolRequest: ToolRequest }>("/tool-requests", actorId, {
      method: "POST",
      body: JSON.stringify(body),
    }).then((r) => r.toolRequest),

  dispatchToolRequest: (actorId: string, id: string, body: { reason: string }) =>
    request<{ toolRequest: ToolRequest }>(`/tool-requests/${id}/dispatch`, actorId, {
      method: "POST",
      body: JSON.stringify(body),
    }).then((r) => r.toolRequest),

  listAuditEvents: (actorId: string) =>
    request<{ auditEvents: AuditEvent[] }>("/audit-events", actorId).then((r) => r.auditEvents),
};
