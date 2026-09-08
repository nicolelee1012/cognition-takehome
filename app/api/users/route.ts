import { handle } from "@/lib/api/server";
import { listUsers } from "@/lib/services/users";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(() => ({ users: listUsers() }));
}
