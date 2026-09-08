import { handle, resolveActor } from "@/lib/api/server";
import { listAuditEvents } from "@/lib/services/audit";
import { getRefund } from "@/lib/services/refunds";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  return handle(() => ({
    refund: getRefund(resolveActor(request), params.id),
    auditEvents: listAuditEvents({ entityType: "REFUND_REQUEST", entityId: params.id }),
  }));
}
