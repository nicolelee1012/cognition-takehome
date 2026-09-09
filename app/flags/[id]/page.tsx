"use client";

import { ActionBar, type ActionDefinition } from "@/components/ActionBar";
import { AuditTrail } from "@/components/AuditTrail";
import { Card, DetailLayout, FieldList } from "@/components/DetailLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/client/apiClient";
import { useSession } from "@/lib/client/session";
import { useResource } from "@/lib/client/useResource";
import { formatDateTime } from "@/lib/format";
import type { AuditEvent, FeatureFlag } from "@/lib/types";

const ROLLOUT_OPTIONS = [10, 25, 50, 75, 100].map((pct) => ({ value: String(pct), label: `${pct}%` }));

const SCHEDULE_OPTIONS = [
  { value: "1", label: "In 1 hour" },
  { value: "6", label: "In 6 hours" },
  { value: "24", label: "Tomorrow (24 hours)" },
  { value: "72", label: "In 3 days" },
];

export default function FeatureFlagDetailPage({ params }: { params: { id: string } }) {
  const { currentUser, can } = useSession();
  const { data, setData, loading, error } = useResource<{
    featureFlag: FeatureFlag;
    auditEvents: AuditEvent[];
  } | null>(
    () => (currentUser ? api.getFeatureFlag(currentUser.id, params.id) : Promise.resolve(null)),
    [currentUser?.id, params.id],
  );

  if (loading) return <p className="muted">Loading flag…</p>;
  if (error) return <p className="errorText">{error}</p>;
  if (!data) return null;

  const flag = data.featureFlag;
  const isProduction = flag.environment === "PRODUCTION";
  const productionBlocked = isProduction && !can("flags.change_production");
  const canChange = can("flags.change") && !productionBlocked;
  const changeDisabledReason = productionBlocked
    ? "Production flags can only be changed by a Manager"
    : "Only Managers can change flags — analysts can request a change";

  const actions: ActionDefinition[] = [
    {
      key: "ENABLE",
      label: "Enable",
      tone: "primary",
      enabled: canChange && flag.status !== "ON",
      disabledReason: canChange ? "Flag is already on" : changeDisabledReason,
      extraField: { label: "Rollout percentage", options: ROLLOUT_OPTIONS },
    },
    {
      key: "DISABLE",
      label: "Disable",
      tone: "danger",
      enabled: canChange && flag.status !== "OFF",
      disabledReason: canChange ? "Flag is already off" : changeDisabledReason,
    },
    {
      key: "SCHEDULE",
      label: "Schedule",
      tone: "warning",
      enabled: canChange,
      disabledReason: changeDisabledReason,
      extraField: { label: "Turn on", options: SCHEDULE_OPTIONS },
    },
    {
      key: "REQUEST_CHANGE",
      label: "Request change",
      tone: "primary",
      enabled: can("flags.request_change"),
      disabledReason: "You cannot request flag changes",
    },
  ];

  async function runAction(actionKey: string, input: { reason: string; extraValue?: string }) {
    if (!currentUser) return;
    const hoursAhead = Number(input.extraValue ?? 0);
    const updated = await api.applyFeatureFlagAction(currentUser.id, params.id, {
      action: actionKey,
      reason: input.reason,
      rolloutPercentage: actionKey === "ENABLE" ? Number(input.extraValue) : undefined,
      scheduledFor:
        actionKey === "SCHEDULE"
          ? new Date(Date.now() + hoursAhead * 60 * 60 * 1000).toISOString()
          : undefined,
    });
    const refreshed = await api.getFeatureFlag(currentUser.id, params.id);
    setData({ featureFlag: updated, auditEvents: refreshed.auditEvents });
  }

  return (
    <DetailLayout
      backHref="/flags"
      backLabel="Back to feature flags"
      title={flag.flagKey}
      subtitle={
        <>
          <span className="mono">{flag.id}</span> · <StatusBadge value={flag.status} />{" "}
          <StatusBadge value={flag.environment} />
        </>
      }
      actions={<ActionBar actions={actions} onSubmit={runAction} />}
      main={
        <Card title="Flag details">
          <FieldList
            fields={[
              { label: "Flag key", value: <span className="mono">{flag.flagKey}</span> },
              { label: "Environment", value: <StatusBadge value={flag.environment} /> },
              { label: "Owner", value: flag.ownerName },
              { label: "Status", value: <StatusBadge value={flag.status} /> },
              { label: "Rollout percentage", value: `${flag.rolloutPercentage}%` },
              { label: "Scheduled for", value: flag.scheduledFor ? formatDateTime(flag.scheduledFor) : "—" },
              { label: "Last changed", value: `${formatDateTime(flag.lastChangedAt)} · ${flag.lastChangedByName}` },
            ]}
          />
        </Card>
      }
      side={
        <Card title="Change history">
          <AuditTrail events={data.auditEvents} />
        </Card>
      }
    />
  );
}
