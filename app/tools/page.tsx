"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DataTable, type Column } from "@/components/DataTable";
import { FilterBar } from "@/components/FilterBar";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/DetailLayout";
import { api } from "@/lib/client/apiClient";
import { useSession } from "@/lib/client/session";
import { useResource } from "@/lib/client/useResource";
import { formatDate } from "@/lib/format";
import type { ToolRequest } from "@/lib/types";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "DISPATCHED", label: "Sent to Devin" },
];

const COLUMNS: Column<ToolRequest>[] = [
  { key: "id", header: "Request", render: (r) => <span className="mono">{r.id}</span>, width: "110px" },
  { key: "title", header: "Tool", render: (r) => <strong>{r.title}</strong> },
  { key: "requester", header: "Requested by", render: (r) => r.requestedByName, width: "160px" },
  { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} />, width: "130px" },
  {
    key: "session",
    header: "Devin session",
    render: (r) => (r.devinStatus ? <StatusBadge value={r.devinStatus.toUpperCase()} /> : "—"),
    width: "130px",
  },
  { key: "created", header: "Created", render: (r) => formatDate(r.createdAt), width: "140px" },
];

const EMPTY_FORM = { title: "", workflowSummary: "", records: "", actions: "", roleNotes: "" };

export default function ToolRequestsPage() {
  const router = useRouter();
  const { currentUser, can } = useSession();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, loading, error, refresh } = useResource<ToolRequest[]>(
    () => (currentUser ? api.listToolRequests(currentUser.id, { search, status }) : Promise.resolve([])),
    [currentUser?.id, search, status],
  );

  async function submitRequest(event: React.FormEvent) {
    event.preventDefault();
    if (!currentUser) return;
    setSaving(true);
    setFormError(null);
    try {
      const created = await api.createToolRequest(currentUser.id, form);
      setForm(EMPTY_FORM);
      refresh();
      router.push(`/tools/${created.id}`);
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const fields: { key: keyof typeof EMPTY_FORM; label: string; placeholder: string; rows?: number }[] = [
    { key: "title", label: "Tool name", placeholder: "Feature Flag Admin" },
    {
      key: "workflowSummary",
      label: "What it is for",
      placeholder: "Let ops enable or disable flags per environment without a deploy",
      rows: 2,
    },
    { key: "records", label: "Records it manages", placeholder: "Flag key, environment, owner, rollout %", rows: 2 },
    {
      key: "actions",
      label: "Actions and statuses",
      placeholder: "Enable / Disable / Schedule; statuses ON, OFF, SCHEDULED",
      rows: 2,
    },
    {
      key: "roleNotes",
      label: "Who can do what",
      placeholder: "Analysts view and request; Managers enable in production",
      rows: 2,
    },
  ];

  return (
    <div className="page">
      <header className="pageHeader">
        <div>
          <h1>Tool Requests</h1>
          <p className="muted">
            Ops describes the internal tool they need; a Manager hands it to Devin, which opens a pull request
            against this repository for engineering review.
          </p>
        </div>
      </header>

      <Card title="Request a new internal tool">
        <form className="requestForm" onSubmit={submitRequest}>
          {fields.map((field) => (
            <label key={field.key} className="modalField">
              <span>{field.label}</span>
              {field.rows ? (
                <textarea
                  className="input"
                  id={`tool-${field.key}`}
                  name={field.key}
                  rows={field.rows}
                  placeholder={field.placeholder}
                  value={form[field.key]}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                />
              ) : (
                <input
                  className="input"
                  id={`tool-${field.key}`}
                  name={field.key}
                  placeholder={field.placeholder}
                  value={form[field.key]}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                />
              )}
            </label>
          ))}
          {formError && <p className="errorText">{formError}</p>}
          <div className="modalActions">
            <button className="button button-primary" type="submit" disabled={saving || !can("tools.request")}>
              {saving ? "Saving…" : "Save request"}
            </button>
          </div>
        </form>
      </Card>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search tool name or request ID…"
        resultCount={data?.length}
        filters={[{ key: "status", label: "Status", value: status, options: STATUS_OPTIONS, onChange: setStatus }]}
      />

      {error && <p className="errorText">{error}</p>}

      <DataTable
        columns={COLUMNS}
        rows={data ?? []}
        loading={loading}
        rowKey={(r) => r.id}
        onRowClick={(r) => router.push(`/tools/${r.id}`)}
      />
    </div>
  );
}
