# TCM Foundation — V1 Website

Monorepo for The Corporate Muslimah Foundation's public website + admin CMS.

- `apps/web` — Next.js (App Router, TypeScript, Tailwind) public site + admin panel
- `apps/api` — NestJS backend API (PostgreSQL + Prisma, Cloudinary media, Google OAuth + email/password auth with TOTP MFA for privileged roles)
- `packages/shared` — TypeScript enums/constants shared between `web` and `api`

See the project plan for full architecture, scope, and open decisions.

## Development

```bash
npm install
npm run dev:api    # NestJS API
npm run dev:web    # Next.js app
```

Copy `.env.example` in each app to `.env` and fill in local values before running.
