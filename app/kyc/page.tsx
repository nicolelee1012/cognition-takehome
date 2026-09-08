"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DataTable, type Column } from "@/components/DataTable";
import { FilterBar } from "@/components/FilterBar";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/client/apiClient";
import { useSession } from "@/lib/client/session";
import { useResource } from "@/lib/client/useResource";
import { formatDate } from "@/lib/format";
import type { KycCase } from "@/lib/types";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ESCALATED", label: "Escalated" },
];

const RISK_OPTIONS = [
  { value: "ALL", label: "All risk levels" },
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
];

const COLUMNS: Column<KycCase>[] = [
  { key: "id", header: "Case", render: (c) => <span className="mono">{c.id}</span>, width: "110px" },
  { key: "customer", header: "Customer", render: (c) => <strong>{c.customerName}</strong> },
  { key: "risk", header: "Risk", render: (c) => <StatusBadge value={c.riskLevel} />, width: "110px" },
  { key: "status", header: "Status", render: (c) => <StatusBadge value={c.status} />, width: "120px" },
  { key: "reviewer", header: "Reviewer", render: (c) => c.assignedReviewerName },
  { key: "submitted", header: "Submitted", render: (c) => formatDate(c.submittedAt), width: "140px" },
];

export default function KycQueuePage() {
  const router = useRouter();
  const { currentUser } = useSession();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [risk, setRisk] = useState("ALL");

  const { data, loading, error } = useResource<KycCase[]>(
    () => (currentUser ? api.listKycCases(currentUser.id, { search, status, risk }) : Promise.resolve([])),
    [currentUser?.id, search, status, risk],
  );

  return (
    <div className="page">
      <header className="pageHeader">
        <div>
          <h1>KYC Review Queue</h1>
          <p className="muted">Customer identity verification cases awaiting review.</p>
        </div>
      </header>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search customer, case ID or reviewer…"
        resultCount={data?.length}
        filters={[
          { key: "status", label: "Status", value: status, options: STATUS_OPTIONS, onChange: setStatus },
          { key: "risk", label: "Risk", value: risk, options: RISK_OPTIONS, onChange: setRisk },
        ]}
      />

      {error && <p className="errorText">{error}</p>}

      <DataTable
        columns={COLUMNS}
        rows={data ?? []}
        loading={loading}
        rowKey={(c) => c.id}
        onRowClick={(c) => router.push(`/kyc/${c.id}`)}
      />
    </div>
  );
}
