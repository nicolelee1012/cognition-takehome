"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./apiClient";
import { can, type Permission } from "@/lib/auth/permissions";
import type { User } from "@/lib/types";

const STORAGE_KEY = "ops-console.actor-id";

interface SessionValue {
  users: User[];
  currentUser: User | null;
  setCurrentUserId: (id: string) => void;
  can: (permission: Permission) => boolean;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    api.listUsers().then((loaded) => {
      setUsers(loaded);
      const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      const initial = loaded.find((u) => u.id === stored) ?? loaded.find((u) => u.role === "ANALYST") ?? loaded[0];
      setCurrentUserId(initial?.id ?? null);
    });
  }, []);

  const value = useMemo<SessionValue>(() => {
    const currentUser = users.find((u) => u.id === currentUserId) ?? null;
    return {
      users,
      currentUser,
      setCurrentUserId: (id: string) => {
        window.localStorage.setItem(STORAGE_KEY, id);
        setCurrentUserId(id);
      },
      can: (permission: Permission) => can(currentUser, permission),
    };
  }, [users, currentUserId]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
