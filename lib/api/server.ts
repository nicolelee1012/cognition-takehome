import { NextResponse } from "next/server";
import { AuthorizationError } from "@/lib/auth/permissions";
import { NotFoundError, ValidationError } from "@/lib/services/errors";
import { getUser } from "@/lib/services/users";
import type { User } from "@/lib/types";
import { ACTOR_HEADER } from "./constants";

/**
 * Mocked authentication: the acting user is taken from a request header set by
 * the role switcher. In production this is where a real session / SSO identity
 * would be resolved; every route handler keeps using the same `actor` object.
 */
export function resolveActor(request: Request): User {
  const actorId = request.headers.get(ACTOR_HEADER);
  if (!actorId) throw new AuthorizationError("kyc.view");
  return getUser(actorId);
}

/** Shared error mapping so each route handler stays a two-liner. */
export async function handle<T>(fn: () => Promise<T> | T): Promise<NextResponse> {
  try {
    return NextResponse.json(await fn());
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export function listQueryFrom(request: Request) {
  const params = new URL(request.url).searchParams;
  return {
    search: params.get("search") ?? undefined,
    status: params.get("status") ?? undefined,
    risk: params.get("risk") ?? undefined,
    environment: params.get("environment") ?? undefined,
  };
}
