import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

/**
 * Bootstraps the very first Super Administrator, purely from env vars —
 * never a hardcoded/invented email or password (see the engineering
 * instruction's "never invent... credential/configuration value" rule).
 * A no-op unless SEED_SUPER_ADMIN_EMAIL and SEED_SUPER_ADMIN_PASSWORD are
 * both set, and unless already run (safe to re-run).
 *
 * Deliberately does NOT skip MFA enrollment for this account — the role
 * is created PENDING_MFA like any other; the operator logs in with these
 * credentials once and completes TOTP setup via POST /roles/mfa/setup +
 * /roles/mfa/enroll-verify, same as every other privileged account.
 */
async function seedBootstrapSuperAdmin() {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL;
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log("SEED_SUPER_ADMIN_EMAIL/PASSWORD not set — skipping bootstrap admin seed.");
    return;
  }

  const existing = await prisma.userRole.findFirst({ where: { role: "SUPER_ADMINISTRATOR" } });
  if (existing) {
    console.log("A Super Administrator already exists — skipping bootstrap admin seed.");
    return;
  }

  const passwordHash = await argon2.hash(password);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash },
  });

  await prisma.userRole.upsert({
    where: { userId_role: { userId: user.id, role: "SUPER_ADMINISTRATOR" } },
    update: {},
    create: { userId: user.id, role: "SUPER_ADMINISTRATOR", status: "PENDING_MFA" },
  });

  console.log(`Bootstrap Super Administrator ready: ${email} (must complete MFA setup on first login).`);
}

// Only seeds data that has been explicitly confirmed with the client (see
// docs/brand-assets and the plan's Open Questions) — never invented content,
// per the "never invent TCM ... social URLs" rule in the engineering
// instruction. Extend this file as more values are confirmed.
async function main() {
  await seedBootstrapSuperAdmin();

  await prisma.socialLink.upsert({
    where: { id: "instagram-official" },
    update: {
      url: "https://www.instagram.com/thecorporatemuslimah/",
      isActive: true,
    },
    create: {
      id: "instagram-official",
      platform: "instagram",
      url: "https://www.instagram.com/thecorporatemuslimah/",
      order: 0,
      isActive: true,
    },
  });

  await prisma.socialLink.upsert({
    where: { id: "x-official" },
    update: {
      url: "https://x.com/TCM_FOUNDATION",
      isActive: true,
    },
    create: {
      id: "x-official",
      platform: "x",
      url: "https://x.com/TCM_FOUNDATION",
      order: 1,
      isActive: true,
    },
  });

  await prisma.socialLink.upsert({
    where: { id: "linkedin-official" },
    update: {
      url: "https://www.linkedin.com/company/the-corporate-muslimah-foundation/",
      isActive: true,
    },
    create: {
      id: "linkedin-official",
      platform: "linkedin",
      url: "https://www.linkedin.com/company/the-corporate-muslimah-foundation/",
      order: 2,
      isActive: true,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
