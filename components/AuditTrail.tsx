"use client";

import { ROLE_LABELS } from "@/lib/auth/permissions";
import { formatDateTime } from "@/lib/format";
import type { AuditEvent } from "@/lib/types";

/** Shared rendering of the audit trail; works for any entity type. */
export function AuditTrail({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) return <p className="muted">No audit events yet.</p>;
  return (
    <ol className="timeline">
      {events.map((event) => (
        <li key={event.id}>
          <div className="timelineHead">
            <strong>{event.action.replace(/_/g, " ").toLowerCase()}</strong>
            <span className="muted">{formatDateTime(event.createdAt)}</span>
          </div>
          <div className="muted">
            {event.actorName} · {ROLE_LABELS[event.actorRole] ?? event.actorRole}
          </div>
          <p className="timelineReason">{event.reason}</p>
        </li>
      ))}
    </ol>
  );
}
