import { handle, resolveActor } from "@/lib/api/server";
import { dispatchToolRequest } from "@/lib/services/toolRequests";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const actor = resolveActor(request);
    const body = (await request.json()) as { reason: string };
    return { toolRequest: await dispatchToolRequest(actor, params.id, body.reason) };
  });
}
