# Internal Operations Console (Prototype)

A small Next.js app showing how an engineering team can build a **portfolio** of internal fintech tools
with normal application code instead of a no-code builder.

Four workflows share one set of primitives:

- **KYC Reviews** — queue of verification cases with risk flags and documents; approve / reject / escalate /
  reassign, each requiring a reason. High-risk cases and escalated cases need a Manager.
- **Refunds** — approve or deny refund requests; amounts over $500 need a Manager.
- **Feature Flag Admin** — enable, disable or schedule feature flags per environment; analysts can request a
  change, production changes need a Manager.
- **Tool Requests** — ops describes the next internal tool they need and a Manager hands it to Devin via the
  Devin API, which builds it in this repo's conventions and opens a pull request.

Plus a cross-workflow **Audit Log**: every action is recorded with actor, timestamp, action and reason.

The second workflow cost ~300 lines and no changes to any shared component — that ratio is the point.

## Run it

Requires Node 20+.

```bash
npm install
npm run dev          # http://localhost:3000
```

`data/console.db` (SQLite) is created and seeded on the first request. Switch between seeded Analysts and
Managers with the **Acting as** selector in the top right.

```bash
npm run db:reset     # wipe the local database; it re-seeds on next start
npm run build && npm start
npm run lint
```

Optional: to actually dispatch a tool request to Devin, copy `.env.example` to `.env.local` and set
`DEVIN_API_KEY`. Everything else works without it.

## How it is put together

```
app/
  kyc/ refunds/ flags/          one directory per workflow (queue page + detail page)
  tools/ audit/
  api/                          HTTP boundary: thin route handlers only
components/                     DataTable, FilterBar, DetailLayout, ActionBar, AuditTrail, StatusBadge
lib/
  services/                     business rules, authorization, audit writes, data access
  auth/permissions.ts           role → permission map, single source of truth
  client/                       apiClient, session/role context, useResource
  devin/client.ts               server-side Devin API client
  db.ts, seed.ts                SQLite schema and seeded fake data
```

Layering is **page → apiClient → HTTP route → service → SQLite**, with three rules:

1. Components never import data — the only way to a record is `lib/client/apiClient.ts`.
2. Route handlers hold no business logic; they resolve the actor and map errors to status codes.
3. Services own the rules, so permission checks and audit writes happen where the data changes and cannot be
   bypassed from the browser.

That makes the service layer the seam to reality: pointing the UI at existing KYC/refunds REST services means
rewriting those functions (or `NEXT_PUBLIC_API_BASE_URL`), not the UI.

Adding a fourth tool is: one service module, two route handlers, a queue page, a detail page, and a couple of
permission strings. Presentation, role gating and auditing come for free.

## Roles

| Capability | Analyst | Manager |
| --- | --- | --- |
| View queues, cases and the audit log | yes | yes |
| Approve / reject / escalate standard KYC cases | yes | yes |
| Approve a **HIGH** risk KYC case (analysts may still reject or escalate) | no | yes |
| Act on an **escalated** KYC case, reassign ownership | no | yes |
| Approve refunds above $500 | no | yes |
| Request a feature flag change | yes | yes |
| Enable / disable / schedule a feature flag | no | yes |
| Change a **production** feature flag | no | yes |
| Draft a tool request | yes | yes |
| Send a tool request to Devin | no | yes |

## Not production-ready

A demonstration prototype — do not deploy as-is. Identity is mocked (the acting user is a dropdown sent as an
`x-actor-id` header, no SSO), there is no real KYC vendor, payment processor or ledger behind it, and state
lives in a single-process SQLite file of seeded fake data.

Also missing: pagination, sorting and concurrency control; meaningful test coverage; accessibility and mobile
polish. Before production you would add real SSO/OIDC, a reviewed authorization model with per-record scoping
and maker-checker rules, authenticated integrations with timeouts/retries/idempotency and PII handling,
append-only audit storage with retention, observability, CI/CD and migrations, and a security/compliance review.
