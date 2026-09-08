import { handle, resolveActor } from "@/lib/api/server";
import { listAuditEvents } from "@/lib/services/audit";
import { getKycCase } from "@/lib/services/kyc";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  return handle(() => ({
    case: getKycCase(resolveActor(request), params.id),
    auditEvents: listAuditEvents({ entityType: "KYC_CASE", entityId: params.id }),
  }));
}
