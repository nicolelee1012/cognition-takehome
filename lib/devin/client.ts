import { ValidationError } from "@/lib/services/errors";

/**
 * Server-only client for the Devin REST API. The API key never reaches the
 * browser: the UI calls our own `/api/tool-requests` routes, which call this.
 */
const BASE_URL = process.env.DEVIN_API_BASE_URL ?? "https://api.devin.ai";

export interface DevinSession {
  sessionId: string;
  url: string;
  status: string | null;
  pullRequestUrl: string | null;
}

function apiKey(): string {
  const key = process.env.DEVIN_API_KEY;
  if (!key) throw new ValidationError("DEVIN_API_KEY is not configured on the server");
  return key;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new ValidationError(`Devin API error ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
  return (await response.json()) as T;
}

export async function createDevinSession(input: {
  prompt: string;
  title: string;
  tags?: string[];
  playbookId?: string;
}): Promise<DevinSession> {
  const created = await call<{ session_id: string; url: string }>("/v1/sessions", {
    method: "POST",
    body: JSON.stringify({
      prompt: input.prompt,
      title: input.title,
      tags: input.tags ?? ["internal-ops-console"],
      ...(input.playbookId ? { playbook_id: input.playbookId } : {}),
    }),
  });
  return { sessionId: created.session_id, url: created.url, status: "working", pullRequestUrl: null };
}

export async function getDevinSession(sessionId: string): Promise<Pick<DevinSession, "status" | "pullRequestUrl">> {
  const session = await call<{ status_enum: string | null; pull_request?: { url: string } | null }>(
    `/v1/sessions/${sessionId}`,
  );
  return { status: session.status_enum, pullRequestUrl: session.pull_request?.url ?? null };
}
