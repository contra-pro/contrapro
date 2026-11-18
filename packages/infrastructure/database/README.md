# Database foundation — offline P1.2A

This is a server-side tooling workspace. Normal imports open no connections and
the web application remains disconnected. No credentials, authentication or business
workflows are provided. P1.2B-1R adds a guarded operational migration CLI; only an
explicit approved apply invocation can load its driver and construct a client.
It has NOT been invoked against a database during offline development.

From the repository root:

```powershell
npm ci --cache .npm-cache
npm run verify
npm run test:sql
npm run test:runner
```

Dependency lifecycle scripts are disabled by the root `.npmrc`. Package versions
are exact and the root lockfile owns both workspaces. WASM parsing uses bundled
assets; tests do not start PostgreSQL, containers or external services.

- `src/schema.ts`: Drizzle tables, constraints, indexes and RLS enablement metadata.
- `src/tenant-transaction.ts`: injected database transaction wrapper; no client creation.
- `src/index.ts`: `server-only` package entry, never a Client Component import.
- `migrations/drafts/`: ordered SQL requiring review and later authorization.
- `tests/`: schema/SQL contracts and transaction-wrapper unit tests.
- `drizzle.config.ts`: offline generation configuration only, no connection settings.
- `src/migrations/`: manifest/checksums, fail-closed configuration, journal/lock SQL
  and injected-connection runner. These modules open no connection on import.
- `scripts/migrate.ts`: operational CLI, not exported through the package entry.

The Drizzle configuration is deliberately not a migration runner. Any future
generated `.generated/` output is review material, not a substitute for the manual
security drafts. FORCE RLS, functions, roles, grants and default privileges must
remain explicit. There is no Drizzle push/migrate/studio command.

Do not run `migrations:apply` without separate connected-testing authorization.
See [execution model and future invocation](../../../docs/migration-execution.md),
[restricted logins](../../../docs/database-role-strategy.md), and the approved
[trusted server SQL boundary](../../../docs/tenant-sql-trust-boundary.md).

See [foundation design](../../../docs/database-foundation.md) and
[migration ordering/recovery](migrations/README.md).
