import { handle, resolveActor } from "@/lib/api/server";
import { listAuditEvents } from "@/lib/services/audit";
import { getToolRequest, refreshToolRequest } from "@/lib/services/toolRequests";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const actor = resolveActor(request);
    const current = getToolRequest(actor, params.id);
    // Session status is owned by Devin, so refresh it on read; a failing API
    // call must not hide the request itself.
    const toolRequest = current.devinSessionId
      ? await refreshToolRequest(actor, params.id).catch(() => current)
      : current;
    return {
      toolRequest,
      auditEvents: listAuditEvents({ entityType: "TOOL_REQUEST", entityId: params.id }),
    };
  });
}
