import { handle, resolveActor } from "@/lib/api/server";
import { applyFeatureFlagAction, type FeatureFlagAction } from "@/lib/services/featureFlags";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const actor = resolveActor(request);
    const body = (await request.json()) as {
      action: FeatureFlagAction;
      reason: string;
      rolloutPercentage?: number;
      scheduledFor?: string;
    };
    return { featureFlag: applyFeatureFlagAction(actor, params.id, body) };
  });
}
