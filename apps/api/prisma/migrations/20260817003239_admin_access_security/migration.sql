-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'ROLE_ASSIGNMENT_EXPIRED';
ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_LOGIN_SUCCEEDED';
ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_LOGIN_FAILED';
ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_LOGOUT';
ALTER TYPE "AuditAction" ADD VALUE 'MFA_VERIFICATION_SUCCEEDED';
ALTER TYPE "AuditAction" ADD VALUE 'MFA_VERIFICATION_FAILED';
ALTER TYPE "AuditAction" ADD VALUE 'AUTHORIZATION_DENIED';

-- AlterEnum
ALTER TYPE "UserRoleStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mfaFailedAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mfaLockedUntil" TIMESTAMP(3);
