import { getDb } from "@/lib/db";
import { NotFoundError } from "./errors";
import type { User } from "@/lib/types";

interface UserRow {
  id: string;
  name: string;
  role: User["role"];
}

export function listUsers(): User[] {
  return getDb().prepare("SELECT id, name, role FROM users ORDER BY role DESC, name").all() as UserRow[];
}

export function getUser(id: string): User {
  const row = getDb().prepare("SELECT id, name, role FROM users WHERE id = ?").get(id) as UserRow | undefined;
  if (!row) throw new NotFoundError(`Unknown user: ${id}`);
  return row;
}
