import { handle, listQueryFrom, resolveActor } from "@/lib/api/server";
import { listRefunds } from "@/lib/services/refunds";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(() => ({ refunds: listRefunds(resolveActor(request), listQueryFrom(request)) }));
}
