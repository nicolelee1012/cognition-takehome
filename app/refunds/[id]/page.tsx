"use client";

import { ActionBar, type ActionDefinition } from "@/components/ActionBar";
import { AuditTrail } from "@/components/AuditTrail";
import { Card, DetailLayout, FieldList } from "@/components/DetailLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { ANALYST_REFUND_LIMIT_CENTS } from "@/lib/auth/permissions";
import { api } from "@/lib/client/apiClient";
import { useSession } from "@/lib/client/session";
import { useResource } from "@/lib/client/useResource";
import { formatDate, formatMoney } from "@/lib/format";
import type { AuditEvent, RefundRequest } from "@/lib/types";

export default function RefundDetailPage({ params }: { params: { id: string } }) {
  const { currentUser, can } = useSession();
  const { data, setData, loading, error } = useResource<{
    refund: RefundRequest;
    auditEvents: AuditEvent[];
  } | null>(
    () => (currentUser ? api.getRefund(currentUser.id, params.id) : Promise.resolve(null)),
    [currentUser?.id, params.id],
  );

  if (loading) return <p className="muted">Loading request…</p>;
  if (error) return <p className="errorText">{error}</p>;
  if (!data) return null;

  const refund = data.refund;
  const isPending = refund.status === "PENDING";
  const overLimit = refund.amountCents > ANALYST_REFUND_LIMIT_CENTS;
  const needsManager = overLimit && !can("refunds.approve_large");

  const actions: ActionDefinition[] = [
    {
      key: "APPROVE",
      label: "Approve refund",
      tone: "primary",
      enabled: can("refunds.review") && isPending && !needsManager,
      disabledReason: !isPending
        ? `Request is already ${refund.status.toLowerCase()}`
        : `Refunds above ${formatMoney(ANALYST_REFUND_LIMIT_CENTS, refund.currency)} require a Manager`,
    },
    {
      key: "DENY",
      label: "Deny refund",
      tone: "danger",
      enabled: can("refunds.review") && isPending,
      disabledReason: `Request is already ${refund.status.toLowerCase()}`,
    },
  ];

  async function runAction(actionKey: string, input: { reason: string }) {
    if (!currentUser) return;
    const updated = await api.applyRefundAction(currentUser.id, params.id, {
      action: actionKey,
      reason: input.reason,
    });
    const refreshed = await api.getRefund(currentUser.id, params.id);
    setData({ refund: updated, auditEvents: refreshed.auditEvents });
  }

  return (
    <DetailLayout
      backHref="/refunds"
      backLabel="Back to refunds"
      title={`${formatMoney(refund.amountCents, refund.currency)} · ${refund.customerName}`}
      subtitle={
        <>
          <span className="mono">{refund.id}</span> · <StatusBadge value={refund.status} />
        </>
      }
      actions={<ActionBar actions={actions} onSubmit={runAction} />}
      main={
        <Card title="Request details">
          <FieldList
            fields={[
              { label: "Customer", value: refund.customerName },
              { label: "Amount", value: formatMoney(refund.amountCents, refund.currency) },
              { label: "Reason code", value: refund.reasonCode.replace(/_/g, " ").toLowerCase() },
              { label: "Original charge", value: <span className="mono">{refund.originalChargeId}</span> },
              { label: "Assigned reviewer", value: refund.assignedReviewerName },
              { label: "Submitted", value: formatDate(refund.submittedAt) },
            ]}
          />
        </Card>
      }
      side={
        <Card title="History">
          <AuditTrail events={data.auditEvents} />
        </Card>
      }
    />
  );
}
