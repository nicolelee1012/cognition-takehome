import { handle, listQueryFrom, resolveActor } from "@/lib/api/server";
import { listFeatureFlags } from "@/lib/services/featureFlags";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(() => ({ featureFlags: listFeatureFlags(resolveActor(request), listQueryFrom(request)) }));
}
