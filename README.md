# Internal Operations Console (Prototype)

A ~2-hour prototype showing how a small engineering team can build and evolve a **portfolio** of internal
fintech tools with normal application code, instead of a no-code builder.

It implements a **KYC Review Queue** end to end, plus a deliberately thin second workflow (**Refund
Requests**) that reuses the same primitives — the point being that the second tool costs a few hundred
lines, not a new platform.

## What it demonstrates

- Structured business data in queues and detail views (tables, search, filters, forms)
- Business actions and simple workflows (approve / reject / escalate / reassign, each with a required reason)
- Role capabilities are centrally defined and authorization is enforced server-side in the business service layer (Analyst vs Manager)
- Auditability: every state change writes an audit event (actor, timestamp, action, reason)
- A real API/service boundary — the UI never imports data or DB code
- Reuse: a second workflow built from the same table / filter / detail / action / audit primitives
- Low marginal effort to add the next internal tool

## Install and run

Requires Node 20+.

```bash
npm install
npm run dev          # http://localhost:3000
```

The SQLite file is created and seeded automatically on first request at `data/console.db`.

```bash
npm run db:reset     # delete the local database; it is re-seeded on next start
npm run build        # production build
npm run lint
```

Use the **Acting as** selector in the top-right to switch between seeded Analysts and Managers.

## Architecture

```
app/
  kyc/            KYC queue + case detail (workflow 1)
  refunds/        Refund queue + request detail (workflow 2)
  audit/          Cross-workflow audit log
  api/            HTTP boundary: thin route handlers only
components/       Shared UI primitives (DataTable, FilterBar, DetailLayout, ActionBar, AuditTrail, StatusBadge)
lib/
  services/       Business logic + data access (kyc, refunds, audit, users)
  auth/           Role → permission model, single source of truth
  client/         apiClient, session/role context, useResource hook
  db.ts, seed.ts  SQLite schema and seeded fake data
```

Layering: **page → apiClient → HTTP route → service → SQLite**. Components never touch the database or
seed data; route handlers contain no business rules; services own validation, authorization and auditing.

## Shared internal-tool primitives

| Primitive | Location | Reused by |
| --- | --- | --- |
| `DataTable` (queue presentation) | `components/DataTable.tsx` | KYC, Refunds, Audit log |
| `FilterBar` (search + select filters) | `components/FilterBar.tsx` | KYC, Refunds, Audit log |
| `DetailLayout` / `Card` / `FieldList` | `components/DetailLayout.tsx` | KYC case, Refund request |
| `ActionBar` (action + mandatory reason dialog) | `components/ActionBar.tsx` | KYC case, Refund request |
| `StatusBadge` (status/risk chips) | `components/StatusBadge.tsx` | all workflows |
| `AuditTrail` | `components/AuditTrail.tsx` | KYC case, Refund request |
| Permission model (`can`, `requirePermission`) | `lib/auth/permissions.ts` | all services, all screens |
| Audit service (`recordAuditEvent`) | `lib/services/audit.ts` | all workflows |
| Request/response + error mapping | `lib/api/server.ts` | all API routes |
| Data loading (`useResource`) | `lib/client/useResource.ts` | all screens |

Adding a third internal tool means: a table + service in `lib/services`, two route handlers, one queue page
and one detail page — the presentation, permission, and audit behaviour come for free. These abstractions
were extracted because two workflows actually needed them; nothing here is a generic framework.

## API / service boundary

- The UI calls `lib/client/apiClient.ts` only. It is the single place that knows how business data is fetched.
- `apiClient` targets `NEXT_PUBLIC_API_BASE_URL` (default `/api`), so the local implementation can be pointed
  at an existing KYC or refunds REST service without touching a component.
- Route handlers under `app/api/**` are thin: resolve the actor, call a service, map errors to status codes.
- Services in `lib/services/**` are the seam: swapping SQLite for HTTP calls to a real backend means
  rewriting those functions and nothing else.

Endpoints:

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/users` | Seeded users for the role switcher |
| GET | `/api/kyc-cases?search=&status=&risk=` | KYC queue |
| GET | `/api/kyc-cases/:id` | Case + its audit trail |
| POST | `/api/kyc-cases/:id/actions` | `APPROVE` / `REJECT` / `ESCALATE` / `REASSIGN` |
| GET | `/api/refunds?search=&status=` | Refund queue |
| GET | `/api/refunds/:id` | Request + its audit trail |
| POST | `/api/refunds/:id/actions` | `APPROVE` / `DENY` |
| GET | `/api/audit-events` | Cross-workflow audit log |

## Roles

| Capability | Analyst | Manager |
| --- | --- | --- |
| View queues and cases | yes | yes |
| Approve / reject / escalate standard KYC cases | yes | yes |
| Act on an **escalated** KYC case | no | yes |
| Reassign case ownership | no | yes |
| Review refunds | yes | yes |
| Approve refunds above $500 | no | yes |

Permissions are declared once in `lib/auth/permissions.ts` and enforced in the services (server-side);
the UI uses the same `can()` helper to disable buttons and explain why.

## What is mocked

- **Identity**: no SSO/auth. The acting user is chosen in a dropdown and sent as an `x-actor-id` header.
- **Backend systems**: no real KYC vendor, payment processor or ledger. Cases, refunds, risk flags and
  document checks are seeded fake data in local SQLite.
- **Persistence**: a local SQLite file, seeded on first run; deleting `data/` resets everything.
- **Workflow depth**: statuses change immediately; there are no SLAs, queues, notifications or approvals chains.

## This is not production-ready

This is a demonstration prototype, not a production system. Do not deploy it as-is.

### Production considerations

- **Identity**: real SSO/OIDC, session management, service-to-service auth; drop the `x-actor-id` header.
- **Authorization**: security review of the permission model, per-record/tenant scoping, segregation of duties
  and maker-checker rules; permission tests as first-class test cases.
- **Data integration**: replace SQLite with the real KYC/refunds services over authenticated APIs, with
  timeouts, retries, idempotency keys and PII handling (encryption at rest/in transit, field-level masking).
- **Auditability**: append-only, tamper-evident audit storage with retention policy and export for compliance.
- **Observability**: structured logging, metrics, tracing, alerting on failed actions and queue backlogs.
- **Deployment**: CI/CD, migrations, environment configuration/secrets management, backups and DR.
- **Compliance/security**: threat model, pen test, access reviews, data residency, SOC 2 / regulatory review.
- **Quality**: automated test coverage (unit tests for services and permissions, e2e for critical flows),
  accessibility review, error/loading state hardening.

## Limitations

- No pagination, sorting, bulk actions, or optimistic concurrency; queues assume small datasets.
- No real validation of documents, sanctions lists, or risk scoring — risk flags are static seed data.
- Audit log page filters client-side and is capped at the most recent 200 events.
- Minimal test coverage by design; verification for this prototype was manual.
- Styling is intentionally plain; limited mobile responsiveness; no design system.
- SQLite writes are single-process — fine for a demo, not for concurrent reviewers.
