# Development A02 identity baseline — operator procedure

Prepared offline; no inventory has been executed and no A/B/U existence is assumed.
`scripts/inventory-a02-identities.sql` reads exactly three operator-nominated UUIDs.
It cannot discover synthetic users: the schema has no trusted A/B/U/synthetic marker.
Never nominate customer/unknown accounts, search by email or scan the population.

## Exact tables and interpretation

| Requirement | Source |
| --- | --- |
| Auth identity exists | auth.users.id, referenced by migration 0004 lines 17–20 |
| Canonical mapping | identity.supabase_users.supabase_user_id / user_id, migration 0004 lines 17–20 |
| Canonical state | identity.users.id / state, migration 0001 lines 31–35 |
| Any memberships | tenancy.memberships.user_id, migration 0001 lines 45–55 |

No need to read Auth credentials, emails, metadata or profile fields, nor agency
names or other personal data. All membership states count, including revoked:
A02 requires no memberships at all. Existence in auth.users alone is not proof of
an authenticated/non-anonymous usable session or of synthetic account ownership.

The only row inputs are three UUIDs privately matched to operator-owned synthetic
accounts through existing non-secret operator records. They are tentative A/B/U
nominations, not the deterministic mock UUIDs from offline tests. UUIDs are used as
lookup keys only and are never selected for display. Output contains only A/B/U
labels, booleans, fixed classification strings and the snapshot timestamp.

Classification distinguishes AUTH_NOT_FOUND, UNMAPPED,
MAPPED_ACTIVE_NO_MEMBERSHIPS, MAPPED_INACTIVE_NO_MEMBERSHIPS,
MAPPED_WITH_MEMBERSHIPS and MAPPING_INVALID_FOR_COHORT. canonical_active separately
reports the state for mapped users with memberships. Candidate canonical IDs equal
to any nominated Auth subject are rejected for A/B cohort eligibility. The shared
all_three_ready field also requires distinct A/B canonical users.

## Execution prerequisites and exact command

This command is for a separately authorized operator, not executed in preparation.
Use the existing verified PostgreSQL 17 psql and trusted CA in the credential-bearing
PowerShell session. Do not put passwords in argv, URLs, files, transcripts or chat.
Do not substitute a new/unverified CA. The runbook's current confirmed Development
session-pooler route is used; a shared host or SQL session_user is not independent
project identity proof. Reconfirm the pinned project in the accepted Control Plane
evidence before opening the connection. The old deployment manifest's pre-deploy
history fields are not a new inventory prerequisite or current live assertion.

Supply `$a02AuthA`, `$a02AuthB`, `$a02AuthU` from the operator's existing synthetic
inventory, `$psql17` as the already verified executable path, and `$ca0007` as the
already verified CA path. These are prerequisites, not values invented here.
Run at `C:\Users\lenovo\contratpro`:

```powershell
if (-not $env:PGPASSWORD) { throw 'Use the credential-bearing operator session' }
if (-not (Test-Path -LiteralPath $psql17 -PathType Leaf)) { throw 'Verified psql 17 path required' }
if (-not (Test-Path -LiteralPath $ca0007 -PathType Leaf)) { throw 'Verified CA path required' }
if (-not $a02AuthA -or -not $a02AuthB -or -not $a02AuthU) { throw 'Three existing synthetic nominations required' }
$env:PGHOST = 'aws-0-eu-west-1.pooler.supabase.com'
$env:PGPORT = '5432'
$env:PGDATABASE = 'postgres'
$env:PGUSER = 'postgres.gllsiklbvqpxzucvkehw'
$env:PGSSLMODE = 'verify-full'
$env:PGSSLROOTCERT = $ca0007
$env:PGCONNECT_TIMEOUT = '10'
# Eliminate alternate host/service routing and inherited psql echo/output options.
Remove-Item Env:PGHOSTADDR,Env:PGSERVICE,Env:PGSERVICEFILE,Env:PGOPTIONS -ErrorAction SilentlyContinue
& $psql17 -X -w -v ON_ERROR_STOP=1 -v development_project_ref=gllsiklbvqpxzucvkehw -v "candidate_a=$a02AuthA" -v "candidate_b=$a02AuthB" -v "candidate_u=$a02AuthU" -f scripts/inventory-a02-identities.sql
if ($LASTEXITCODE -ne 0) { throw 'Inventory blocked; do not repair or retry automatically' }
```

No fallback to verify-ca/insecure TLS. libpq verifies the trusted certificate and
hostname; SQL does not independently attest the frontend TLS handshake. The SQL
requires postgres database/session role, PostgreSQL 17, non-recovery, read-only
transaction and superuser/BYPASSRLS visibility so RLS filtering cannot simulate
missing identities or memberships. No role changes or grants are attempted. Each
statement <=5 seconds, lock wait <=2 seconds, idle transaction <=10 seconds. All
queries are SELECT; transaction configuration is SET LOCAL; final ROLLBACK. Invalid
input/guard errors stop via ON_ERROR_STOP. No bridge/provisioning/Auth RPC is called.

## Expected sanitized output and decisions

An illustrative eligible result (not actual Development evidence) is:

```text
candidate auth_exists mapping_exists canonical_active membership_present inventory_state                   eligible_for_nominated_role all_three_ready snapshot_at_utc
A         t           t              t                f                  MAPPED_ACTIVE_NO_MEMBERSHIPS       t                           t               <snapshot time>
B         t           t              t                f                  MAPPED_ACTIVE_NO_MEMBERSHIPS       t                           t               <snapshot time>
U         t           f              NULL             NULL               UNMAPPED                           t                           t               <snapshot time>
```

If Auth is absent, mapping inactive/invalid, or any membership exists, the candidate
is ineligible. No user is created, mapped, activated, repaired or detached. Exit 0
means the inventory completed, not that all_three_ready is true. Preserve the three
sanitized rows/time and the private logical-label-to-ID record for A02 review.

Select A/B only when active/distinct and membership-free; select U only when Auth
exists and mapping is absent. Do not export tokens to establish this baseline.
If nominations are unsuitable, only nominate different already-known synthetic
accounts under the same approved bounded scope. If no such accounts exist, STOP:
establishing the cohort requires a separately authorized synthetic-user/mapping
procedure; it is outside this inventory and is not implied by provisioning being
deployed. Provisioning remains OFF and authenticated provisioning EXECUTE denied.

## Remaining blockers

An operator-owned list of three known synthetic Auth IDs is still required. Without
that list there is no privacy-safe general discovery query in this package. A
successful inventory does not obtain sessions, prove session freshness, or supply
the secure in-memory bootstrap, pinned HTTPS transport and independent no-change
observer identified in a02-readiness.md. No live inventory/TLS/project verification
has been performed by this preparation.

## Offline validation

```powershell
node --test scripts/a02-identity-inventory.test.mjs
npm exec -- eslint --config apps/web/eslint.config.mjs --rule "@next/next/no-html-link-for-pages:off" scripts/a02-identity-inventory.test.mjs --max-warnings=0
```

Six static security-contract tests pass; targeted ESLint passes. These check
read-only statement restrictions, bounds, safe nominations, tenant-scoped lookups,
sanitized projection and eligibility conditions. They do not parse/execute SQL or
prove live permissions, RLS visibility, identity existence or TLS. No SQL/HTTP,
credentials, user creation, gates, grants or deployment were used in preparation.
