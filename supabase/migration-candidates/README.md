# Offline migration candidates

`d2-native-synthetic-v1` contains new native-test derivatives for logical 0013–0028, with a pinned manifest. These files are not managed release migrations and are not referenced by the application's or historical four-file migration runner. Do not copy them into supabase/migrations or run them against the development Supabase project.

See [D2 report](../../docs/d2-offline-migration-preparation.md), [per-version contracts](../../docs/d2-candidate-contracts.md) and [native acceptance plan](../../docs/d2-native-postgresql-acceptance-plan.md).

The offline compiler reads original, SHA-256-bound drafts; it does not execute SQL or connect. `node scripts/d2-offline/candidates.mjs --check` verifies reproducibility without changing files. `--write` creates a new absent package and refuses collisions. `--refresh-owned` is for local preparation edits only: it refuses unexpected files, non-native packages or altered candidate bytes before updating this compiler-owned, unapproved package. It is not an execution/retry or historical migration rewriting mechanism.

All native execution, fixture provisioning, new role/database creation and cleanup still require separate authorization and a reviewed private operator harness. Historical 0008/0009 provenance remains unresolved. Native test gates require the dedicated loopback PG17.11/TLS target and refuse the managed database/port.
