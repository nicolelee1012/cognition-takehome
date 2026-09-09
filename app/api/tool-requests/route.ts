import { handle, listQueryFrom, resolveActor } from "@/lib/api/server";
import { createToolRequest, listToolRequests, type ToolRequestInput } from "@/lib/services/toolRequests";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(() => ({ toolRequests: listToolRequests(resolveActor(request), listQueryFrom(request)) }));
}

export async function POST(request: Request) {
  return handle(async () => {
    const actor = resolveActor(request);
    const body = (await request.json()) as ToolRequestInput;
    return { toolRequest: createToolRequest(actor, body) };
  });
}
