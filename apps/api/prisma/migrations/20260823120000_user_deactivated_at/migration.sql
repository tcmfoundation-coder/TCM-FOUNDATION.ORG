-- Staff account lifecycle: soft deletion plus its audit vocabulary.
--
-- Entirely additive. The new column is nullable with no default, so every
-- existing row stays active and nothing is backfilled; the enum gains values
-- and loses none, so existing AuditLog rows keep their meaning. Nothing here
-- can lose or rewrite data.
--
-- Postgres 12+ permits multiple ADD VALUE statements per migration. The CI and
-- Railway databases both run postgres:16.

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'USER_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'USER_DEACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'USER_REACTIVATED';

-- AlterTable
-- Deactivation is a soft delete: AuditLog references actors by id, so the row
-- has to survive for the administrative history to stay readable.
ALTER TABLE "User" ADD COLUMN     "deactivatedAt" TIMESTAMP(3);
