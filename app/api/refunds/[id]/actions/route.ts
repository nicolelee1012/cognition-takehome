import { handle, resolveActor } from "@/lib/api/server";
import { applyRefundAction, type RefundAction } from "@/lib/services/refunds";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const actor = resolveActor(request);
    const body = (await request.json()) as { action: RefundAction; reason: string };
    return { refund: applyRefundAction(actor, params.id, body) };
  });
}
