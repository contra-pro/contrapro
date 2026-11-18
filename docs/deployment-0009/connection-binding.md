# Steps 225/227 — local evidence and operator binding; current gate NO-GO

Step 228 update: the owner's conditional approvals for the exact Program Files
Node and psql paths/hashes are satisfied by local rehash and recorded in
`step228-binary-approval.json`. Explicit Node selection is now approved; the
alternate Node remains unselected. The fingerprint-only executor and its dedicated
nine-field template are prepared separately; see `fingerprint-only-procedure.md`.
No native psql or database operation was performed. Prior window proposals are
NOT approved; no current execution window is bound.

Development intent: `gllsiklbvqpxzucvkehw` only. Existing read-only authorization
is acknowledged; this document neither invents an approval reference/window nor
authorizes migration, acceptance writes or activation. Nothing here was executed
against Supabase. Existing SQL, supervisor, manifest and isolated stage are unchanged.

Step 227 owner confirmation is recorded in `step227-operator-binding.json`: this
exact project is used for **Development/Test**, while its Dashboard label remains
**main/PRODUCTION**. Organization contra-pro, region eu-west-1 (Ireland) and all
reported session-pooler fields match the intended route. This is owner-reported
Dashboard evidence, not an independently inspected capture. The owner's environment
classification is accepted; the provider label is neither hidden nor reinterpreted.

The existing read-only authorization is bound by the template's authorizationReference
to that receipt. Target/TLS references point to labelled evidence sections, not
invented attestations. psqlPath and caPath identify the reviewed local candidates.
Step 228 additionally binds psqlSha256 after the explicit conditional approval and
exact local rehash. The Step 227 proposals remain historical; Step 228 records the
approved execution selections without approving a read or an execution window.

## Authoritative Dashboard evidence

The operator opens the official `https://supabase.com/dashboard` using the existing
authorized session, selects ONLY the intended project, and records the exact
project URL/reference `gllsiklbvqpxzucvkehw`. Stop if any field disagrees. Never
open API Keys, reveal a database password, copy a complete connection URI, or
export browser storage, cookies, HAR files or raw HTML.

Capture the following non-secret fields in an owner-only evidence location outside
Git. Dashboard labels can vary; use the indicated project/settings/Connect surfaces
and record the field label actually shown, not an assumed label:

1. Project identity/settings (normally Project Settings -> General): project name,
   project reference/ID, organization identity and the official page URL. If a
   separate ID is displayed, record it separately; do not invent a UUID from the
   reference. Capture enough surrounding project context to bind the page to that
   reference without including account email or other projects.
2. The same project's region/infrastructure settings: exact region label/code.
   The pooler hostname suggests a location but does not independently prove region.
3. That project's Connect panel: choose **Session pooler**, record the mode label,
   hostname, port, database and project-qualified username as discrete fields.
   Expected route: `aws-0-eu-west-1.pooler.supabase.com`, port `5432`, database
   `postgres`, username `postgres.gllsiklbvqpxzucvkehw`. Do not reveal credentials
   or capture connection strings, even if a password appears masked.
4. Same-project database settings: PostgreSQL version, SSL requirements and the
   official downloadable CA/source link. Record which endpoint/mode the SSL
   instructions apply to. Do not change settings or download anything in this step.
5. Environment evidence: record any actual Dashboard branch/environment label
   verbatim. A Main/default branch alone does not classify the entire project as
   Development. Pair the authoritative project/organization identity with the
   project owner's explicit, reviewed mapping of this exact reference to the
   separate Development environment. Label that mapping operator-approved, not a
   provider-issued Development classification unless the provider actually shows it.

A narrowly cropped Dashboard capture or official read-only project export can
establish source evidence. A manually typed summary alone is operator-reported.
Keep the original capture private; record actual capture UTC time, official source
URL, exact project reference and its SHA-256 in a separate review record. A hash
establishes file integrity, not authenticity. A reviewer must inspect the original
and its provenance. If original provenance is inaccessible, retain UNVERIFIED.
Bind targetEvidenceReference to that reviewed record using the supervisor's short
non-secret identifier syntax; do not put image contents or signed URLs into config.

## Independent fingerprint — database evidence, not project proof

First bind the project/route through the Control Plane evidence above. Then reuse
an independently retained read-only observation from the SAME approved session-
pooler route if it includes database OID, backend address/port, session identity,
version, UTC observation time, TLS provenance and a reviewable source. The earlier
summary without these fields cannot supply missing values.

If absent, a fingerprint-only read is required before the P3 supervisor can run.
It falls within the existing bounded read-only authorization, but is NOT performed
here. Use the existing verified observer connection and an independently reviewed
20-second process deadline. If such an executor is unavailable, STOP/NO-GO; do not
substitute a raw unbounded psql command or invent placeholder fingerprint values.
No new bootstrap adapter or executable command is supplied by this document.

The exact query scope for review, not execution here, is:

```sql
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL search_path=pg_catalog,pg_temp;
SET LOCAL statement_timeout='5s';
SET LOCAL lock_timeout='2s';
SET LOCAL idle_in_transaction_session_timeout='10s';
SELECT current_database() AS database_name,session_user,current_user,
       current_setting('server_version_num') AS postgres_version_num,
       (SELECT oid::text FROM pg_catalog.pg_database
        WHERE datname=current_database()) AS database_oid,
       inet_server_addr()::text AS server_address,
       inet_server_port() AS server_port,
       current_setting('transaction_read_only') AS transaction_read_only;
ROLLBACK;
```

Require database/session/current user `postgres`, major version 17, READ ONLY,
non-null backend address/port, exit 0 and rollback completion evidence. Client TLS
must separately establish verify-full with the exact approved hostname/CA. SQL
SSL metadata behind a pooler does not prove client-to-pooler hostname/chain checks.
Never treat database OID, backend IP or username alone as globally unique project
identity. Tie the observation to the authoritative route and evidence window.
Do not substitute an SQL Editor, direct connection, another pooler or another
backend's tuple. If provider routing/restart changes the tuple, stop and reconcile
with independent evidence instead of relaxing the supervisor comparison.

The current supervisor deliberately requires an expected fingerprint before
connecting; it cannot bootstrap or independently authenticate its own expectation.
An actual historical candidate was located in the 0007 postflight capture (line 33).
Its values and source hash are retained in the Step 227 receipt, with current
same-route provenance unverified. See `fingerprint-only-procedure.md` for the
separately bounded read scope and the still-UNBOUND executor prerequisite.

## Binary, CA and custody evidence

`binary-observations.json` records measured identities as OBSERVED only. The
operator must explicitly select an absolute Node executable and approve its hash,
then approve the psql 17 path/hash/version provenance. Do not use an unqualified
`node` command or assume the second PATH candidate is equivalent. An unsigned psql
binary requires a reviewed trusted installer/package provenance chain; its measured
hash and filename are not publisher approval. A valid Node signature likewise does
not itself record operator selection. Record approval only when actually supplied.

For CA provenance, retain the official same-project Dashboard CA source or an
authoritative Supabase source record and independently tie its bytes to the required
file SHA-256 `700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7`.
The existing local copies and their validity interval match the pin, but a CA's
self-signature/subject alone is not provenance. Record actual path, source, hash,
certificate validity/fingerprint and review reference. caSha256 is a required
trust-pin constant, not a newly granted approval. Actual handshake remains live.

Use the existing protected process-only PGPASSWORD input, without changing its
mechanism. Do not place credentials in JSON, argv, chat, command history, transcripts,
screenshots, logs or files. Do not discover credentials from ambient stores or
create login/refresh sessions. Confirm presence without printing a value only in
the intended credential-bearing operator process. No credential is collected here.

Record safe booleans for debugger/preload/tracing/transcription/request-body logging
controls and private evidence destination permissions. Obtain supported provider/
database logging evidence applicable to this connection; do not infer redaction
from absent observed secrets. Keep previous unresolved logging questions UNVERIFIED.
Confirm the supervisor receives no debugger/preload/TLS-key-log settings and that
binary/script/CA files are protected against replacement during execution. No
runtime/provider safeguard is marked verified by a source-code review alone.

## Configuration template and single operator gate

`operator-config.template.json` has EXACTLY the 17 supervisor fields. It deliberately
fails validation until UNBOUND values are replaced. Numeric time/port placeholders
are strings only to make their unresolved state explicit; the final copy must use
integer epoch milliseconds and an integer port. Do not add Node selection, approval
flags, status comments or credentials as extra keys: keep those in the review record.

Already fixed locally: intended projectRef, read-only scope, required psql major 17,
required CA hash, current isolated manifest path/hash. These do not establish live
identity or execution approval. Step 227 additionally binds
the existing authorization reference, labelled owner-reported target/CA records,
reviewed psql candidate path and observed CA file path. Following Step 228's explicit
binary approval, five fields remain UNBOUND: windowStart, windowEnd, databaseOid,
serverAddress and serverPort. No current fingerprint or window is inferred.
The historical proposal **2026-11-18 16:30–16:40 UTC** is NOT approved and must not
be used. Runtime window fields remain UNBOUND; no replacement is invented here.

The owner copies the template to an approved owner-only location outside Git,
fills only independently supported non-secret values, and records the actual UTC
start/end window when scheduling execution (at most two hours). No actual window,
private config path, approval reference or ownership attestation is fabricated here.
authorizationReference must refer to the existing user read-only approval; it is
not a request for renewed authorization or permission for additional operations.

Single checklist — every row must PASS before GO:

| Check | Current status | Operator completion |
|---|---|---|
| Reviewed SQL/supervisor/manifest and exact ten-file stage | PASS local | Recheck unchanged full hashes immediately before launch |
| Authoritative project/organization, region and session-pooler binding | UNVERIFIED | Capture/review the official fields above |
| Development classification of that exact project | PASS (owner authority, Step 227) | Preserve main/PRODUCTION separately from Development/Test use |
| Independent same-route database fingerprint | UNVERIFIED (UNBOUND) | Reuse a complete trusted observation or obtain the bounded fingerprint-only read |
| Official CA provenance, selected file and verified TLS setup | UNVERIFIED | Bind source/path/hash/validity and the TLS evidence record |
| Explicit Node selection and approved Node/psql identities | PASS (Step 228 exact rehash) | Recheck pinned paths/hashes before any later authorized execution |
| Protected credential-bearing process and logging safeguards | UNVERIFIED | Record custody/runtime/provider evidence without secret values |
| Complete private non-secret config and confirmed actual window | FAIL (window/fingerprint UNBOUND) | Bind accepted fingerprint and an actually approved window; no invented values |
| Deadline, fixed SQL, output caps, no retry | PASS source/offline | Use the existing supervisor without overrides; runtime cancellation remains unproven |

**Current result: NO-GO.** Existing read-only authorization remains valid in scope,
but does not substitute for connection evidence. GO requires every checklist row
resolved and the exact complete config validated; a PASS receipt is not fabricated
by this document. Unknown/failed prerequisites keep the gate closed.

Only once GO is actually recorded, the already documented invocation is:

```powershell
& $verifiedNode24 "$p3Stage/scripts/p3-readonly-preflight.mjs" --run-reviewed-preflight $approvedPrivatePreflightConfig
```

The Node path must be the explicitly selected reviewed binary, the stage the pinned
`contratpro-clients-0009-rSd0pd` directory, and config the independently completed
private copy. This preparation does not run that command. Do not bypass the fixed
SQL path, 20-second deadline, 4 MiB/16 KiB output caps or no-retry behavior. Timeout,
termination failure or lost response stays unverified; neither client exit nor
catalog reads alone prove live identity, server cancellation or rollback finality.
