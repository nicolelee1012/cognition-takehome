"use client";

import { ActionBar, type ActionDefinition } from "@/components/ActionBar";
import { AuditTrail } from "@/components/AuditTrail";
import { Card, DetailLayout, FieldList } from "@/components/DetailLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/client/apiClient";
import { useSession } from "@/lib/client/session";
import { useResource } from "@/lib/client/useResource";
import { formatDate, formatDateTime } from "@/lib/format";
import type { AuditEvent, KycCase } from "@/lib/types";

export default function KycCaseDetailPage({ params }: { params: { id: string } }) {
  const { currentUser, users, can } = useSession();
  const { data, setData, loading, error } = useResource<{ case: KycCase; auditEvents: AuditEvent[] } | null>(
    () => (currentUser ? api.getKycCase(currentUser.id, params.id) : Promise.resolve(null)),
    [currentUser?.id, params.id],
  );

  if (loading) return <p className="muted">Loading case…</p>;
  if (error) return <p className="errorText">{error}</p>;
  if (!data) return null;

  const kycCase = data.case;
  const isClosed = kycCase.status === "APPROVED" || kycCase.status === "REJECTED";
  const escalatedBlocked = kycCase.status === "ESCALATED" && !can("kyc.resolve_escalated");
  const reviewDisabledReason = isClosed
    ? `Case is already ${kycCase.status.toLowerCase()}`
    : escalatedBlocked
      ? "Escalated cases can only be resolved by a Manager"
      : undefined;
  const canReview = can("kyc.review") && !isClosed && !escalatedBlocked;

  const actions: ActionDefinition[] = [
    { key: "APPROVE", label: "Approve", tone: "primary", enabled: canReview, disabledReason: reviewDisabledReason },
    { key: "REJECT", label: "Reject", tone: "danger", enabled: canReview, disabledReason: reviewDisabledReason },
    {
      key: "ESCALATE",
      label: "Escalate",
      tone: "warning",
      enabled: canReview && kycCase.status !== "ESCALATED",
      disabledReason: reviewDisabledReason ?? "Case is already escalated",
    },
    {
      key: "REASSIGN",
      label: "Reassign",
      tone: "primary",
      enabled: can("kyc.reassign"),
      disabledReason: "Only Managers can reassign ownership",
      extraField: {
        label: "New reviewer",
        options: users.map((u) => ({ value: u.id, label: `${u.name} (${u.role.toLowerCase()})` })),
      },
    },
  ];

  async function runAction(actionKey: string, input: { reason: string; extraValue?: string }) {
    if (!currentUser) return;
    const result = await api.applyKycAction(currentUser.id, params.id, {
      action: actionKey,
      reason: input.reason,
      assigneeId: actionKey === "REASSIGN" ? input.extraValue : undefined,
    });
    setData(result);
  }

  return (
    <DetailLayout
      backHref="/kyc"
      backLabel="Back to KYC queue"
      title={kycCase.customerName}
      subtitle={
        <>
          <span className="mono">{kycCase.id}</span> · <StatusBadge value={kycCase.status} />{" "}
          <StatusBadge value={kycCase.riskLevel} />
        </>
      }
      actions={<ActionBar actions={actions} onSubmit={runAction} />}
      main={
        <>
          <Card title="Customer information">
            <FieldList
              fields={[
                { label: "Name", value: kycCase.customerName },
                { label: "Email", value: kycCase.customerEmail },
                { label: "Country", value: kycCase.customerCountry },
                { label: "Account opened", value: formatDate(kycCase.accountOpenedAt) },
                { label: "Submitted", value: formatDate(kycCase.submittedAt) },
                { label: "Assigned reviewer", value: kycCase.assignedReviewerName },
              ]}
            />
          </Card>

          <Card title="Risk assessment">
            <p>
              Risk level: <StatusBadge value={kycCase.riskLevel} />
            </p>
            <ul className="flagList">
              {kycCase.riskFlags.map((flag) => (
                <li key={flag}>{flag}</li>
              ))}
            </ul>
          </Card>

          <Card title="Document verification">
            <table className="table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Status</th>
                  <th>Checked</th>
                </tr>
              </thead>
              <tbody>
                {kycCase.documents.map((doc) => (
                  <tr key={doc.type}>
                    <td>{doc.type}</td>
                    <td>
                      <StatusBadge value={doc.status} />
                    </td>
                    <td>{doc.checkedAt ? formatDateTime(doc.checkedAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      }
      side={
        <Card title="Review history">
          <AuditTrail events={data.auditEvents} />
        </Card>
      }
    />
  );
}
