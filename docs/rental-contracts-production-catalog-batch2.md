# Production catalog evidence collection — Batch 2 (Q05–Q08)

**PREPARED OFFLINE ONLY — NO QUERY EXECUTED BY CODEX.**
**Production deployment remains BLOCKED / NO-GO.** Q14 remains excluded/BLOCKED.
This batch contains only four separate metadata queries, Q05, Q06, Q07, Q08, in that
order. Never combine them into one script. No automatic next batch or deployment.

## Target, provenance and prior evidence

Intended Supabase Production project: **gllsiklbvqpxzucvkehw** (user supplied).
Independently confirm this identifier in the trusted dashboard before every query.
Confirm the intended database and approved SQL Editor executor; do not infer target
identity from SQL output or a repository file. Codex made no connection.

Canonical SQL: [query review](rental-contracts-production-catalog-query-review.md).
Current package SHA256: fd235793ae7e311f889b44b7e2c8626bc31bbdfba0eee54b3740d5bd4c8a368e.
Independent evidence: [original audit](rental-contracts-production-catalog-independent-audit.md),
[independent re-review](rental-contracts-production-catalog-independent-rereview.md),
[final Q16 review](rental-contracts-production-catalog-q16-independent-final-review.md).
The [remediation record](rental-contracts-production-catalog-remediation.md) is author
history, not independent approval. Whole-package fingerprints changed for unrelated
Q16/Q03 corrections; exact Batch 2 block continuity is documented in
[offline verification](rental-contracts-production-catalog-batch2-verification.md).

User-reported prior evidence: Q01/Q02 successful; corrected Q03 successful with 532
CSV rows; Q04 successful with zero rows. Those results were not inspected or validated
in this task. Do not rerun Batch 1. Its [original guide](rental-contracts-production-catalog-batch1.md)
contains stale Q03; preserve that history and the separate corrected-rerun evidence.

## Manual sequential controls and evidence custody

1. Confirm separate controlled authorization, target project/database, approved Editor
   identity and existing platform timeout controls. Do not add transaction/session/role
   commands or request permissions to obtain a result.
2. Use the same approved executor context as verified Q01 evidence. These queries do
   not return independent session_user/current_user context. If the session/selection
   changed or identity cannot be confirmed, stop for review. Editor identity is not
   proof of actual future migration-executor authority.
3. Run exactly one complete SQL block at a time, Q05 then Q06 then Q07 then Q08.
   Save and review each result before proceeding. Queries are separate snapshots;
   no shared transaction or stability guarantee is implied. Do not modify their SQL.
4. Save query ID, SQL hash, UTC timestamp/offset, non-secret project/database label,
   confirmed selected/actual-role evidence, exact column headers/order, all returned
   rows, returned/exported count, rows_total where available, errors/SQLSTATE and warnings.
   Preserve JSON/array/ACL cells and NULL values. Label operator-recorded time if the
   Editor supplies no execution timestamp. Zero rows must retain column headers.
5. Save only to the approved restricted evidence channel; names/ACLs/hashes are
   operationally sensitive. No tokens, credentials, connection strings, customer rows,
   raw function definitions/configuration or unrelated Editor history. Do not publish
   unexpected sensitive identifiers: stop, withhold that output and record incomplete
   evidence. No results are written to the repository by this preparation.
6. Stop for any error/warning needing review, timeout, permissions denial, unexpected
   context/results, unresolved required evidence or truncation. Do not retry, change
   permissions, switch roles or rewrite SQL to force success. Stop after Q08 for review.

## Eligibility

Q05 SAFE; Q06 SAFE; Q07 SAFE; Q08 SAFE — limited read-only metadata collection
candidates only. Exact-match source and review continuity passed offline. PostgreSQL
17.11 execution, provider permissions and Production objects remain UNVERIFIED.

## Q05

**Purpose:** Inspect the exact canonical/JWT helper identities, owners, security attributes, effective EXECUTE/grant option, filtered configuration and implementation drift evidence.

**Review evidence:** Q05 was NEEDS REVISION in the original audit, then independently SAFE in independent-rereview.md, section Q05. Current SQL is byte-identical to the retained 8c7627… re-review snapshot; the later final Q16 review carries that verdict forward.

**SQL-block SHA256:** 0ebdfe781a44ede2d99a3835be7f86c2a8cda961ddbe7f8ffac27910234d3e04.

**Exact reviewed SQL — manual execution only:**

```sql
WITH required(signature) AS (VALUES ('app_private.canonical_auth_user()'),('app_private.receipt_auth_uid()')),
roles AS (SELECT oid,rolname FROM pg_catalog.pg_roles WHERE rolname IN
 (current_user,'postgres','anon','authenticated','contratpro_rental_writer'))
SELECT x.signature,p.oid IS NOT NULL AS present,p.oid,pg_catalog.pg_get_userbyid(p.proowner) AS owner,
 pn.nspname AS function_schema,p.proname,p.proowner,owner_role.rolsuper AS owner_superuser,
 owner_role.rolbypassrls AS owner_bypassrls,owner_role.rolcanlogin AS owner_login,
 p.prokind,p.prosecdef,p.provolatile,p.proparallel,p.proisstrict,p.proleakproof,p.proretset,p.procost,p.prorows,
 p.prosupport,p.provariadic,p.pronargdefaults,p.proargnames,p.proargmodes,
 p.proargtypes::pg_catalog.text,p.proallargtypes,
 p.prorettype,p.proacl::pg_catalog.text AS explicit_acl,l.lanname,r.rolname,
 pg_catalog.cardinality(p.proconfig) AS configuration_entry_count,
 (p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on']::pg_catalog.text[]
  AND pg_catalog.cardinality(p.proconfig)=2) IS TRUE AS hardened_two_settings_exact,
 pg_catalog.has_function_privilege(r.oid,p.oid,'EXECUTE') AS effective_execute,
 pg_catalog.has_function_privilege(r.oid,p.oid,'EXECUTE WITH GRANT OPTION') AS execute_grant_option,
 pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.replace(p.prosrc,E'\r\n',E'\n'),'UTF8')),'hex') AS source_sha256,
 p.prosqlbody IS NOT NULL AS has_parsed_sql_body,
 pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosqlbody::pg_catalog.text,'UTF8')),'hex') AS parsed_body_node_sha256,
 p.probin IS NOT NULL AS has_binary_reference,
 pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.probin,'UTF8')),'hex') AS binary_reference_sha256,
 (SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
   'key',CASE WHEN pg_catalog.split_part(s.setting,'=',1) ~ '^[a-z_][a-z_0-9.]*$'
     THEN pg_catalog.split_part(s.setting,'=',1) ELSE '<invalid-key-withheld>' END,
   'approved_value',CASE WHEN s.setting IN('search_path=pg_catalog, pg_temp','search_path=pg_catalog,pg_temp','row_security=on','row_security=off')
     THEN pg_catalog.substr(s.setting,pg_catalog.strpos(s.setting,'=')+1) ELSE NULL END,
   'unexpected_value_withheld',s.setting NOT IN('search_path=pg_catalog, pg_temp','search_path=pg_catalog,pg_temp','row_security=on','row_security=off')) ORDER BY s.setting)
  FROM pg_catalog.unnest(p.proconfig) s(setting)) AS configuration_metadata,
 (SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('origin',ip.privtype,'initial_acl',ip.initprivs::pg_catalog.text))
  FROM pg_catalog.pg_init_privs ip WHERE ip.classoid='pg_catalog.pg_proc'::pg_catalog.regclass AND ip.objoid=p.oid AND ip.objsubid=0) AS initial_privilege_metadata,
 (SELECT pg_catalog.jsonb_agg(e.extname ORDER BY e.extname) FROM pg_catalog.pg_depend d
  JOIN pg_catalog.pg_extension e ON e.oid=d.refobjid WHERE d.classid='pg_catalog.pg_proc'::pg_catalog.regclass
  AND d.objid=p.oid AND d.refclassid='pg_catalog.pg_extension'::pg_catalog.regclass AND d.deptype='e') AS extension_membership
FROM required x LEFT JOIN pg_catalog.pg_proc p ON p.oid=pg_catalog.to_regprocedure(x.signature)
LEFT JOIN pg_catalog.pg_namespace pn ON pn.oid=p.pronamespace
LEFT JOIN pg_catalog.pg_roles owner_role ON owner_role.oid=p.proowner
LEFT JOIN pg_catalog.pg_language l ON l.oid=p.prolang CROSS JOIN roles r ORDER BY x.signature,r.rolname;
```

**Expected output:** one result set; columns in order: signature, present, oid, owner, function_schema, proname, proowner, owner_superuser, owner_bypassrls, owner_login, prokind, prosecdef, provolatile, proparallel, proisstrict, proleakproof, proretset, procost, prorows, prosupport, provariadic, pronargdefaults, proargnames, proargmodes, proargtypes, proallargtypes, prorettype, explicit_acl, lanname, rolname, configuration_entry_count, hardened_two_settings_exact, effective_execute, execute_grant_option, source_sha256, has_parsed_sql_body, parsed_body_node_sha256, has_binary_reference, binary_reference_sha256, configuration_metadata, initial_privilege_metadata, extension_membership. Preserve all structured cells and NULLs.

**Limits/truncation:** No explicit LIMIT or rows_total. Two required signatures multiplied by at most five existing distinct named roles yield at most ten outer rows. Nested config/initial-ACL/extension aggregates and string/JSON/array sizes have no byte cap; exported cells must be complete.

**Interpretation:** Missing helpers remain present=false via LEFT JOIN; roles emits only existing roles. to_regprocedure resolves exact zero-input signatures, not helper execution. Stored ACL differs from effective EXECUTE. Unknown config values are withheld; only four literal-approved settings reveal values. Configuration keys remain operational metadata. hardened_two_settings_exact accepts only the spaced search_path spelling: FALSE can be a conservative false negative, not proof of unsafe behavior. Unknown fingerprints must be reconciled; source/parsed-body/binary-reference hashes do not prove complete semantic equivalence, library bytes or cross-cluster identity. pg_init_privs is initial provenance, not current/effective ACL. The helpers are existing dependencies, not presumed identical to new rental entrypoints.

**Stop conditions:** Stop for missing required helper, unexpected owner/language/security attributes/ACL or EXECUTE, unknown hashes/settings needing review, ambiguous NULL evidence, wrong role context or truncated config/array/JSON/hash cells. Do not expose raw proconfig/source to resolve drift. Apply the common target/identity/custody rules above.

## Q06

**Purpose:** Inspect required built-in, row, rental and dependency-column types, owners, ACL and effective USAGE.

**Review evidence:** Q06 independently SAFE in independent-audit.md. Current SQL matches that retained 337782… audited snapshot and the later 8c7627… snapshot; unchanged SAFE verdict carried forward.

**SQL-block SHA256:** 4db707bb6c8700024ad366f6d753b78957e461020699a9b4d4c8426ce90974e3.

**Exact reviewed SQL — manual execution only:**

```sql
SELECT n.nspname,t.typname,t.oid,t.typtype,t.typbasetype,t.typrelid,
 pg_catalog.pg_get_userbyid(t.typowner) AS owner,t.typacl::pg_catalog.text AS explicit_acl,
 r.rolname,pg_catalog.has_type_privilege(r.oid,t.oid,'USAGE') AS effective_usage,
 pg_catalog.count(*) OVER() AS rows_total
FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace
CROSS JOIN pg_catalog.pg_roles r
WHERE ((n.nspname='pg_catalog' AND t.typname IN('uuid','jsonb','text','int4','int8','numeric','timestamptz','tstzrange','bool'))
 OR (n.nspname IN('identity','tenancy','app_private') AND (t.typname IN('users','supabase_users','agencies','memberships','clients','vehicles','audit_events') OR t.typname LIKE 'rental%'))
 OR t.oid IN(SELECT a.atttypid FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid
   JOIN pg_catalog.pg_namespace ns ON ns.oid=c.relnamespace WHERE a.attnum>0 AND NOT a.attisdropped
   AND ((ns.nspname='identity' AND c.relname IN('users','supabase_users')) OR
   (ns.nspname='tenancy' AND c.relname IN('agencies','memberships','roles','membership_roles','role_permissions','clients','vehicles','audit_events')))))
AND r.rolname IN(current_user,'postgres','authenticated','contratpro_rental_writer')
ORDER BY n.nspname,t.typname,r.rolname LIMIT 500;
```

**Expected output:** one result set; columns in order: nspname, typname, oid, typtype, typbasetype, typrelid, owner, explicit_acl, rolname, effective_usage, rows_total. Preserve all structured cells and NULLs.

**Limits/truncation:** LIMIT 500 with count(*) OVER(). Stop if rows_total exceeds complete returned/exported rows. If exactly 500 rows, verify the count and platform export limit before claiming completeness; zero rows has no rows_total value.

**Interpretation:** Column types are selected by exact atttypid joins in addition to named built-ins/row types and rental prefix. Type USAGE is not object ownership-transfer authority. Type metadata does not execute domain checks or user type I/O. Missing expected types/roles are not separately synthesized: reconcile the expected inventory and prior role evidence. An empty set does not prove dependencies absent or safe. OIDs are same-cluster snapshot metadata.

**Stop conditions:** Stop for missing expected type, unknown/custom/domain/base-type semantics needing reconciliation, unexpected owner/ACL/USAGE, context mismatch, errors or truncated results. Do not invoke custom casts/domain expressions or grant USAGE. Apply the common target/identity/custody rules above.

## Q07

**Purpose:** Inspect explicit global and relevant schema default ACL entries by creator, object kind, grantor/grantee and grant option.

**Review evidence:** Q07 independently SAFE in independent-audit.md; exact SQL retained through later reviews and matches both independently audited source snapshots.

**SQL-block SHA256:** 9dbfdabc6b574b84148a06e00a6727869ba03bc01274b2d896eeda4653119cfc.

**Exact reviewed SQL — manual execution only:**

```sql
SELECT pg_catalog.pg_get_userbyid(d.defaclrole) AS creating_owner,
 CASE WHEN d.defaclnamespace=0 THEN '<global>' ELSE n.nspname END AS target_schema,
 d.defaclobjtype,pg_catalog.pg_get_userbyid(a.grantor) AS grantor,
 CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(a.grantee)::pg_catalog.text END AS grantee,
 a.privilege_type,a.is_grantable,pg_catalog.count(*) OVER() AS rows_total
FROM pg_catalog.pg_default_acl d LEFT JOIN pg_catalog.pg_namespace n ON n.oid=d.defaclnamespace
LEFT JOIN LATERAL pg_catalog.aclexplode(d.defaclacl) a ON true
WHERE d.defaclnamespace=0 OR n.nspname IN('identity','tenancy','app_private','public','supabase_migrations')
ORDER BY creating_owner,target_schema,d.defaclobjtype,grantee,a.privilege_type LIMIT 1000;
```

**Expected output:** one result set; columns in order: creating_owner, target_schema, defaclobjtype, grantor, grantee, privilege_type, is_grantable, rows_total. Preserve all structured cells and NULLs.

**Limits/truncation:** LIMIT 1000 with count(*) OVER(). ACL expansion can multiply rows. Compare full returned/exported count to rows_total; zero rows does not supply a count.

**Interpretation:** Includes global entries for all creators plus entries in five target schemas. LEFT JOIN LATERAL preserves a default-ACL record even with no expanded grant; NULL expanded fields do not mean no default behavior. Absent pg_default_acl rows mean hardwired defaults, not denial. Global/per-schema defaults affect future objects created under that role; they are not current grants, historical effective privileges or proof of final ACL after transfer. PUBLIC is explicitly labeled for grantee=0; creator/grantor are role metadata.

**Stop conditions:** Stop for unexpected default grantees/grant options/creators/object kinds, ambiguous scope, sensitive role names, errors or incomplete export. Do not alter defaults or revoke grants based on this collection alone. Apply the common target/identity/custody rules above.

## Q08

**Purpose:** Inspect role membership edges, grantors and PG17 ADMIN/INHERIT/SET options reachable from relevant roles.

**Review evidence:** Q08 independently SAFE in independent-audit.md; exact SQL matches the retained original audit and later re-review snapshots. Later final review carries its accepted verdict forward.

**SQL-block SHA256:** c6d20eca74b9425532c84511c78228a292b6ed79a3327a8b7013837f0a68ed5c.

**Exact reviewed SQL — manual execution only:**

```sql
WITH RECURSIVE reachable(oid) AS (
 SELECT oid FROM pg_catalog.pg_roles WHERE rolname IN(current_user,'postgres','anon','authenticated',
 'authenticator','service_role','contratpro_runtime','contratpro_platform_runtime','contratpro_rental_writer')
 UNION SELECT m.roleid FROM pg_catalog.pg_auth_members m JOIN reachable r ON m.member=r.oid
)
SELECT pg_catalog.pg_get_userbyid(m.roleid) AS granted_role,pg_catalog.pg_get_userbyid(m.member) AS member,
 pg_catalog.pg_get_userbyid(m.grantor) AS grantor,m.admin_option,m.inherit_option,m.set_option,
 pg_catalog.count(*) OVER() AS rows_total
FROM pg_catalog.pg_auth_members m WHERE m.member IN(SELECT oid FROM reachable)
 OR m.roleid=pg_catalog.to_regrole('contratpro_rental_writer')
ORDER BY granted_role,member,grantor LIMIT 1000;
```

**Expected output:** one result set; columns in order: granted_role, member, grantor, admin_option, inherit_option, set_option, rows_total. Preserve all structured cells and NULLs.

**Limits/truncation:** LIMIT 1000 with count(*) OVER(). Recursive UNION on single OID eliminates repeat nodes and terminates over the finite role graph; it has no depth cap. LIMIT bounds output, not traversal/planner work. Existing approved timeouts remain necessary.

**Interpretation:** reachable(oid) seeds named existing roles and recursively follows m.member to m.roleid (ancestor roles). This intentionally follows edges regardless of usable options. Result reports edges from reachable members plus any edge granting the proposed rental writer. Rows are not proof of a usable SET/INHERIT path; interpret every per-edge option and exact executor separately. ADMIN does not equal SET or immediate inheritance. This is not all role edges in the cluster. Missing roles/empty results must be reconciled with Q01. Missing writer gives NULL to_regrole, not a reason to create it.

**Stop conditions:** Stop for unexpected role edges/options/grantors, pre-existing rental writer requiring collision review, missing/ambiguous role evidence, errors, timeout or truncated output. Do not test SET ROLE or change membership to make a capability appear. Apply the common target/identity/custody rules above.

