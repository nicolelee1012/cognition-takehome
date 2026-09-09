"use client";

import Link from "next/link";
import { api } from "@/lib/client/apiClient";
import { useSession } from "@/lib/client/session";
import { useResource } from "@/lib/client/useResource";

interface ToolSummary {
  href: string;
  name: string;
  description: string;
  metricLabel: string;
  metric: number | null;
}

export default function HomePage() {
  const { currentUser } = useSession();

  const { data } = useResource(
    async () => {
      if (!currentUser) return null;
      const [kyc, refunds, audit] = await Promise.all([
        api.listKycCases(currentUser.id, { status: "PENDING" }),
        api.listRefunds(currentUser.id, { status: "PENDING" }),
        api.listAuditEvents(currentUser.id),
      ]);
      return { kyc: kyc.length, refunds: refunds.length, audit: audit.length };
    },
    [currentUser?.id],
  );

  const tools: ToolSummary[] = [
    {
      href: "/kyc",
      name: "KYC Reviews",
      description: "Review customer identity verification cases: risk flags, documents, approve / reject / escalate.",
      metricLabel: "cases pending",
      metric: data?.kyc ?? null,
    },
    {
      href: "/refunds",
      name: "Refunds",
      description: "Approve or deny customer refund requests, with a manager approval limit on large amounts.",
      metricLabel: "requests pending",
      metric: data?.refunds ?? null,
    },
    {
      href: "/audit",
      name: "Audit Log",
      description: "Every business action across all workflows, with actor, timestamp and reason.",
      metricLabel: "events recorded",
      metric: data?.audit ?? null,
    },
  ];

  return (
    <div className="page">
      <header className="pageHeader">
        <h1>Internal Operations Console</h1>
        <p className="muted">
          Internal tools for the operations team. Signed in as {currentUser?.name} — switch users in the top right
          to see role-specific behaviour.
        </p>
      </header>

      <div className="toolGrid">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href} className="toolCard">
            <h2 className="toolName">{tool.name}</h2>
            <p className="toolDescription">{tool.description}</p>
            <div className="toolMetric">
              <strong>{tool.metric ?? "—"}</strong> {tool.metricLabel}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
