import { handle, resolveActor } from "@/lib/api/server";
import { listAuditEvents } from "@/lib/services/audit";
import { getFeatureFlag } from "@/lib/services/featureFlags";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  return handle(() => ({
    featureFlag: getFeatureFlag(resolveActor(request), params.id),
    auditEvents: listAuditEvents({ entityType: "FEATURE_FLAG", entityId: params.id }),
  }));
}
