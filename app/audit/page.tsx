"use client";

import { useState } from "react";
import { DataTable, type Column } from "@/components/DataTable";
import { FilterBar } from "@/components/FilterBar";
import { api } from "@/lib/client/apiClient";
import { useSession } from "@/lib/client/session";
import { useResource } from "@/lib/client/useResource";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { formatDateTime } from "@/lib/format";
import type { AuditEvent } from "@/lib/types";

const ENTITY_OPTIONS = [
  { value: "ALL", label: "All workflows" },
  { value: "KYC_CASE", label: "KYC cases" },
  { value: "REFUND_REQUEST", label: "Refund requests" },
  { value: "TOOL_REQUEST", label: "Tool requests" },
];

const COLUMNS: Column<AuditEvent>[] = [
  { key: "when", header: "When", render: (e) => formatDateTime(e.createdAt), width: "190px" },
  { key: "entity", header: "Record", render: (e) => <span className="mono">{e.entityId}</span>, width: "120px" },
  { key: "action", header: "Action", render: (e) => e.action.replace(/_/g, " ").toLowerCase(), width: "150px" },
  {
    key: "actor",
    header: "Actor",
    render: (e) => `${e.actorName} (${ROLE_LABELS[e.actorRole] ?? e.actorRole})`,
    width: "220px",
  },
  { key: "reason", header: "Reason", render: (e) => e.reason },
];

export default function AuditLogPage() {
  const { currentUser } = useSession();
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState("ALL");

  const { data, loading, error } = useResource<AuditEvent[]>(
    () => (currentUser ? api.listAuditEvents(currentUser.id) : Promise.resolve([])),
    [currentUser?.id],
  );

  const term = search.trim().toLowerCase();
  const rows = (data ?? []).filter(
    (e) =>
      (entityType === "ALL" || e.entityType === entityType) &&
      (!term ||
        `${e.entityId} ${e.action} ${e.actorName} ${e.reason}`.toLowerCase().includes(term)),
  );

  return (
    <div className="page">
      <header className="pageHeader">
        <div>
          <h1>Audit Log</h1>
          <p className="muted">Every business action across all workflows, written by the shared audit service.</p>
        </div>
      </header>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search record, action, actor or reason…"
        resultCount={rows.length}
        filters={[
          { key: "entity", label: "Workflow", value: entityType, options: ENTITY_OPTIONS, onChange: setEntityType },
        ]}
      />

      {error && <p className="errorText">{error}</p>}

      <DataTable columns={COLUMNS} rows={rows} loading={loading} rowKey={(e) => e.id} />
    </div>
  );
}
