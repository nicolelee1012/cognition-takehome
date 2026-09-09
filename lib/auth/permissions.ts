import type { Role, User } from "@/lib/types";

/**
 * Single place where role capabilities are defined for every internal tool in
 * the console. New workflows add their permission strings here instead of
 * embedding role checks in components or route handlers.
 */
export type Permission =
  | "kyc.view"
  | "kyc.review" // approve / reject / escalate a standard case
  | "kyc.resolve_escalated" // act on a case that is already escalated
  | "kyc.approve_high_risk" // approve a HIGH risk case
  | "kyc.reassign"
  | "refunds.view"
  | "refunds.review"
  | "refunds.approve_large" // refunds above the analyst limit
  | "flags.view"
  | "flags.change" // enable / disable / schedule a flag
  | "flags.change_production" // change a flag in the production environment
  | "flags.request_change" // ask an owner for a change without applying it
  | "tools.view"
  | "tools.request" // draft a request for a new internal tool
  | "tools.dispatch" // hand a request to Devin
  | "audit.view";

export const ANALYST_REFUND_LIMIT_CENTS = 50_000;

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ANALYST: [
    "kyc.view",
    "kyc.review",
    "refunds.view",
    "refunds.review",
    "flags.view",
    "flags.request_change",
    "tools.view",
    "tools.request",
    "audit.view",
  ],
  MANAGER: [
    "kyc.view",
    "kyc.review",
    "kyc.resolve_escalated",
    "kyc.approve_high_risk",
    "kyc.reassign",
    "refunds.view",
    "refunds.review",
    "refunds.approve_large",
    "flags.view",
    "flags.change",
    "flags.change_production",
    "flags.request_change",
    "tools.view",
    "tools.request",
    "tools.dispatch",
    "audit.view",
  ],
};

export const ROLE_LABELS: Record<Role, string> = {
  ANALYST: "Analyst",
  MANAGER: "Manager",
};

export function can(user: Pick<User, "role"> | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  return ROLE_PERMISSIONS[user.role].includes(permission);
}

export class AuthorizationError extends Error {
  constructor(permission: Permission) {
    super(`Missing permission: ${permission}`);
    this.name = "AuthorizationError";
  }
}

export function requirePermission(user: Pick<User, "role"> | null | undefined, permission: Permission): void {
  if (!can(user, permission)) throw new AuthorizationError(permission);
}
