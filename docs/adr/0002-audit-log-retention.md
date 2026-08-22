# ADR 0002: Audit log retention

**Status**: Proposed — retention policy awaits client/legal approval
**Date**: 2026-08-21

## Context

`AuditLog` is append-only by design. `AuditLogService` exposes `record()`,
`list()`, and `getById()` and deliberately has no update or delete method (see
the comment in `audit-log.service.ts`). Every privileged mutation writes a row:
content create/update/delete, login success and failure, MFA events, role
assignment and revocation, and authorization denials.

Two things prompted this ADR during the production-readiness review:

1. The table had already accumulated 864 rows from development and QA activity
   alone. Its growth rate tracks admin activity, which increases as more
   content types and campaigns go live.
2. `list()` always sorts by `createdAt desc`, but no index existed on that
   column.

## Decision 1 — Index `createdAt` (implemented)

Added `@@index([createdAt])` in migration
`20260821110528_add_query_pattern_indexes`. Every audit-log listing orders by
this column, so the index serves the dominant read path.

A composite `(action, createdAt)` was considered and **rejected for now**:
filtering by action is optional and occasional, a second index adds write cost
on the highest-write table in the system, and Postgres cannot use an
`(action, createdAt)` index for the common unfiltered listing anyway. Revisit
if action-filtered views become a routine part of the admin workflow.

## Decision 2 — No automated deletion (implemented: nothing deletes)

Nothing in this change deletes or archives audit data, and no scheduled job was
introduced. The codebase has no job scheduler, and adding one solely for log
pruning would be premature (see the "Do not build a job queue just for this"
constraint in the hardening brief).

The append-only property is retained deliberately: audit history is
security-sensitive evidence, and silent destruction of it is a worse failure
than unbounded growth at this table's current scale.

## Proposed retention strategy — REQUIRES APPROVAL

The following is a recommendation, **not** an implemented policy. It should be
approved by TCM Foundation (as data controller) before anything acts on it,
with input from whoever advises them on data protection.

**Retain indefinitely (never auto-delete):**

- Role assignment, activation, revocation (`ROLE_*`)
- Authorization denials
- Any event recording a change to who holds privileged access

These are the records that answer "who was allowed to do what, and when" — the
questions an audit exists to answer.

**Candidate for archival after a defined window (suggested: 12–24 months):**

- Content create/update/delete events
- Login success/failure and MFA events

"Archival" here means exported to durable cold storage and then removed from the
hot table — not deleted outright.

**Open questions for the client:**

1. Is TCM Foundation subject to a retention obligation (regulatory, funder, or
   insurer) that sets a minimum or maximum period?
2. Who approves the policy, and who is accountable for the archive?
3. Where should archived records live? This depends on the deployment decision,
   which is still open.

## Current status

- `createdAt` indexed: **yes**
- Automated pruning: **none**
- Data deleted by this change: **none**
- Policy approved: **no** — the above is a proposal awaiting client sign-off

Until a policy is approved and implemented, the table grows without bound. At
present volumes that is not a performance concern; it is tracked here so the
decision is made deliberately rather than discovered later.
