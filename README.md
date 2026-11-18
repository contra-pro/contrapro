# ContratPro — Development foundation

Development bootstrap for a multi-tenant Moroccan car-rental SaaS. Every page is a
public development placeholder. There is no authentication or tenant protection
yet. Do not enter real agency, customer or platform data.

## Requirements and setup

- Node.js 24.x (reference version in `.node-version`: 24.15.0).
- npm 11.x (reference version: 11.12.1).
- No environment variables, database, Docker or provider account required.

From the workspace root:

```powershell
npm ci --cache .npm-cache
npm run dev
```

Open http://127.0.0.1:3000/fr/app or http://127.0.0.1:3000/ar/app.
Development and production start commands bind to loopback by default.

## Reproducible verification

```powershell
npm run verify
npm run test:smoke
```

`verify` runs TypeScript route generation/checks, ESLint (zero warnings), unit tests
and the production build, sequentially. `test:smoke` starts the built server on
loopback port 3217, checks all six localized placeholders, root redirect, invalid
routes and actual response security/cache headers, then stops it. Port 3217 must
be free. Run the build before the smoke test.

For individual checks: `npm run typecheck`, `npm run lint`, `npm test`,
`npm run build`. SQL/schema checks alone: `npm run test:sql`.
Type checks, lint and tests now cover both web and database workspaces.
Migration orchestration tests alone: `npm run test:runner`. They use doubles,
not a database. `npm run verify:clean-install` checks the lockfile in a new isolated
directory and never removes the root dependencies or stops unrelated processes.
To inspect the production build manually: `npm start`.
The lockfile pins the dependency graph; update it intentionally using npm.
Next.js anonymous telemetry can be disabled with `NEXT_TELEMETRY_DISABLED=1`.

## Routes

| Area | French | Arabic |
| --- | --- | --- |
| Agency | `/fr/app` | `/ar/app` |
| Platform | `/fr/platform` | `/ar/platform` |
| Public signing placeholder | `/fr/sign` | `/ar/sign` |

The root redirects to `/fr/app`; unsupported locale paths return 404.
Language links retain the current area. Arabic sets `lang=ar` and `dir=rtl` on
the HTML root; CSS uses logical properties. UI strings are checked dictionaries.

## Structure and boundaries

See [architecture](docs/architecture.md) for module and security boundaries.
`apps/web` is the application workspace. `packages/infrastructure/database` adds
offline schema, SQL drafts and database tooling; it never opens a connection on
import or during verification. A guarded operational migration CLI was added in
P1.2B-1R; do not invoke its apply action without separate authorization. Other
packages/workers remain documentation-only.
See [database foundation](docs/database-foundation.md) and the
[migration review guide](packages/infrastructure/database/migrations/README.md).
Project `.npmrc` disables dependency lifecycle scripts; installation requires no
database access. Future required lifecycle scripts must be reviewed individually.

The pre-existing root JSON files and `projects/` directory are unrelated workspace
artifacts and were preserved. They are not application source or public assets.

## P1.2A — Offline database foundation

Drizzle/PostgreSQL types, explicit SQL drafts, restricted role design, forced RLS,
composite tenant foreign keys and offline security-contract tests are included.
No database resources, connection, migration execution, credentials or authentication
are included. Static tests are not PostgreSQL tenant-isolation proof.

Next recommended slice: **P1.2B**, after explicit authorization, validates the drafts
and transaction wrapper against an explicitly approved isolated PostgreSQL development
target with synthetic fixtures. See the exact proposed scope in
[database foundation](docs/database-foundation.md#p12b-proposed-scope).
The web routes remain the original public P1.1 placeholders. Platform MFA,
authentication, business workflows, signing and PWA installation remain future work.
