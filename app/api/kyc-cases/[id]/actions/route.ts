import { handle, resolveActor } from "@/lib/api/server";
import { listAuditEvents } from "@/lib/services/audit";
import { applyKycAction, type KycAction } from "@/lib/services/kyc";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const actor = resolveActor(request);
    const body = (await request.json()) as { action: KycAction; reason: string; assigneeId?: string };
    const updated = applyKycAction(actor, params.id, body);
    return { case: updated, auditEvents: listAuditEvents({ entityType: "KYC_CASE", entityId: params.id }) };
  });
}
