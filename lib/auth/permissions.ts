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
  | "kyc.reassign"
  | "refunds.view"
  | "refunds.review"
  | "refunds.approve_large" // refunds above the analyst limit
  | "audit.view";

export const ANALYST_REFUND_LIMIT_CENTS = 50_000;

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ANALYST: ["kyc.view", "kyc.review", "refunds.view", "refunds.review", "audit.view"],
  MANAGER: [
    "kyc.view",
    "kyc.review",
    "kyc.resolve_escalated",
    "kyc.reassign",
    "refunds.view",
    "refunds.review",
    "refunds.approve_large",
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
