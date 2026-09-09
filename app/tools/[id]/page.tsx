"use client";

import { ActionBar, type ActionDefinition } from "@/components/ActionBar";
import { AuditTrail } from "@/components/AuditTrail";
import { Card, DetailLayout, FieldList } from "@/components/DetailLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/client/apiClient";
import { useSession } from "@/lib/client/session";
import { useResource } from "@/lib/client/useResource";
import { formatDateTime } from "@/lib/format";
import type { AuditEvent, ToolRequest } from "@/lib/types";

export default function ToolRequestDetailPage({ params }: { params: { id: string } }) {
  const { currentUser, can } = useSession();
  const { data, loading, error, refresh } = useResource<{
    toolRequest: ToolRequest;
    auditEvents: AuditEvent[];
  } | null>(
    () => (currentUser ? api.getToolRequest(currentUser.id, params.id) : Promise.resolve(null)),
    [currentUser?.id, params.id],
  );

  if (loading) return <p className="muted">Loading request…</p>;
  if (error) return <p className="errorText">{error}</p>;
  if (!data) return null;

  const toolRequest = data.toolRequest;
  const isDraft = toolRequest.status === "DRAFT";

  const actions: ActionDefinition[] = [
    {
      key: "DISPATCH",
      label: "Send to Devin",
      tone: "primary",
      enabled: can("tools.dispatch") && isDraft,
      disabledReason: isDraft
        ? "Only Managers can hand a request to Devin"
        : "This request has already been sent",
    },
  ];

  async function runAction(_actionKey: string, input: { reason: string }) {
    if (!currentUser) return;
    await api.dispatchToolRequest(currentUser.id, params.id, { reason: input.reason });
    refresh();
  }

  return (
    <DetailLayout
      backHref="/tools"
      backLabel="Back to tool requests"
      title={toolRequest.title}
      subtitle={
        <>
          <span className="mono">{toolRequest.id}</span> · <StatusBadge value={toolRequest.status} />
          {toolRequest.devinStatus && <StatusBadge value={toolRequest.devinStatus.toUpperCase()} />}
        </>
      }
      actions={<ActionBar actions={actions} onSubmit={runAction} />}
      main={
        <>
          <Card title="Request">
            <FieldList
              fields={[
                { label: "What it is for", value: toolRequest.workflowSummary },
                { label: "Records", value: toolRequest.records },
                { label: "Actions and statuses", value: toolRequest.actions },
                { label: "Who can do what", value: toolRequest.roleNotes },
                { label: "Requested by", value: toolRequest.requestedByName },
                { label: "Created", value: formatDateTime(toolRequest.createdAt) },
              ]}
            />
          </Card>

          <Card title="Devin session">
            {toolRequest.devinSessionUrl ? (
              <FieldList
                fields={[
                  {
                    label: "Session",
                    value: (
                      <a href={toolRequest.devinSessionUrl} target="_blank" rel="noreferrer">
                        {toolRequest.devinSessionId}
                      </a>
                    ),
                  },
                  { label: "Status", value: toolRequest.devinStatus ?? "unknown" },
                  {
                    label: "Pull request",
                    value: toolRequest.pullRequestUrl ? (
                      <a href={toolRequest.pullRequestUrl} target="_blank" rel="noreferrer">
                        {toolRequest.pullRequestUrl}
                      </a>
                    ) : (
                      "not opened yet"
                    ),
                  },
                ]}
              />
            ) : (
              <p className="muted">
                Not sent yet. A Manager can hand this request to Devin, which builds it following the
                conventions of the existing workflows and opens a pull request for review.
              </p>
            )}
          </Card>
        </>
      }
      side={
        <Card title="History">
          <AuditTrail events={data.auditEvents} />
        </Card>
      }
    />
  );
}
