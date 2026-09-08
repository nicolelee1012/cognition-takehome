"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DataTable, type Column } from "@/components/DataTable";
import { FilterBar } from "@/components/FilterBar";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/client/apiClient";
import { useSession } from "@/lib/client/session";
import { useResource } from "@/lib/client/useResource";
import { formatDate, formatMoney } from "@/lib/format";
import type { RefundRequest } from "@/lib/types";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "DENIED", label: "Denied" },
];

const COLUMNS: Column<RefundRequest>[] = [
  { key: "id", header: "Request", render: (r) => <span className="mono">{r.id}</span>, width: "110px" },
  { key: "customer", header: "Customer", render: (r) => <strong>{r.customerName}</strong> },
  { key: "amount", header: "Amount", render: (r) => formatMoney(r.amountCents, r.currency), width: "120px" },
  { key: "reason", header: "Reason", render: (r) => r.reasonCode.replace(/_/g, " ").toLowerCase() },
  { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} />, width: "120px" },
  { key: "submitted", header: "Submitted", render: (r) => formatDate(r.submittedAt), width: "140px" },
];

export default function RefundsQueuePage() {
  const router = useRouter();
  const { currentUser } = useSession();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");

  const { data, loading, error } = useResource<RefundRequest[]>(
    () => (currentUser ? api.listRefunds(currentUser.id, { search, status }) : Promise.resolve([])),
    [currentUser?.id, search, status],
  );

  return (
    <div className="page">
      <header className="pageHeader">
        <div>
          <h1>Refund Requests</h1>
          <p className="muted">
            Second workflow built from the same table, filter, detail, action and audit primitives.
          </p>
        </div>
      </header>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search customer, request ID or charge…"
        resultCount={data?.length}
        filters={[{ key: "status", label: "Status", value: status, options: STATUS_OPTIONS, onChange: setStatus }]}
      />

      {error && <p className="errorText">{error}</p>}

      <DataTable
        columns={COLUMNS}
        rows={data ?? []}
        loading={loading}
        rowKey={(r) => r.id}
        onRowClick={(r) => router.push(`/refunds/${r.id}`)}
      />
    </div>
  );
}
