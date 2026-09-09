"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DataTable, type Column } from "@/components/DataTable";
import { FilterBar } from "@/components/FilterBar";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/client/apiClient";
import { useSession } from "@/lib/client/session";
import { useResource } from "@/lib/client/useResource";
import { formatDateTime } from "@/lib/format";
import type { FeatureFlag } from "@/lib/types";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "ON", label: "On" },
  { value: "OFF", label: "Off" },
  { value: "SCHEDULED", label: "Scheduled" },
];

const ENVIRONMENT_OPTIONS = [
  { value: "ALL", label: "All environments" },
  { value: "DEVELOPMENT", label: "Development" },
  { value: "STAGING", label: "Staging" },
  { value: "PRODUCTION", label: "Production" },
];

const COLUMNS: Column<FeatureFlag>[] = [
  { key: "key", header: "Flag key", render: (f) => <span className="mono">{f.flagKey}</span> },
  { key: "environment", header: "Environment", render: (f) => <StatusBadge value={f.environment} />, width: "140px" },
  { key: "owner", header: "Owner", render: (f) => f.ownerName, width: "160px" },
  { key: "status", header: "Status", render: (f) => <StatusBadge value={f.status} />, width: "120px" },
  { key: "rollout", header: "Rollout", render: (f) => `${f.rolloutPercentage}%`, width: "100px" },
  { key: "changed", header: "Last changed", render: (f) => formatDateTime(f.lastChangedAt), width: "190px" },
];

export default function FeatureFlagsQueuePage() {
  const router = useRouter();
  const { currentUser } = useSession();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [environment, setEnvironment] = useState("ALL");

  const { data, loading, error } = useResource<FeatureFlag[]>(
    () => (currentUser ? api.listFeatureFlags(currentUser.id, { search, status, environment }) : Promise.resolve([])),
    [currentUser?.id, search, status, environment],
  );

  return (
    <div className="page">
      <header className="pageHeader">
        <div>
          <h1>Feature Flag Admin</h1>
          <p className="muted">Turn flags on and off per environment without waiting for a deploy.</p>
        </div>
      </header>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search flag key, flag ID or owner…"
        resultCount={data?.length}
        filters={[
          { key: "status", label: "Status", value: status, options: STATUS_OPTIONS, onChange: setStatus },
          {
            key: "environment",
            label: "Environment",
            value: environment,
            options: ENVIRONMENT_OPTIONS,
            onChange: setEnvironment,
          },
        ]}
      />

      {error && <p className="errorText">{error}</p>}

      <DataTable
        columns={COLUMNS}
        rows={data ?? []}
        loading={loading}
        rowKey={(f) => f.id}
        onRowClick={(f) => router.push(`/flags/${f.id}`)}
      />
    </div>
  );
}
