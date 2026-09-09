import { getDb } from "@/lib/db";
import { requirePermission } from "@/lib/auth/permissions";
import { createDevinSession, getDevinSession } from "@/lib/devin/client";
import { recordAuditEvent } from "./audit";
import { NotFoundError, ValidationError } from "./errors";
import type { ListQuery, ToolRequest, ToolRequestStatus, User } from "@/lib/types";

interface ToolRequestRow {
  id: string;
  title: string;
  workflow_summary: string;
  records: string;
  actions: string;
  role_notes: string;
  status: ToolRequestStatus;
  requested_by_id: string;
  requester_name: string;
  created_at: string;
  devin_session_id: string | null;
  devin_session_url: string | null;
  devin_status: string | null;
  pull_request_url: string | null;
}

const SELECT = `
  SELECT t.*, u.name AS requester_name
  FROM tool_requests t JOIN users u ON u.id = t.requested_by_id
`;

function toToolRequest(row: ToolRequestRow): ToolRequest {
  return {
    id: row.id,
    title: row.title,
    workflowSummary: row.workflow_summary,
    records: row.records,
    actions: row.actions,
    roleNotes: row.role_notes,
    status: row.status,
    requestedById: row.requested_by_id,
    requestedByName: row.requester_name,
    createdAt: row.created_at,
    devinSessionId: row.devin_session_id,
    devinSessionUrl: row.devin_session_url,
    devinStatus: row.devin_status,
    pullRequestUrl: row.pull_request_url,
  };
}

export function listToolRequests(actor: User, query: ListQuery = {}): ToolRequest[] {
  requirePermission(actor, "tools.view");
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};
  if (query.search) {
    clauses.push("(t.title LIKE @search OR t.id LIKE @search OR t.workflow_summary LIKE @search)");
    params.search = `%${query.search}%`;
  }
  if (query.status && query.status !== "ALL") {
    clauses.push("t.status = @status");
    params.status = query.status;
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = getDb().prepare(`${SELECT} ${where} ORDER BY t.created_at DESC`).all(params) as ToolRequestRow[];
  return rows.map(toToolRequest);
}

export function getToolRequest(actor: User, id: string): ToolRequest {
  requirePermission(actor, "tools.view");
  const row = getDb().prepare(`${SELECT} WHERE t.id = @id`).get({ id }) as ToolRequestRow | undefined;
  if (!row) throw new NotFoundError(`Unknown tool request: ${id}`);
  return toToolRequest(row);
}

export interface ToolRequestInput {
  title: string;
  workflowSummary: string;
  records: string;
  actions: string;
  roleNotes: string;
}

export function createToolRequest(actor: User, input: ToolRequestInput): ToolRequest {
  requirePermission(actor, "tools.request");
  const fields: (keyof ToolRequestInput)[] = ["title", "workflowSummary", "records", "actions", "roleNotes"];
  for (const field of fields) {
    if (!input[field]?.trim()) throw new ValidationError(`${field} is required`);
  }

  const id = `TR-${String(Date.now()).slice(-6)}`;
  getDb()
    .prepare(
      `INSERT INTO tool_requests (id, title, workflow_summary, records, actions, role_notes, status,
         requested_by_id, created_at)
       VALUES (@id, @title, @workflowSummary, @records, @actions, @roleNotes, 'DRAFT', @requestedById, @createdAt)`,
    )
    .run({
      id,
      title: input.title.trim(),
      workflowSummary: input.workflowSummary.trim(),
      records: input.records.trim(),
      actions: input.actions.trim(),
      roleNotes: input.roleNotes.trim(),
      requestedById: actor.id,
      createdAt: new Date().toISOString(),
    });

  recordAuditEvent({
    entityType: "TOOL_REQUEST",
    entityId: id,
    action: "REQUEST_CREATED",
    reason: input.title.trim(),
    actor,
  });
  return getToolRequest(actor, id);
}

/**
 * The request form is turned into a prompt here rather than in the browser, so
 * the conventions Devin is asked to follow stay under review like any other
 * business rule.
 */
export function buildPrompt(request: ToolRequest): string {
  const repo = process.env.CONSOLE_REPO_URL ?? "the Internal Operations Console repository";
  return [
    `Add a new internal tool to ${repo}: "${request.title}".`,
    "",
    `What it is for: ${request.workflowSummary}`,
    `Records it manages: ${request.records}`,
    `Actions and statuses: ${request.actions}`,
    `Who can do what: ${request.roleNotes}`,
    "",
    "Follow the conventions the existing KYC and Refunds workflows use, and do not add new abstractions:",
    "- one service module in lib/services with all business rules, authorization and audit writes",
    "- thin route handlers under app/api that only resolve the actor and map errors",
    "- a queue page and a detail page built from DataTable, FilterBar, DetailLayout and ActionBar",
    "- permission strings declared in lib/auth/permissions.ts, enforced server-side with requirePermission",
    "- every state change recorded through recordAuditEvent",
    "- seed representative rows in lib/seed.ts",
    "",
    "Run the type check and lint, verify the workflow in the browser, and open a pull request for review.",
    `Requested by ${request.requestedByName} via the console (${request.id}).`,
  ].join("\n");
}

export async function dispatchToolRequest(actor: User, id: string, reason: string): Promise<ToolRequest> {
  requirePermission(actor, "tools.dispatch");
  if (reason?.trim().length < 5) throw new ValidationError("A reason of at least 5 characters is required");
  const request = getToolRequest(actor, id);
  if (request.status === "DISPATCHED") throw new ValidationError(`${id} has already been sent to Devin`);

  const session = await createDevinSession({
    prompt: buildPrompt(request),
    title: `Internal tool: ${request.title}`,
    tags: ["internal-ops-console", request.id],
    playbookId: process.env.DEVIN_PLAYBOOK_ID,
  });

  getDb()
    .prepare(
      `UPDATE tool_requests
       SET status = 'DISPATCHED', devin_session_id = @sessionId, devin_session_url = @url, devin_status = @status
       WHERE id = @id`,
    )
    .run({ id, sessionId: session.sessionId, url: session.url, status: session.status });

  recordAuditEvent({
    entityType: "TOOL_REQUEST",
    entityId: id,
    action: "DISPATCHED_TO_DEVIN",
    reason: `${reason.trim()} (session ${session.sessionId})`,
    actor,
  });
  return getToolRequest(actor, id);
}

/** Pulls live session status from Devin and caches it on the request. */
export async function refreshToolRequest(actor: User, id: string): Promise<ToolRequest> {
  const request = getToolRequest(actor, id);
  if (!request.devinSessionId) return request;

  const session = await getDevinSession(request.devinSessionId);
  getDb()
    .prepare("UPDATE tool_requests SET devin_status = @status, pull_request_url = @pr WHERE id = @id")
    .run({ id, status: session.status, pr: session.pullRequestUrl });
  return getToolRequest(actor, id);
}
