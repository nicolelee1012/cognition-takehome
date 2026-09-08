import { handle, listQueryFrom, resolveActor } from "@/lib/api/server";
import { listKycCases } from "@/lib/services/kyc";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(() => ({ cases: listKycCases(resolveActor(request), listQueryFrom(request)) }));
}
