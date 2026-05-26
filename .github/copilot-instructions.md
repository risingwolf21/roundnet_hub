# Copilot instructions — roundnet_karlsruhe_app

Purpose: Give Copilot sessions the essential commands, architecture overview, and repo-specific conventions needed to make accurate changes or suggestions.

---

## Build, test, and lint (commands)
- Install: `yarn install`
- Dev server: `yarn start`  (alias: `yarn start:staging`)
- Start for tenant (local prod-mode): `yarn start:rk:prod` (Karlsruhe), `yarn start:mrc:prod` (Munich)
- Build: `yarn build` / per-tenant: `yarn build:karlsruhe` / `yarn build:munich`
- Preview build: `yarn preview`

- Unit tests (Vitest):
  - Run all: `yarn test` or `npx vitest`
  - Run single test file: `npx vitest run src/tests/profileCreation.test.tsx`
  - Run tests matching name: `npx vitest -t "namePattern"`

- E2E tests (Jest + selenium):
  - Run all e2e: `npx jest --config jest.config.js`
  - Run single e2e file: `npx jest e2e/pages/login.test.ts --config jest.config.js`
  - The e2e driver uses `e2e/config/driver.ts`; CI runs in headless mode when `process.env.CI` is set.

- Linting: ESLint is configured via `eslint.config.js` but no npm script. Run manually:
  - `npx eslint "src/**/*.{ts,tsx}" --ext .ts,.tsx --config eslint.config.js`

- Formatting: `yarn format` (Prettier)

- Supabase type generation (must run after schema changes):
  - `yarn gen-types:local` / `yarn gen-types:staging` / `yarn gen-types:production` / `yarn gen-types:custom`

---

## High-level architecture (short)
- Frontend: React 19 + TypeScript + Vite. Entry: `src/index.tsx` → `src/App.tsx` → `src/AppRoutes.tsx`.
- Feature-first layout: `src/features/*` contains domain features (events, games, drinks, admin).
- Data access layer: `src/repository/*` contains Repositories that wrap Supabase queries/mutations.
- Client state/fetching: TanStack (React Query) code lives under `src/tanstack/` (queries, persistence). Repositories are used by features/queries.
- Types: Supabase-generated types are in `src/types/supabase-generated.types.ts` (regenerate after migrations).
- Multi-tenant theming: tenant-specific modes and themes (Karlsruhe vs Munich) — see `environments/` and `src/theme/*`.
- Backend: Supabase (Postgres + Edge Functions in `supabase/functions/` using Deno). CI/hosting via GitHub Actions + Firebase Hosting.
- PWA: service worker + workbox plugin present (`src/service-worker.ts`, `vite` PWA plugin).

---

## Key conventions & patterns
- Repository pattern: files named `*Repository.ts` under `src/repository/` encapsulate direct DB/HTTP calls. Avoid duplicating low-level Supabase logic elsewhere.
- TanStack organization: domain-specific queries live in `src/tanstack/*` and are the source-of-truth for cache keys and hooks consumed in features.
- Generated types: keep `src/types/supabase-generated.types.ts` in sync. Use `yarn gen-types:*` when schema changes.
- Component naming: components built with the shadcn toolkit often carry suffix `.shadcn.tsx` (search for `.shadcn.tsx` files).
- Feature modules: self-contained under `src/features/<feature>/` with pages, dialogs, and subcomponents. Prefer adding UI only inside that folder for that feature.
- Env & modes: Vite modes are used to select tenants (`--mode karlsruhe`, `--mode munich`, `--mode staging`). Use `environments/*.env*` files to mirror production/staging credentials (do not commit `.local` files).
- Tests:
  - Unit tests in `src/tests/` use Testing Library + Vitest.
  - E2E tests in `e2e/` use Jest + selenium-webdriver; the helper `e2e/config/driver.ts` centralizes browser setup.
- CI/Deployment: GitHub Actions build both tenants and deploy to Firebase. Source maps uploaded to Sentry on deploy.

---

## Files/places of interest for automated assistants
- App entry & routes: `src/index.tsx`, `src/App.tsx`, `src/AppRoutes.tsx`
- Data/repository layer: `src/repository/*`
- TanStack queries & hooks: `src/tanstack/*`, `src/hooks/*`
- Supabase edge functions: `supabase/functions/`
- Env templates: `environments/` (contains `.env.*` files used in scripts)
- Tests: `src/tests/` (unit), `e2e/` (integration/e2e)
- Typegen script: `scripts/generate-types.ts` and package.json `gen-types:*` scripts

---

Keep this file focused and update it when adding new automation (e.g., adding `lint` npm script, switching test runner, or adding a new MCP server).
