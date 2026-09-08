import { handle, resolveActor } from "@/lib/api/server";
import { requirePermission } from "@/lib/auth/permissions";
import { listAuditEvents } from "@/lib/services/audit";
import type { AuditEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(() => {
    const actor = resolveActor(request);
    requirePermission(actor, "audit.view");
    const params = new URL(request.url).searchParams;
    return {
      auditEvents: listAuditEvents({
        entityType: (params.get("entityType") as AuditEvent["entityType"]) ?? undefined,
        entityId: params.get("entityId") ?? undefined,
      }),
    };
  });
}
