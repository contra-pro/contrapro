# D1 target read-only evidence collection plan

Prepared locally, 2026-11-27 UTC. **NOT EXECUTED. NO CONNECTION AUTHORIZED.** Target reference supplied by the owner: `gllsiklbvqpxzucvkehw`. This is a precise proposed packet, not a migration executor or authority to run SQL. No credential was retrieved/read/printed, database queried, Docker/database created or historical migration changed.

## Current verdict and authorization gates

**NO-GO for collection now**, pending the bindings and explicit bounded authorization below. Local preparation is complete for review. Read-only collection does not require proving that migrations are safe to apply or performing D5 backups first; it does require knowing and authorizing the actual target and the exact data categories. Migration execution remains NO-GO regardless of a later catalogue collection GO.

1. Owner/operator must supply current independently reviewable Control Plane evidence tying project/organization/region, the exact reference, Development/Test use and approved connection route together. A Supabase Free tier is not isolation. Historical documentation explicitly preserves a `main`/`PRODUCTION` label alongside reported Development/Test use; do not erase that distinction or assume the current label/use. Record whether real users/services/data may be present; the default packet never reads their records.
2. Confirm the endpoint/mode/database and approved SQL login from that current evidence. Historical candidate only: session pooler `aws-0-eu-west-1.pooler.supabase.com:5432`, database `postgres`, historically qualified postgres route. It is **not** a newly verified endpoint or a requirement to use postgres. Prefer an existing least-privilege SQL catalogue reader. Do not request a Supabase service-role API key. Creating/granting a role is a separate mutation authorization, not part of this packet.
3. Bind reviewed absolute native `psql` executable path/version/raw SHA-256, trusted CA path/hash/provenance/validity, protected operator credential channel, target evidence reference, owner authorization reference, UTC collection window, output location and exact query file hashes. Historical Node/psql/CA receipts do not establish current validity or target identity. Never discover credentials, perform login/refresh flows, use a linked/default project or print a connection string containing credentials.
4. Review the commands and SQL below as a new D1 packet. Old P3 fingerprint/preflight supervisors accept fixed old SQL/manifest bindings; they must not be repurposed or fed a substituted SQL file. The package foundation migration runner handles four files only; no Supabase CLI push/pull/diff/dry-run/reset/link/repair, migration CLI or application RPC is part of this collection.
5. Authorize **A: metadata Q0–Q8** first. Authorize **B: history versions/checksums Q9/Q10** explicitly only after their shape/permissions are known. Existing historical Q14 content blocks are not waived. **C: full function/policy/default/history SQL content is excluded** until a specific additional content review/approval. Lack of SELECT is a limitation, not permission to elevate or fabricate an empty history.
6. Run from a separately approved private operator process. No PowerShell transcript, shell debug, SQL echo, shared terminal recording, provider payload logging or password prompt. Use only an already approved process credential channel; do not read real `.env`, `.pgpass`, service profiles, client private keys or secret stores through this plan. Reject inherited target/service/proxy/TLS/preload overrides; provide explicit verify-full CA and an approved credential-file-discovery policy. If these cannot be established, stop before connecting.

The host/database/OID/backend tuple obtained by SQL corroborates a session; it cannot itself authenticate a Supabase project reference or prove Development-only use. Validate TLS and Control Plane route separately. Do not require a preexisting OID just to collect the initial fingerprint: Q0 is expressly the initial bounded observation, not a migration authorization. Later observations must be reconciled against that approved context.

With a session pooler, `pg_stat_ssl` describes the database backend leg, not the client's certificate/hostname verification against the pooler. A NULL or unavailable SSL observation is UNKNOWN, not a successful TLS proof. Preserve the independent verify-full client/CA evidence and do not infer endpoint/project identity from a shared pooler hostname or backend address alone.

## Exact proposed client invocation (operator only, after approval)

Materialize **one selected query** below per UTF-8 query file with the common envelope, outside the repository, and approve its raw SHA-256. The paths and login remain UNBOUND until independently reviewed. Do not create these executable query files and invoke them automatically from this document.

The command to be approved is native psql, no application runner:

```powershell
# All variables below are non-secret reviewed bindings, NOT populated by D1 preparation.
# $D1Psql: absolute executable; $D1Host/$D1RoutingUser: approved route/login.
# $D1Query: one exact approved query file; $D1Csv/$D1Error: private capture paths.
# $D1Ca: reviewed public CA file. Credential already in the approved operator process.
$env:PGSSLMODE = 'verify-full'
$env:PGSSLROOTCERT = $D1Ca
$env:PGCONNECT_TIMEOUT = '5'
$env:PGAPPNAME = 'contratpro-d1-readonly'
$env:PGOPTIONS = '-c default_transaction_read_only=on -c statement_timeout=5000 -c lock_timeout=2000 -c idle_in_transaction_session_timeout=10000'
& $D1Psql -X --quiet --no-password --host=$D1Host --port=5432 --dbname=postgres --username=$D1RoutingUser --set=ON_ERROR_STOP=1 --csv --file=$D1Query --output=$D1Csv 2> $D1Error
if ($LASTEXITCODE -ne 0) { throw 'D1_READONLY_FAILED: close and review privately; no automatic retry' }
```

No password or service-role key is an argument. `-X` disables psql startup files, `--no-password` forbids an interactive prompt, startup default READ ONLY precedes the transaction and every query has its own rollback envelope. This is command text for review, **not a tested native invocation**. An approved external supervisor/operator must bound the entire client lifetime to 30 seconds and output to 4 MiB per query, including connection/capture, and close/terminate on timeout. Server timeouts alone do not bound a stalled client/output channel. Do not use an unrestricted launcher or alter lean-ctx to add this control.

Agent execution, if subsequently authorized, must still pass through lean-ctx using the exact reviewed command and supported scoped authorization. The native binary may not be allowlisted; no attempt was made here. If blocked, report the exact rejected command and stop. Do not permanently allow a shell/binary, invoke another execution mechanism as a bypass or reuse obsolete supervisors. A separately authorized operator manual invocation remains subject to applicable policy and the same bounds.

## Common SQL envelope — every query independently

```sql
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL search_path=pg_catalog,pg_temp;
SET LOCAL statement_timeout='5s';
SET LOCAL lock_timeout='2s';
SET LOCAL idle_in_transaction_session_timeout='10s';
-- Insert exactly ONE approved SELECT from Q0–Q10 below.
ROLLBACK;
```

No SET ROLE, DDL, DML, temp objects, extensions, advisory locks or application/SECURITY DEFINER RPC calls. Only built-in catalogue inspection functions are used. Independent queries have independent snapshots; record observation times and a schema-change-free window. If schema changes between them, mark reconciliation inconsistent and request renewed collection, never silently merge snapshots.

Every metadata query below is capped at 5,001 rows. `total_rows` is a catalogue count, not customer data. A total exceeding 5,000 is **INCOMPLETE**; preserve the bounded output and request a reviewed scope/pagination change. Do not silently truncate or claim full dependency closure. No destructive operation is needed for collection or output cleanup.

## A — metadata queries

Q0 — session fingerprint/TLS observation. Requires connection and ordinary catalogue visibility; `pg_stat_ssl` own-session visibility must be confirmed. Expected exactly one row. Restrict raw login/backend addresses to private evidence; shared report uses approved aliases/hashes. No claim that a server tuple proves project ownership.

```sql
SELECT current_database() AS database_name,
 (SELECT oid::text FROM pg_catalog.pg_database WHERE datname=current_database()) AS database_oid,
 (SELECT datcollate FROM pg_catalog.pg_database WHERE datname=current_database()) AS database_collation,
 (SELECT datctype FROM pg_catalog.pg_database WHERE datname=current_database()) AS database_ctype,
 session_user::text AS session_role,current_user::text AS effective_role,
 current_setting('server_version_num') AS server_version_num,
 current_setting('server_encoding') AS server_encoding,
 inet_server_addr()::text AS backend_address,inet_server_port() AS backend_port,
 pg_catalog.pg_is_in_recovery() AS in_recovery,
 current_setting('transaction_read_only') AS transaction_read_only,
 current_setting('transaction_isolation') AS isolation,
 (SELECT ssl FROM pg_catalog.pg_stat_ssl WHERE pid=pg_catalog.pg_backend_pid()) AS tls_on,
 pg_catalog.statement_timestamp() AS observed_at;
```

Q1 — extensions, namespaces and history relation discovery. Ordinary catalogue reads; expected small scoped metadata. No extension installation and no history contents.

```sql
SELECT count(*) OVER() AS total_rows,kind,name,detail FROM (
 SELECT 'extension'::text AS kind,e.extname AS name,
 e.extversion||' @ '||n.nspname AS detail
 FROM pg_catalog.pg_extension e JOIN pg_catalog.pg_namespace n ON n.oid=e.extnamespace
 UNION ALL
 SELECT 'schema',n.nspname,pg_catalog.pg_get_userbyid(n.nspowner)
 FROM pg_catalog.pg_namespace n WHERE n.nspname IN
 ('identity','tenancy','app_private','public','auth','storage','supabase_migrations','migration_control')
 UNION ALL
 SELECT 'history-relation',n.nspname||'.'||c.relname,c.relkind::text
 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE (n.nspname='supabase_migrations' AND c.relname='schema_migrations')
 OR (n.nspname='migration_control' AND c.relname='journal')
) s ORDER BY kind,name LIMIT 5001;
```

Q2 — relation/column shape and RLS flags. Expected scoped table/column catalogue rows, no values. Default expressions are fingerprinted instead of exported. Catalogue visibility is enough; missing metadata permissions remain an explicit gap.

```sql
SELECT count(*) OVER() AS total_rows,n.nspname,c.relname,c.relkind,
 pg_catalog.pg_get_userbyid(c.relowner) AS owner,c.relrowsecurity,c.relforcerowsecurity,
 a.attnum,a.attname,pg_catalog.format_type(a.atttypid,a.atttypmod) AS data_type,
 a.attnotnull,a.attidentity,a.attgenerated,
 d.oid IS NOT NULL AS has_default,
 CASE WHEN d.oid IS NOT NULL THEN encode(sha256(convert_to(pg_catalog.pg_get_expr(d.adbin,d.adrelid),'UTF8')),'hex') END AS default_sha256
FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
LEFT JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
WHERE n.nspname IN ('identity','tenancy','app_private')
 OR (n.nspname IN ('auth','storage') AND c.relname IN ('users','objects','buckets'))
 OR (n.nspname='supabase_migrations' AND c.relname='schema_migrations')
 OR (n.nspname='migration_control' AND c.relname='journal')
ORDER BY n.nspname,c.relname,a.attnum LIMIT 5001;
```

Q3 — keys/checks/triggers/indexes. Expected catalogue identities, key arrays and validation flags; no trigger arguments or CHECK literals are disclosed. Required permission: catalogue inspection, not table SELECT. Target definition hashes are server-format fingerprints, **not raw local SQL checksums**.

```sql
SELECT count(*) OVER() AS total_rows,kind,schema_name,relation_name,object_name,detail,definition_sha256 FROM (
 SELECT 'constraint'::text AS kind,n.nspname AS schema_name,c.relname AS relation_name,k.conname AS object_name,
 jsonb_build_object('type',k.contype,'validated',k.convalidated,'deferrable',k.condeferrable,
 'deferred',k.condeferred,'keys',k.conkey,'referencedTable',k.confrelid::regclass::text,'referencedKeys',k.confkey)::text AS detail,
 encode(sha256(convert_to(pg_catalog.pg_get_constraintdef(k.oid),'UTF8')),'hex') AS definition_sha256
 FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid
 JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname IN ('identity','tenancy','app_private')
 UNION ALL
 SELECT 'trigger',n.nspname,c.relname,t.tgname,
 jsonb_build_object('enabled',t.tgenabled,'internal',t.tgisinternal,'function',t.tgfoid::regprocedure::text)::text,
 encode(sha256(convert_to(pg_catalog.pg_get_triggerdef(t.oid),'UTF8')),'hex')
 FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
 JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname IN ('identity','tenancy','app_private')
 UNION ALL
 SELECT 'index',n.nspname,c.relname,ic.relname,
 jsonb_build_object('unique',i.indisunique,'valid',i.indisvalid,'ready',i.indisready,'keys',i.indkey::text)::text,
 encode(sha256(convert_to(pg_catalog.pg_get_indexdef(i.indexrelid),'UTF8')),'hex')
 FROM pg_catalog.pg_index i JOIN pg_catalog.pg_class c ON c.oid=i.indrelid
 JOIN pg_catalog.pg_class ic ON ic.oid=i.indexrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname IN ('identity','tenancy','app_private')
 UNION ALL
 SELECT 'event-trigger','<database>','<global>',e.evtname,
 jsonb_build_object('enabled',e.evtenabled,'event',e.evtevent,'tags',e.evttags,'function',e.evtfoid::regprocedure::text)::text,
 encode(sha256(convert_to(pg_catalog.pg_get_functiondef(e.evtfoid),'UTF8')),'hex')
 FROM pg_catalog.pg_event_trigger e
) s ORDER BY kind,schema_name,relation_name,object_name LIMIT 5001;
```

Q4 — function identities, owners, security and definition hashes. Ordinary function catalogue visibility, restricted to application scopes and named managed helpers. **No application function is invoked**; `pg_get_functiondef` supplies text only to SHA-256. No body/default argument value is output. Only search_path/row_security configuration is exported, avoiding other custom settings that could hold secrets.

```sql
SELECT count(*) OVER() AS total_rows,n.nspname,p.proname,
 pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_arguments,
 pg_catalog.pg_get_function_result(p.oid) AS result_type,
 pg_catalog.pg_get_userbyid(p.proowner) AS owner,l.lanname,p.prosecdef,p.provolatile,p.prokind,
 ARRAY(SELECT x FROM unnest(COALESCE(p.proconfig,ARRAY[]::text[])) x
 WHERE split_part(x,'=',1) IN ('search_path','row_security') ORDER BY x) AS security_settings,
 p.proacl::text AS acl,
 encode(sha256(convert_to(pg_catalog.pg_get_functiondef(p.oid),'UTF8')),'hex') AS definition_sha256
FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
JOIN pg_catalog.pg_language l ON l.oid=p.prolang
WHERE p.prokind IN ('f','p') AND (n.nspname IN ('identity','tenancy','app_private')
 OR (n.nspname='public' AND left(p.proname,11)='contratpro_')
 OR (n.nspname='auth' AND p.proname IN ('uid','role','jwt')))
ORDER BY n.nspname,p.proname,identity_arguments LIMIT 5001;
```

Q5 — policy metadata and predicate hashes. Expected RLS role/command/permissiveness records for app tables and named Storage tables. No policy literal is output. Policy roles plus relation FORCE/ENABLE RLS and role bypass properties must all be reconciled.

```sql
SELECT count(*) OVER() AS total_rows,n.nspname,c.relname,p.polname,p.polcmd,p.polpermissive,p.polroles::text,
 p.polqual IS NOT NULL AS has_using,p.polwithcheck IS NOT NULL AS has_check,
 encode(sha256(convert_to(COALESCE(pg_catalog.pg_get_expr(p.polqual,p.polrelid),'')||'|'||
 COALESCE(pg_catalog.pg_get_expr(p.polwithcheck,p.polrelid),''),'UTF8')),'hex') AS predicate_sha256
FROM pg_catalog.pg_policy p JOIN pg_catalog.pg_class c ON c.oid=p.polrelid
JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname IN ('identity','tenancy','app_private')
 OR (n.nspname='storage' AND c.relname IN ('objects','buckets'))
ORDER BY n.nspname,c.relname,p.polname LIMIT 5001;
```

Q6 — effective source ACL metadata including global defaults and column grants. Requires catalogue visibility. Raw ACLs preserve grant options/NULL distinctions; owner/inheritance/default semantics still require native review. No GRANT is executed.

```sql
SELECT count(*) OVER() AS total_rows,kind,object_name,owner,acl FROM (
 SELECT 'schema'::text AS kind,n.nspname AS object_name,pg_catalog.pg_get_userbyid(n.nspowner) AS owner,n.nspacl::text AS acl
 FROM pg_catalog.pg_namespace n WHERE n.nspname IN ('identity','tenancy','app_private','public','auth','storage','supabase_migrations','migration_control')
 UNION ALL
 SELECT 'relation',n.nspname||'.'||c.relname,pg_catalog.pg_get_userbyid(c.relowner),c.relacl::text
 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname IN ('identity','tenancy','app_private')
 OR (n.nspname='storage' AND c.relname IN ('objects','buckets'))
 OR (n.nspname='supabase_migrations' AND c.relname='schema_migrations')
 OR (n.nspname='migration_control' AND c.relname='journal')
 UNION ALL
 SELECT 'column',n.nspname||'.'||c.relname||'.'||a.attname,pg_catalog.pg_get_userbyid(c.relowner),a.attacl::text
 FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE a.attnum>0 AND NOT a.attisdropped AND a.attacl IS NOT NULL AND n.nspname IN ('identity','tenancy','app_private','supabase_migrations','migration_control')
 UNION ALL
 SELECT 'type',n.nspname||'.'||t.typname,pg_catalog.pg_get_userbyid(t.typowner),t.typacl::text
 FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace
 WHERE n.nspname IN ('identity','tenancy','app_private') AND t.typisdefined
 UNION ALL
 SELECT 'default',COALESCE(n.nspname,'<global>')||':'||d.defaclobjtype,pg_catalog.pg_get_userbyid(d.defaclrole),d.defaclacl::text
 FROM pg_catalog.pg_default_acl d LEFT JOIN pg_catalog.pg_namespace n ON n.oid=d.defaclnamespace
 WHERE (d.defaclnamespace=0 OR n.nspname IN ('identity','tenancy','app_private','public','storage'))
 AND (pg_catalog.pg_get_userbyid(d.defaclrole)='postgres'
 OR left(pg_catalog.pg_get_userbyid(d.defaclrole),11)='contratpro_'
 OR d.defaclrole IN (SELECT c.relowner FROM pg_catalog.pg_class c
 JOIN pg_catalog.pg_namespace ns ON ns.oid=c.relnamespace
 WHERE ns.nspname IN ('identity','tenancy','app_private')))
) s ORDER BY kind,object_name,owner LIMIT 5001;
```

Q7 — roles and direct membership metadata without passwords. Query `pg_roles`, **never `pg_authid`**. Role names/login labels are private operator metadata, aliased in shared outputs. This captures direct edges touching ContratPro roles, not a proof of complete transitive authority. Any unresolved indirect role path needs a separately reviewed minimal follow-up.

```sql
SELECT count(*) OVER() AS total_rows,kind,name,detail FROM (
 SELECT 'role'::text AS kind,r.rolname::text AS name,
 jsonb_build_object('oid',r.oid,'login',r.rolcanlogin,'superuser',r.rolsuper,'bypassRls',r.rolbypassrls,
 'inherit',r.rolinherit,'createRole',r.rolcreaterole,'createDb',r.rolcreatedb,'replication',r.rolreplication)::text AS detail
 FROM pg_catalog.pg_roles r WHERE left(r.rolname,11)='contratpro_'
 OR r.rolname IN ('postgres','anon','authenticated','service_role','authenticator',current_user,session_user)
 UNION ALL
 SELECT 'membership',granted.rolname||' -> '||member.rolname,
 jsonb_build_object('admin',m.admin_option,'grantor',pg_catalog.pg_get_userbyid(m.grantor))::text
 FROM pg_catalog.pg_auth_members m JOIN pg_catalog.pg_roles granted ON granted.oid=m.roleid
 JOIN pg_catalog.pg_roles member ON member.oid=m.member
 WHERE left(granted.rolname,11)='contratpro_' OR left(member.rolname,11)='contratpro_'
) s ORDER BY kind,name LIMIT 5001;
```

For PostgreSQL **16+ only**, additionally approve Q7b for exact membership options (never blindly run it against another major):

```sql
SELECT count(*) OVER() AS total_rows,g.rolname AS granted_role,u.rolname AS member_role,
 m.admin_option,m.inherit_option,m.set_option,pg_catalog.pg_get_userbyid(m.grantor) AS grantor
FROM pg_catalog.pg_auth_members m JOIN pg_catalog.pg_roles g ON g.oid=m.roleid
JOIN pg_catalog.pg_roles u ON u.oid=m.member
WHERE left(g.rolname,11)='contratpro_' OR left(u.rolname,11)='contratpro_'
ORDER BY g.rolname,u.rolname,m.grantor LIMIT 5001;
```

Q8 — relevant Storage configuration is initially **Q1/Q2/Q5/Q6 metadata only**. No `storage.objects` rows, file names, signed URLs or tokens. If the shape and explicit column permissions are confirmed and configuration-row collection is additionally authorized, approve Q8b:

```sql
SELECT id,name,public,file_size_limit,allowed_mime_types
FROM storage.buckets WHERE id='contract-documents' LIMIT 2;
```

Required permission: SELECT only on those approved bucket configuration columns, not service-role access or object-table SELECT. Expected one known private bucket, or a documented absent/denied result. Missing/NULL size/MIME settings are observations, not automatic compatibility. A different Storage schema/version requires a separately reviewed query rather than guessing columns.

## B — migration history content (explicit new permission required)

Q9 — run only after Q2 confirms an ordinary expected history relation and text-compatible version column, Q6 confirms authorized SELECT and the owner approves version-only history content. No `statements`, `name`, authors, arbitrary SQL or Q14 history dump is collected:

```sql
SELECT count(*) OVER() AS total_rows,version
FROM supabase_migrations.schema_migrations ORDER BY version LIMIT 5001;
```

Q10 — only if Q1/Q2 prove the expected separate journal and its column contract, and an explicit column SELECT authorization exists:

```sql
SELECT count(*) OVER() AS total_rows,id,ordinal,checksum,runner_version
FROM migration_control.journal ORDER BY ordinal,id LIMIT 5001;
```

Expected: bounded versions or exact journal identifiers/checksums, **not proof of deployed raw SQL**. Supabase native version rows may carry no raw-byte checksum. Version 0008 observed in history does not resolve the missing deployed-source provenance; a catalogue definition hash also cannot recreate its original file bytes. Journal absence, denied SELECT, gaps/unknown versions and checksum mismatches are distinct states, never “not applied” by default. No history repair or INSERT permission is requested.

## C — definitions and data compatibility follow-up, excluded by default

If a specific function hash/settings or guard mismatch requires body review, request explicit approval of one exact signature and private content handling first. Only then, in the common read-only envelope, a fixed scoped query may retrieve its definition; for example:

```sql
SELECT n.nspname,p.proname,pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_arguments,
 pg_catalog.pg_get_functiondef(p.oid) AS definition
FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='app_private' AND p.proname='canonical_auth_user' AND p.pronargs=0 AND p.prokind='f';
```

Do not broaden to every function or migration `statements`. A deployed body/default/predicate could contain embedded sensitive literals; retain only expressly approved content in encrypted private evidence and redact before sharing. Keep the raw original's hash separate from any redacted derivative; neither redaction nor normalization may be represented as the raw original. Historical Q03 projection and Q12 invalid `pg_catalog.boolean` queries must not be reused. Current metadata queries use actual catalog types and still require native binding review; offline parsing is not that proof.

Existing-data compatibility initially derives only from shape, validated constraints, valid indexes, FK/key mappings and provenance gaps. No customer/Auth/profile/legal/signature/delivery/Sheets row reads, counts, identity samples, min/max values or token hashes are authorized by A/B. Later data-dependent prerequisites (legacy canonicalization, tenant/orphan invariants, uniqueness, overlapping rentals, historical immutable versions and evidence/receipt consistency) need a separate narrowly reviewed aggregate/deidentified-data authorization on the development target, then actual mutation/concurrency acceptance on an isolated native clone. Do not mark compatibility true before those checks.

## Capture, sanitization and evidence location

Operator-created private root, outside Git/sync/shared chat: `C:\Users\lenovo\AppData\Local\ContratPro-D1-evidence\<approved-run-id>\`. Verify restrictive owner/operator ACLs before capture; this directory was not created here. Files: `authorization.json` (references only), `query-Q*.sql`, `Q*.csv`, private error file, `capture-manifest.json` with raw query/output/binary/CA hashes, byte/row counts, UTC times, command ID/exit, timeout/overflow status, catalogue snapshot caveats and review decisions. No credential belongs in this manifest.

Each Q has its purpose/permission/expected output above; all use that same private location. Store original outputs privately, not in tracked docs. Shared worksheet contains only status, approved target aliases, non-sensitive definition/source hashes, completeness and evidence IDs. Do not print CSV/error contents to model/chat. For role names/server addresses/defaults/definitions, sanitize shared derivatives under owner review; retain exact originals only within the approved scope. Permission denied, SQL binding error, timeout, unexpected column/version, output overflow or uncertain termination means stop and mark the affected evidence UNVERIFIED/INCOMPLETE. No automatic retry, target substitution, grant, data collection or schema repair follows.

## Isolated native PostgreSQL acceptance infrastructure (future authorization)

- Dedicated disposable PostgreSQL **17** clone for the historically referenced target contract; discover actual target version first and test that version too if different. Matching collation/encoding/extensions and managed Auth/Storage-compatible stubs/services must be declared; bare PostgreSQL is not full Supabase acceptance.
- Planning allocation: 2 vCPU, 4 GiB RAM, 20 GiB isolated disk for a small synthetic DB; 4 vCPU/8 GiB/80 GiB host if combined with C2 app/build tooling. **Estimates only**, no provisioning/container/database creation or measured capacity claim.
- At least three independent native sessions for concurrent creators/signers/workers plus observer; separate admin/migration/runtime/anon/authenticated/worker principals with exact NOLOGIN, SET/ADMIN, grants/default ACL and RLS behavior. Synthetic identities/data only; outbound provider access blocked and all production gates closed.
- Native tests: approved ordering/history atomicity and uncertain COMMIT; schema collisions and invalid legacy constraints; effective RLS/column/function/default ACLs and tenant denial; contract/client/vehicle lifecycle CAS/resource overlaps; agency-first signing, challenge expiry/replay, capture/evidence/final fingerprints; registration/self profiles/legal version rejection/onboarding bootstrap rollback; worker leases/crashes/duplicate pulls/restore holds/key rotation; Sheets monotonic same-row identity, uncertain append/refresh quarantine. External APIs remain injected/disabled.
- Preserve manifests, historical document/evidence bytes and cleanup ownership proof. Tests require **separate authorization** for local/remote database mutation, synthetic fixtures, crash scenarios and cleanup. D5 actual backup/restore evidence and later real integration/manual acceptance are not implied by this plan.

## Local preparation checks actually performed

Raw local hashing and offline parsing only: 37 historical SQL artifacts unchanged; all 37 source files parsed; 14 proposed SQL blocks parsed with only SELECT, transaction-envelope and local-setting top-level statements. Four established manifests' 28 SQL-source references matched their local pinned hashes. The obsolete Q03/Q12 scripts were not changed or executed. No native catalogue binding, function semantic equivalence, privilege effectiveness, remote identity or data compatibility was verified. No database test suite, SQL client, migration runner, container or server was started. Final whitespace verification is recorded in the MVP tracker.
