"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/client/session";
import { ROLE_LABELS } from "@/lib/auth/permissions";

const NAV = [
  { href: "/kyc", label: "KYC Reviews" },
  { href: "/refunds", label: "Refunds" },
  { href: "/audit", label: "Audit Log" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { users, currentUser, setCurrentUserId } = useSession();

  return (
    <div className="shell">
      <header className="topbar">
        <Link href="/" className="brand">
          <span className="brandMark">IO</span>
          <div>
            <div className="brandName">Internal Operations Console</div>
            <div className="brandSub">Prototype · seeded data</div>
          </div>
        </Link>
        <nav className="nav">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname.startsWith(item.href) ? "navLink navLinkActive" : "navLink"}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <label className="roleSwitcher">
          <span>Acting as</span>
          <select
            className="input"
            name="actingAs"
            id="acting-as"
            aria-label="Acting as"
            value={currentUser?.id ?? ""}
            onChange={(e) => setCurrentUserId(e.target.value)}
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} — {ROLE_LABELS[user.role]}
              </option>
            ))}
          </select>
        </label>
      </header>
      <main className="content">{currentUser ? children : <p className="muted">Loading session…</p>}</main>
    </div>
  );
}
