# Steps 227/228 — bounded fingerprint-only acquisition, NOT EXECUTED

Purpose: obtain only the expected database OID and backend address/port needed by
the existing P3 supervisor. Do not change its fixed SQL path or replace its manifest.
No migrations, client/vehicle/Auth reads, fixtures, role changes or RPCs are included.

Existing candidate: `docs/deployment-0007/postflight-output.txt:33` contains OID 5,
backend `2a05:d018:184f:1e01:cea0:7ef7:7fd2:c39e`, port 5432 and postgres identities.
The Step 227 receipt pins that file's hash. Its current same-route/TLS binding and
observation time are UNVERIFIED. Do not promote these values into execution config
merely because they exist in a historical capture.

1. Reuse that candidate only if the original, independently reviewable observation
   ties it to this exact Control Plane route and its TLS/capture window, and the
   operator confirms it remains applicable. Otherwise a new fingerprint-only read
   is needed under the existing read-only authorization; none is performed here.
2. Before connecting, bind the owner's reported project/organization/region and
   endpoint to its reviewable Dashboard source. Preserve the main/PRODUCTION label
   and separate owner-confirmed Development/Test use. Endpoint: the reviewed session
   pooler, `aws-0-eu-west-1.pooler.supabase.com:5432`, database postgres, qualified
   user `postgres.gllsiklbvqpxzucvkehw`. No linked/default/alternate target.
3. Use approved Node/psql identities, the pinned valid CA and verify-full, protected
   process-only credentials and cleared runtime/provider logging. No password in
   argv, SQL, config, logs or receipts. Reject service/passfile/proxy/TLS overrides.
4. The separate executor is `scripts/p3-fingerprint-only.mjs`, pinned to sibling
   `scripts/p3-fingerprint-only.sql`. It does not import or modify the existing P3
   supervisor, read historical captures, accept an expected tuple or write config.
   Step 228 approved both exact binary paths/hashes after successful local rehash.
   The fingerprint executor additionally verifies its active Node path/hash and
   the psql hash before any connection. It uses the same fixed Development route,
   verify-full, pinned/time-valid CA, startup READ ONLY and 5s/2s/10s server limits.
   There is no arbitrary SQL path, shell, PATH fallback, service/passfile lookup,
   retry, login or refresh operation. Only explicitly approved process PGPASSWORD
   is read, and only during a later authorized invocation. No password enters argv.

   The 20-second deadline covers configuration I/O, file verification, the single
   native child, result parsing and final output delivery. It checks monotonic
   elapsed time, rejects late completion, requests SIGKILL on cancellation, and an
   outer timer aborts the child before supervisor exit. Stdout/stderr are each
   limited to 8 KiB; stderr/raw errors are discarded and failures are constants.
   Only one strictly validated JSON fingerprint may be returned, after exit 0 and
   no diagnostics. The SQL is quiet and rollback-only. Capture remains database-
   reported evidence requiring review, not independently established project/TLS
   identity or proof of rollback finality.

   Offline tests inject all process/I/O/credential/clock ports: no native process
   or connection is launched. Native termination/pooler behavior remains unverified.
   OS scheduling/suspension can delay timers; failed kill does not establish that
   a client/backend stopped. UNKNOWN/failure never authorizes another operation.
   The fixed P3 supervisor still cannot bootstrap its own expected fingerprint.

```sql
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL search_path=pg_catalog,pg_temp;
SET LOCAL statement_timeout='5s';
SET LOCAL lock_timeout='2s';
SET LOCAL idle_in_transaction_session_timeout='10s';
SELECT json_build_object(
 'database',current_database(),'sessionUser',session_user,'currentUser',current_user,
 'versionNum',current_setting('server_version_num'),
 'databaseOid',(SELECT oid::text FROM pg_catalog.pg_database WHERE datname=current_database()),
 'serverAddress',inet_server_addr()::text,'serverPort',inet_server_port(),
 'readOnly',current_setting('transaction_read_only'),
 'isolation',current_setting('transaction_isolation'));
ROLLBACK;
```

5. Require exactly one row, postgres database/session/current user, PostgreSQL 17,
   READ ONLY and repeatable read, non-null OID/address/port, exit 0 and rollback
   completion evidence. Independently capture actual UTC time, protected route/TLS
   provenance, approved binary identity and source hash in private evidence.
   This row is database-reported evidence, not independent project identity or
   client-to-pooler TLS proof. Do not substitute an SQL Editor/direct-route tuple.
6. A timeout, diagnostic, missing/extra row, mismatch or termination uncertainty
   means UNKNOWN/NO-GO. Do not retry or infer rollback. Reconcile the client/backend
   independently. Never fabricate a tuple to satisfy the supervisor.
7. Only after review, bind the decimal OID string, IPv4/IPv6 address and integer
   backend port into the exact 17-field private P3 config, cross-referencing the
   accepted target/TLS records. If routing changes, stop and re-establish evidence;
   do not relax comparisons. This does not authorize migration or live acceptance.

## Operator binding and invocation — future authorization required

Copy `fingerprint-config.template.json` into an approved private owner-only location
outside Git. It has exactly nine fields. Bind a real fingerprint-read authorization
reference and actual UTC epoch-ms start/end window only when separately approved;
Step 228 does not authorize execution or approve the prior proposal. Leave target/
TLS references unsupported until their provenance, CA and logging/custody reviews
are adequate. No actual window or new private config is generated here.

Before a future read, verify the executor, SQL and config hashes against the reviewed
Step 228 packet/record and retain the exact read scope. The approved invocation uses
the explicit Node path, never PATH resolution:

```powershell
& 'C:\Program Files\nodejs\node.exe' 'C:\Users\lenovo\contratpro\scripts\p3-fingerprint-only.mjs' --run-reviewed-fingerprint $approvedPrivateFingerprintConfig
```

Do not run it now. A separate authorized read and confirmed window, protected
process-only credential channel, target/TLS evidence and logging safeguards are
still required. Do not put secrets into the config or output destination. A captured
tuple must be reviewed and separately bound into the P3 config by the operator;
the executor never treats its own output as independent acceptance evidence.
