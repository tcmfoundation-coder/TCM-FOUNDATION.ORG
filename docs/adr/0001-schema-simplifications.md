# ADR 0001: Two simplifications from the blueprint's conceptual DB model

**Status**: Accepted
**Date**: 2026-08-16

## Context

The Master Project Blueprint (section 14) lists a conceptual V1 data model and
explicitly says it "is not yet the final Prisma schema." Authoring the real
schema (Phase 1) surfaced two places where following the conceptual list
literally would add complexity with no V1 requirement behind it.

## Decision 1 — Role/Permission modeled as a closed enum, not dynamic tables

The blueprint lists `Role` and `Permission` as separate entities, which would
imply a dynamic RBAC system (create/edit arbitrary roles and permissions).
V1 has exactly four fixed roles (Public Visitor — anonymous, not stored;
Content Editor; Administrator; Super Administrator), and no V1 feature asks
for an admin UI to define new roles or permissions.

Implemented instead as a `PrivilegedRole` enum plus a `UserRole` join table
carrying assignment/activation/revocation state (see `apps/api/prisma/schema.prisma`).
If a real requirement for dynamic roles/permissions appears later, that is a
migration to add `Role`/`Permission` tables — not a V1 concern.

## Decision 2 — TeamMember and BoardMember consolidated into one model

The blueprint lists `TeamMember` and `BoardMember` as separate entities, but
every V1 requirement (About Us: "Team, Board, Advisory members"; Admin CMS:
"Manage Team", "Manage Board/Advisory profiles") describes an identical shape:
name, title/role, bio, photo.

Implemented as a single `TeamMember` model with a `kind` enum
(`TEAM` | `BOARD` | `ADVISORY`). The admin CMS still presents Team, Board,
and Advisory as separate managed lists by filtering on `kind` — the
consolidation is a schema simplification, not a product/UX change.

## Consequence

Both are reversible: splitting `TeamMember` back into two models, or adding
`Role`/`Permission` tables, are additive migrations if a future requirement
needs them. Nothing in the V1 API or frontend contract depends on the
internal table split either way.
