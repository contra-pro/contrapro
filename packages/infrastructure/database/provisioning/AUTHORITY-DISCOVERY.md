# P1.6C offline authority discovery

Prepared only; NOT executed or authorized for live use.
This standalone tool does not provision or dispatch migrations. A catalog PASS is
evidence of PostgreSQL prerequisites, not proof of provider acceptance or permission
to run either grant.

Future command, only after separate authorization, from repository root:

```powershell
node .\packages\infrastructure\database\scripts\discover-foundation-authority.ts --discover-authority gllsiklbvqpxzucvkehw
```

Reuse the approved process-only CONTRATPRO_MIGRATION_* configuration contract:
ENVIRONMENT, CONNECTION_MODE, TARGET_ID, DATABASE, DATABASE_OID, LOGIN,
JOURNAL_OWNER, SERVER_ADDRESS, SERVER_PORT, PLAN_SHA256, URL and CA_FILE.
Do not place credentials in arguments, chat, logs or new files.
The tool uses parseApplyConfig for validation only; its synthetic internal
--apply/bootstrap arguments never invoke the apply runner.
Exact development endpoint, official CA-file validation, hostname/SNI and
TLS >=1.2 are inherited unchanged from buildMigrationClientConfig.
The pinned target and fingerprint come from the existing bootstrap target constant.

## Eight fixed SELECT definitions

1. Identity: SQL identities postgres, database postgres/OID 5, PostgreSQL 17,
   non-recovery, approved backend address/port and stable session PID.
2. Safeguards: current READ ONLY state and exact effective 5000/2000/10000ms limits.
3. Existence: control schema/journal present; four foundation schemas absent.
4. Roles: exact three restricted role attributes, at most four rows.
5. Memberships: existing bounded query (LIMIT 17, total count and grantor evidence).
6. ACL: original bootstrap journal/runtime effective boundaries.
7. History: only approved bootstrap record; LIMIT 3, no foundation record.
8. Authority: database owner identity/OID, current-user ownership, effective CREATE,
   CREATE WITH GRANT OPTION, existing migration-owner CREATE, executor SET.

Identity and safeguards are repeated before final ROLLBACK. Only catalogs and the
approved administrative journal are read, never application tables.
The baseline checks relevant authority boundaries; it is not a replacement for the
complete bootstrap verifier's journal-shape/constraint validation.

## Interpretation

TARGET, TLS, BASELINE, DATABASE_CREATE_DELEGATION and MEMBERSHIP_AUTHORITY each
report PASS / FAIL / INDETERMINATE. FINAL_VERDICT is PASS only if all pass and
rollback/cleanup succeed without a recorded failure.

Database delegation PASS requires the built-in CREATE WITH GRANT OPTION check,
including PostgreSQL's implicit grant authority for ownership. Ordinary CREATE,
CREATEROLE and BYPASSRLS never establish delegation. Ownership and ordinary CREATE
are separately reported; an owner may revoke its own ordinary CREATE while retaining
implicit grant authority. Non-owner grant-option paths are evaluated by PostgreSQL's
effective privilege function; this tool does not invent a direct ACL-only rule.
An owner reported without implicit grant authority is inconsistent evidence.

Membership PASS requires all three exact current provider-issued ADMIN memberships
from the approved snapshot, plus no outgoing memberships. Existing ADMIN proves
the catalog prerequisite for postgres to be the explicit grantor; SET remains false
before provisioning. No GRANT or SET ROLE test is performed.
Missing/extra/malformed membership evidence and overflow reject the baseline.
An already provisioned owner CREATE/SET state requires review and cannot return PASS.

Output contains fixed statuses/reasons, booleans, numeric owner OID and known owner
classifications only (postgres, supabase_admin, OTHER_ROLE). Unknown role names,
raw query rows, addresses, SQL, paths, certificates and driver errors are not emitted.
Primary failure survives cleanup failure; retained PASS facts remain visible.
Missing/query/transport evidence is INDETERMINATE; established unsafe baseline or
lack of database delegation is FAIL. Diagnostic contact is UNKNOWN during an
unconfirmed connection attempt, never falsely NOT_ESTABLISHED.

One client and one connect call; no retry. READ ONLY repeatable-read BEGIN,
four fixed SET LOCAL controls, then verified safeguards before baseline queries.
Seven-second client query timeout, five-second connection timeout, bounded cleanup.
Rollback is attempted even when BEGIN acknowledgement is lost; never COMMIT.
The CLI is inert on import, requires the exact confirmation argument and pinned
configuration/manifest, and adds no package script or automatic startup execution.

Only injected synthetic clients were used offline. Live database delegation,
provider restrictions and catalog representation remain unverified.
Next step: independent offline review. No live authorization is implied.
