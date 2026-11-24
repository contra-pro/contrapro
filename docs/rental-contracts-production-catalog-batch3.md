# Production catalog evidence collection — Batch 3 (Q09–Q12)

**OFFLINE PREPARATION ONLY. NOT EXECUTED BY CODEX.**
**Production Deployment: BLOCKED / NO-GO.** Q14 remains excluded/BLOCKED.
Four separate queries only, Q09 then Q10 then Q11 then Q12. Never combine blocks into
one script. No migration, grant, ownership change, automatic next batch or deployment.

## Target, evidence and source binding

User-specified Supabase Production project: **gllsiklbvqpxzucvkehw**.
Independently verify that dashboard project, intended database and approved SQL Editor
executor before each query. Repository files and result rows do not establish target
identity. No connection has been made by Codex.

Canonical source: [query package](rental-contracts-production-catalog-query-review.md).
Current SHA256: fd235793ae7e311f889b44b7e2c8626bc31bbdfba0eee54b3740d5bd4c8a368e.
Review sources: [original independent audit](rental-contracts-production-catalog-independent-audit.md),
[independent re-review](rental-contracts-production-catalog-independent-rereview.md),
[final Q16 review](rental-contracts-production-catalog-q16-independent-final-review.md).
[Remediation](rental-contracts-production-catalog-remediation.md) records author changes,
not independent approval. [Batch 3 verification](rental-contracts-production-catalog-batch3-verification.md)
records per-block continuity despite unrelated whole-package Q03/Q16 changes.

User-reported earlier collection (not independently inspected in this task): Batch 1
Q01–Q04; corrected Q03 532 rows; Batch 2 Q05–Q08; Q06 34 rows/type USAGE; Q07 96 rows
and broad public default ACLs; Q08 21 rows. **Q05 function hardening, broad public default
ACL impact, role membership and migration ownership authority remain unresolved.**
Batch 3 metadata gathering does not resolve or bypass those release blockers. Do not
rerun completed batches or treat query execution success as deployment approval.

## Manual sequential controls

1. Confirm controlled authorization for this batch/project/database/executor and existing
   platform timeouts. If earlier findings require stopping under the approved collection
   plan, stop for review; this guide does not authorize bypassing such a stop.
2. Match approved role/session context to prior verified Q01 evidence. Q09–Q12 do not
   independently output session_user/current_user. If Editor selection/session changed
   or identity cannot be established, stop. SQL Editor authority is separate from
   actual future migration executor authority. No SET ROLE or new context SQL is included.
3. Copy one complete eligible SQL block at a time. Run Q09, preserve and assess result;
   proceed to Q10/Q11/Q12 only if common and query-specific stop conditions are clear.
   Do not alter SQL, add wrappers, switch roles, retry automatically or escalate rights.
4. Save query ID, exact SQL hash, UTC time/offset (label operator time if necessary),
   non-secret target/database label and verified role context, complete headers/rows,
   returned/exported row count, rows_total where present, errors/SQLSTATE and warnings.
   Preserve booleans, NULLs, OIDs, arrays, hashes and full JSON cells. Preserve headers
   for zero rows. Separate SELECTs are separate snapshots, not atomic evidence.
5. Use approved restricted evidence custody. Catalog identifiers/ACLs/hashes remain
   sensitive operational metadata. Do not save tokens, credentials, connection strings,
   customer data, unrelated Editor history or raw function/policy/trigger definitions.
   If unexpected sensitive content appears, stop and withhold that content rather than
   publishing it. Record evidence as incomplete.
6. Stop on permissions/errors/timeouts, warnings needing review, unexpected results,
   missing or ambiguous required evidence, context mismatch, sensitive output or
   truncation. Never change privileges/RLS/roles/schema to obtain success. After Q12,
   stop for evidence review; no automatic subsequent batch or deployment.

## Eligibility

Q09 SAFE; Q10 SAFE; Q11 SAFE; Q12 SAFE for limited manual metadata collection only.
Live PostgreSQL 17.11 planning, managed permissions and Production state are UNVERIFIED.

## Q09

**Purpose:** Inspect primary/unique/foreign-key definitions, validation/deferral, tenant key columns and supporting index state on existing dependencies.

**Review evidence:** Original independent audit Q09 SAFE; unchanged in the independent re-review and later final review.

**SQL-block SHA256:** 4e2f98efab6c3f887dae71dc7b38ad10ca907edf11de5fd76a63f6af55205c35.

**Exact reviewed SQL — manual execution only:**

```sql
SELECT n.nspname,c.relname,k.conname,k.contype,k.convalidated,k.condeferrable,k.condeferred,
 k.conkey,k.confrelid,k.confkey,k.confupdtype,k.confdeltype,
 pg_catalog.pg_get_constraintdef(k.oid) AS definition,
 i.indisunique,i.indisvalid,i.indisready,i.indimmediate,pg_catalog.count(*) OVER() AS rows_total
FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid
JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
LEFT JOIN pg_catalog.pg_index i ON i.indexrelid=k.conindid
WHERE n.nspname IN('identity','tenancy') AND c.relname IN('users','supabase_users','agencies',
 'memberships','roles','membership_roles','role_permissions','clients','vehicles','audit_events')
AND k.contype IN('p','u','f') ORDER BY n.nspname,c.relname,k.conname LIMIT 500;
```

**Expected output columns (in order):** nspname, relname, conname, contype, convalidated, condeferrable, condeferred, conkey, confrelid, confkey, confupdtype, confdeltype, definition, indisunique, indisvalid, indisready, indimmediate, rows_total.

**Bounds and truncation:** LIMIT 500 and count(*) OVER() on the full selected set. Compare rows_total to complete returned/exported rows; zero rows has no count. Export/grid cell and row truncation remain possible.

**Interpretation:** conkey/confkey are attribute-number arrays; map them with prior Q03 catalog evidence. confrelid is a relation OID, not a customer identifier. For foreign keys conindid refers to the referenced supporting index; i flags do not alone prove the intended tenant composite key or all local-side indexes. Review column order, validation, deferrability and update/delete actions. NULL index metadata can be missing/unsupported evidence, not approval. Missing relations/constraints are not synthesized: compare against the required inventory. No CHECK/default definitions are selected.

**Stop conditions:** Stop for missing required PK/UNIQUE/FK or unexpected tenant column order/reference/actions, unvalidated or unexpected deferrable constraints, unexpected invalid/unready index state, ambiguous metadata, errors or truncation. Do not create/rebuild/validate constraints as part of collection. Common target/executor/custody conditions also apply.

## Q10

**Purpose:** Inspect exact policy and trigger shape, firing-mode metadata and trigger function security/fingerprint evidence without returning raw bodies/predicates/arguments.

**Review evidence:** Original Q10 required revision. The independent re-review Q10 section classified this remediated SQL SAFE; final Q16 review carries it forward. Current block matches the retained re-review SQL exactly.

**SQL-block SHA256:** 9470daee155e5f3f4411f0e971f971e08a8609305f6fc3ae0e6d321e1050b6bd.

**Exact reviewed SQL — manual execution only:**

```sql
WITH wanted(schema_name,table_name) AS (VALUES ('identity','users'),('identity','supabase_users'),
 ('tenancy','agencies'),('tenancy','memberships'),('tenancy','roles'),('tenancy','membership_roles'),
 ('tenancy','role_permissions'),('tenancy','clients'),('tenancy','vehicles'),('tenancy','audit_events'),
 ('tenancy','rental_contracts'),('app_private','rental_numbers'),('app_private','rental_creation_receipts'),('app_private','rental_confirmation_receipts')),
targets AS (SELECT c.oid,c.relname,n.nspname FROM wanted w JOIN pg_catalog.pg_namespace n ON n.nspname=w.schema_name
 JOIN pg_catalog.pg_class c ON c.relnamespace=n.oid AND c.relname=w.table_name),
found AS (
SELECT 'policy' AS kind,c.nspname,c.relname,p.polname::pg_catalog.text AS name,
 pg_catalog.jsonb_build_object('command',p.polcmd,'permissive',p.polpermissive,
 'policy_oid',p.oid,'table_oid',p.polrelid,
 'roles',ARRAY(SELECT CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(r)::pg_catalog.text END FROM pg_catalog.unnest(p.polroles) r),
 'using_node_sha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.polqual::pg_catalog.text,'UTF8')),'hex'),
 'check_node_sha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.polwithcheck::pg_catalog.text,'UTF8')),'hex')) AS metadata
FROM pg_catalog.pg_policy p JOIN targets c ON c.oid=p.polrelid
UNION ALL
SELECT 'trigger',c.nspname,c.relname,t.tgname::pg_catalog.text,
 pg_catalog.jsonb_build_object('enabled',t.tgenabled,'type',t.tgtype,'function_oid',t.tgfoid,
 'trigger_oid',t.oid,'table_oid',t.tgrelid,'internal',t.tgisinternal,'parent_trigger_oid',t.tgparentid,
 'update_column_attnums',t.tgattr::pg_catalog.text,'argument_count',t.tgnargs,
 'argument_sha256',pg_catalog.encode(pg_catalog.sha256(t.tgargs),'hex'),
 'constraint_oid',t.tgconstraint,'constraint_table_oid',t.tgconstrrelid,'constraint_index_oid',t.tgconstrindid,
 'deferrable',t.tgdeferrable,'initially_deferred',t.tginitdeferred,'old_transition_name',t.tgoldtable,'new_transition_name',t.tgnewtable,
 'replication_role',pg_catalog.current_setting('session_replication_role'),
 'enabled_for_current_replication_role',t.tgenabled='A' OR
   (t.tgenabled='O' AND pg_catalog.current_setting('session_replication_role') IN('origin','local')) OR
   (t.tgenabled='R' AND pg_catalog.current_setting('session_replication_role')='replica'),
 'function_schema',fn.nspname,'function_name',f.proname,'input_types',f.proargtypes::pg_catalog.text,
 'function_owner',pg_catalog.pg_get_userbyid(f.proowner),'security_definer',f.prosecdef,'language_oid',f.prolang,
 'volatility',f.provolatile,'parallel',f.proparallel,'strict',f.proisstrict,'leakproof',f.proleakproof,'support_oid',f.prosupport,
 'configuration_keys',ARRAY(SELECT CASE WHEN pg_catalog.split_part(s.setting,'=',1) ~ '^[a-z_][a-z_0-9.]*$'
   THEN pg_catalog.split_part(s.setting,'=',1) ELSE '<invalid-key-withheld>' END FROM pg_catalog.unnest(f.proconfig) s(setting)),
 'hardened_settings_exact',f.proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on']::pg_catalog.text[]
   AND pg_catalog.cardinality(f.proconfig)=2,
 'source_sha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.replace(f.prosrc,E'\r\n',E'\n'),'UTF8')),'hex'),
 'parsed_body_node_sha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(f.prosqlbody::pg_catalog.text,'UTF8')),'hex'),
 'binary_reference_sha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(f.probin,'UTF8')),'hex'),
 'when_node_sha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(t.tgqual::pg_catalog.text,'UTF8')),'hex'))
FROM pg_catalog.pg_trigger t JOIN targets c ON c.oid=t.tgrelid
JOIN pg_catalog.pg_proc f ON f.oid=t.tgfoid JOIN pg_catalog.pg_namespace fn ON fn.oid=f.pronamespace
)
SELECT *,pg_catalog.count(*) OVER() AS rows_total FROM found ORDER BY kind,nspname,relname,name LIMIT 1000;
```

**Expected output columns (in order):** kind, nspname, relname, name, metadata (JSONB), rows_total.

**Bounds and truncation:** One final LIMIT 1000/count over the combined policy/trigger UNION ALL, not separate branch counts. JSON/array cells have no byte cap. Compare full received count to rows_total and preserve complete JSON.

**Interpretation:** Includes internal and user triggers. A/O/R/D firing enablement is interpreted for current session_replication_role (local acts like origin); true only means enabled for that mode, not that WHEN/event/column/deferral/body enforces tenant rules. Missing targets emit no rows: compare to Q03 and expected inventory; new rental targets are expected absent before deployment. SHA256 fingerprints of node/source/arguments/WHEN/binary reference are drift hints, not semantic or cross-cluster equivalence or library-byte checks. No raw policy/body/args are exposed. hardened_settings_exact is spelling-sensitive and may be NULL; false can be a conservative false negative. Unknown settings keys/hashes need review, not configuration changes.

**Stop conditions:** Stop for missing expected policies/triggers, unexpected disabled/replica-only enforcement or security owner/settings metadata, unknown required fingerprints, unexpected scope or NULL evidence, errors or truncated JSON/results. Stop for semantic reconciliation without deparsing raw sensitive predicates/source or changing triggers. Common target/executor/custody conditions also apply.

## Q11

**Purpose:** Discover scoped rental object-name collisions across relations, functions, types, policies, constraints and triggers.

**Review evidence:** Original independent audit Q11 SAFE, unchanged and carried forward in later independent reviews.

**SQL-block SHA256:** 373752f181f4588017eabe9881a29019e4aed849aec3b8e3984a5dca1526a50a.

**Exact reviewed SQL — manual execution only:**

```sql
WITH found AS (
 SELECT 'relation'::pg_catalog.text AS kind,n.nspname,c.relname::pg_catalog.text AS name,c.relkind::pg_catalog.text AS detail
 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname IN('tenancy','app_private','public') AND c.relname LIKE 'rental%'
 UNION ALL SELECT 'function',n.nspname,p.proname::pg_catalog.text,p.proargtypes::pg_catalog.text
 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
 WHERE (n.nspname='app_private' AND p.proname LIKE 'rental%') OR (n.nspname='public' AND p.proname LIKE 'contratpro_rental%')
 UNION ALL SELECT 'type',n.nspname,t.typname::pg_catalog.text,t.typtype::pg_catalog.text
 FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace
 WHERE n.nspname IN('tenancy','app_private','public') AND (t.typname LIKE 'rental%' OR t.typname LIKE '_rental%')
 UNION ALL SELECT 'policy',n.nspname,p.polname::pg_catalog.text,c.relname::pg_catalog.text
 FROM pg_catalog.pg_policy p JOIN pg_catalog.pg_class c ON c.oid=p.polrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname IN('identity','tenancy','app_private') AND p.polname LIKE 'rental%'
 UNION ALL SELECT 'constraint',n.nspname,k.conname::pg_catalog.text,c.relname::pg_catalog.text
 FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname IN('tenancy','app_private') AND k.conname LIKE 'rental%'
 UNION ALL SELECT 'trigger',n.nspname,t.tgname::pg_catalog.text,c.relname::pg_catalog.text
 FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname IN('tenancy','app_private') AND t.tgname LIKE 'rental%'
)
SELECT *,pg_catalog.count(*) OVER() AS rows_total FROM found ORDER BY kind,nspname,name,detail LIMIT 1000;
```

**Expected output columns (in order):** kind, nspname, name, detail, rows_total.

**Bounds and truncation:** LIMIT 1000 with one final count over all six UNION ALL branches. Compare rows_total with complete exported rows. Multiple rows for overloads/namespaces/object kinds are expected, not duplicate proof.

**Interpretation:** Any result is a collision candidate needing reconciliation; no reuse/drop/overwrite follows. Function detail contains input type OIDs, not fully deparsed qualified type names. Policy/constraint/trigger detail is owning table name; relation detail is relkind; type detail is typtype. Scoped filters differ by object class and are intentionally preserved. Underscores in LIKE patterns are single-character wildcards, allowing broader matches; false positives need review. Empty result proves only scoped snapshot absence, not absence in other schemas, complete dependencies or correct PostgREST dispatch.

**Stop conditions:** Stop on any unexplained collision candidate, missing target context, errors or incomplete output. Do not create/reuse/remove objects or weaken collision gates to proceed. Common target/executor/custody conditions also apply.

## Q12

**Purpose:** Inspect installed extension name/version/schema and effective SQL/plpgsql language USAGE for the current executor.

**Review evidence:** Original independent audit Q12 SAFE; unchanged and carried forward through later independent reviews.

**SQL-block SHA256:** 64744d31bd0253a146f293652b78232f26a76abd72b911064d206e8cf8e70b75.

**Exact reviewed SQL — manual execution only:**

```sql
SELECT 'extension' AS kind,e.extname AS name,e.extversion::pg_catalog.text AS version,
 n.nspname::pg_catalog.text AS schema_name,NULL::pg_catalog.boolean AS executor_usage
FROM pg_catalog.pg_extension e JOIN pg_catalog.pg_namespace n ON n.oid=e.extnamespace
UNION ALL
SELECT 'language',l.lanname,NULL,NULL,pg_catalog.has_language_privilege(current_user,l.oid,'USAGE')
FROM pg_catalog.pg_language l WHERE l.lanname IN('sql','plpgsql') ORDER BY kind,name LIMIT 200;
```

**Expected output columns (in order):** kind, name, version, schema_name, executor_usage.

**Bounds and truncation:** Final LIMIT 200 across both UNION ALL branches, no rows_total. If 200 rows are returned or platform output is truncated, stop: completeness is unknown. Verify both sql and plpgsql rows explicitly; absence cannot be inferred safe. Zero rows is missing required evidence.

**Interpretation:** Extension rows have executor_usage=NULL deliberately; this is not denied EXECUTE. Language rows have NULL version/schema_name deliberately. Installed extensions are not automatically required/trusted; their schema/version need reconciliation if unexpected. No btree_gist installation is required by the reviewed design. USAGE does not prove ownership transfer, role creation or full migration DDL authority. Keep executor identity established independently because this query does not return session_user/current_user.

**Stop conditions:** Stop for missing sql/plpgsql, false/ambiguous required language USAGE, unexpected extension version/schema, output reaching 200, errors, context mismatch or truncation. Do not install extensions or grant language privileges. Common target/executor/custody conditions also apply.

