# Rental Contracts Phase 1A — Exact ownership scope design

**OFFLINE DESIGN AND SYNTHETIC TESTS ONLY. Production Migration / Deployment: NO-GO.**
No SQL was executed or generated as a deployment candidate. The original guarded
draft, manifest, validator, regression suite and existing evidence remain unchanged.

## Reviewed sources and confirmed risk

Read the [draft](../supabase/migration-drafts/20261120001300_rental_contracts.sql),
[manifest](../packages/infrastructure/database/manifests/rental-contracts-phase1a.json),
[validator](../packages/infrastructure/database/manifests/rental-contracts-phase1a.mjs),
[existing regression tests](../packages/infrastructure/database/tests/rental-contracts-manifest.test.mjs)
and [remediation plan](rental-contracts-phase1a-remediation-plan.md).

Draft lines373–385 scan pg_proc/pg_namespace using rental_* and contratpro_rental_*
prefixes, then revoke grants, transfer ownership and expose public matches to
authenticated. That can affect pre-existing unrelated functions/overloads with those
prefixes. It does not assert an exact18-object set. The existing manifest correctly
marks this UNSAFE_UNVERIFIED_PREFIX_LOOP; an unchanged-source PASS is not loop safety.
The intended owner/grants extracted from templates are declarations, not actual rights.

## Exact eighteen-object contract

Every argument type below is explicitly schema-qualified. Integer/bigint/boolean SQL
aliases are represented by pg_catalog.int4/int8/bool. Zero-argument trigger functions
are identities ending in (); trigger arguments are not SQL input arguments.

| # | Exact function identity | Return type | Security | Intended non-owner EXECUTE |
|---|---|---|---|---|
| 1 | app_private.rental_member(pg_catalog.uuid) | pg_catalog.uuid | INVOKER | none |
| 2 | app_private.rental_receipt_immutable() | pg_catalog.trigger | INVOKER | none |
| 3 | app_private.rental_history_guard() | pg_catalog.trigger | INVOKER | none |
| 4 | app_private.rental_price(pg_catalog.timestamptz,pg_catalog.timestamptz,pg_catalog.numeric,pg_catalog.numeric) | pg_catalog.int4 | INVOKER | none |
| 5 | app_private.rental_input(pg_catalog.jsonb) | pg_catalog.jsonb | INVOKER | none |
| 6 | app_private.rental_number(pg_catalog.uuid,pg_catalog.timestamptz) | pg_catalog.int8 | INVOKER | none |
| 7 | app_private.rental_lock(pg_catalog.uuid,pg_catalog.uuid) | pg_catalog.void | INVOKER | none |
| 8 | app_private.rental_available(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.uuid,pg_catalog.timestamptz,pg_catalog.timestamptz) | pg_catalog.void | INVOKER | none |
| 9 | public.contratpro_rental_create(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.jsonb) | pg_catalog.jsonb | DEFINER | authenticated, without grant option |
| 10 | public.contratpro_rental_detail(pg_catalog.uuid,pg_catalog.uuid) | pg_catalog.jsonb | DEFINER | authenticated, without grant option |
| 11 | public.contratpro_rental_list(pg_catalog.uuid,pg_catalog.int4) | pg_catalog.jsonb | DEFINER | authenticated, without grant option |
| 12 | app_private.rental_change(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid,pg_catalog.text,pg_catalog.jsonb) | pg_catalog.jsonb | INVOKER | none |
| 13 | public.contratpro_rental_update_draft(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid,pg_catalog.jsonb) | pg_catalog.jsonb | DEFINER | authenticated, without grant option |
| 14 | public.contratpro_rental_confirm(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid) | pg_catalog.jsonb | DEFINER | authenticated, without grant option |
| 15 | public.contratpro_rental_start(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid) | pg_catalog.jsonb | DEFINER | authenticated, without grant option |
| 16 | public.contratpro_rental_complete(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid,pg_catalog.bool) | pg_catalog.jsonb | DEFINER | authenticated, without grant option |
| 17 | public.contratpro_rental_cancel(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid) | pg_catalog.jsonb | DEFINER | authenticated, without grant option |
| 18 | public.contratpro_rental_extend(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid,pg_catalog.jsonb) | pg_catalog.jsonb | DEFINER | authenticated, without grant option |

All18 have intended final owner contratpro_rental_writer, pinned search_path=pg_catalog,pg_temp
and row_security=on. Nine public functions are DEFINER and nine private helpers INVOKER.
These are proposed source expectations, not observed Production final state. Membership
in the owner role or inherited/PUBLIC access is a separate effective-privilege question.

## Minimal replacement algorithm — no migration implementation yet

1. Freeze the explicit eighteen identities above as the only ownership/ACL target
   allowlist. Do not discover targets by prefix, role ownership or a general schema scan.
   Require18 distinct signatures and no extra request entries. Bind this list to the
   approved source/manifest and independently review any future change.
2. Before function creation, verify exact targets are absent. An existing exact identity
   is a collision, never authority to reuse/replace it. Conservatively reject unexpected
   overloads with an identical target schema/name but different argument vector. Other
   unrelated matching-prefix names are allowed to exist but are never targets.
3. Resolve the exact pg_catalog type identities to OIDs, without hardcoded numeric
   Production OIDs or search_path-dependent aliases. For each function require exactly
   one namespace/name/proargtypes identity and prokind=f. to_regprocedure may resolve
   a fully qualified identity, but NULL, errors or a non-function result fail closed.
   Check no duplicated signatures, type mappings or resolved function OIDs.
4. After creating functions and before any owner/ACL mutation, validate ALL18 targets.
   Compare exact input modes/defaults/names/variadic status, return type, language,
   SECURITY mode, settings and definition identity to the approved draft. Require the
   actual initial owner to match an independently established migration creator; do
   not assume postgres/superuser or accept a pre-existing owner as evidence of creation.
5. Obtain approved initial explicit ACL/default expectations independently of the
   observed target ACLs. Compare complete snapshots, including custom/default grantees
   and grant options; unexpected access stops the release. Do not populate the expected
   snapshot automatically from whatever access is observed.
6. Only after every precondition passes, construct a fixed18-operation plan containing
   each resolved OID, fully qualified signature, verified initial owner/ACL baseline,
   intended final owner and intended non-owner EXECUTE set. No partial plan is executed
   during validation. Each operation in a future candidate addresses its exact allowlist
   identity; safe identifier/type formatting must preserve qualification independently
   of session search_path. A broad pg_proc loop must not reappear.
7. Use only an independently verified authorized ownership/grantor path. Apply ACL
   closure to these newly created targets only; transfer ownership and grant/revoke as
   their actual authorized role. Public explicit non-owner EXECUTE is authenticated
   without grant option; private explicit non-owner EXECUTE is empty. Owner implicit
   management/execute rights and inherited privileges are separate and must be checked.
   No schema-wide/default-ACL changes or unrelated object revocations follow from this plan.
8. Recheck target OIDs/signatures/definitions/settings, final owner and complete effective/
   explicit ACL boundaries. Restore original session role and every temporary membership
   and schema privilege exactly, including grantor/ADMIN/SET/INHERIT options. Verify
   unrelated object owner/ACL/body/settings snapshots unchanged. Any failure aborts
   the future single release transaction, including history and authority changes.

This is selection/verification design, not an executable authority recipe. Exact target
selection alone does not solve the release transaction, history serialization or role
permissions. Resolve those P0 requirements before preparing a new candidate; retain the
original abort/ROLLBACK guard. No extra role membership or grant is proposed here.

## Fail-closed decisions and noninterference

| Situation | Design outcome |
|---|---|
| Missing target/type, extra requested identity or duplicate | Reject the whole plan; no earlier target may be mutated |
| Exact identity exists before release creation | Collision; stop, do not reuse or CREATE OR REPLACE |
| Unexpected overload of one of the18 schema/names | Conservative stop; overload remains untouched |
| Unrelated matching-prefix function with different name | Ignore for target selection; preserve owner/ACL/body/settings |
| Wrong creator/owner, kind, return/security/settings or initial ACL | Stop before ownership actions |
| Unknown function/type/owner identity, evidence or permission | Stop; do not substitute privileges or defaults |
| Unauthorized final EXECUTE/PUBLIC/grant option or unrelated mutation | Reject projected/final state; real candidate must roll back |
| New/missing/replaced OID or concurrent target drift | Stop; reconcile under independently reviewed locking/transaction controls |

All18 names happen to be unique within their schemas; this does not justify selecting
by name alone. The explicit argument vectors remain mandatory. Default arguments are
not alternate ownership identities, but must match the approved API definition.

## Separate Production evidence and authorization prerequisites

- Actual project/database/executor/session identity and role attributes; no inference
  from SQL Editor being labeled postgres or prior local SUPERUSER bootstrap.
- Current function ownership, inherited owner authority, ability to SET the intended
  new owner, required schema CREATE/USAGE, language/type/helper privileges and the
  authorized grantor after transfer. ADMIN, SET and INHERIT are not interchangeable.
- Existing authorized SET paths first; any temporary membership requires an exact
  separately reviewed path and restoration. No membership options are guessed here.
- Final writer NOLOGIN/NOBYPASSRLS/no unwanted memberships, restricted effective grants
  and actual default ACL behavior. row_security=on does not remove SUPERUSER/BYPASSRLS.
- Independent initial/final ACL expectations, owner entries/grantors/grant options and
  PUBLIC/inherited rights. Function ownership changes do not by themselves certify
  the final ACL. The simulator deliberately represents only explicit non-owner ACLs.
- Current helper/trigger/RLS behavior, exact deployed definitions and genuine auth
  restricted execution. SECURITY DEFINER owners/settings are checked as metadata
  expectations here; tenant isolation is not exercised by these tests.
- Stable release window, object/dependency guards and migration-history transaction/
  serialization/recovery. A same-snapshot lookup cannot rule out later concurrent DDL.
  Real PG17 DDL locks, rollback and non-superuser owner transfers need a separate
  authorized rehearsal. A cooperative migration lock alone does not constrain all DDL.

Supplying existing artifacts may enable offline review. Any fresh database collection,
rehearsal, privilege operation or migration needs separate authorization. Q14 remains
BLOCKED. Neither this design nor test success constitutes deployment/activation approval.

## Database-free synthetic tests

New file: [ownership-scope test model](../packages/infrastructure/database/tests/rental-contracts-ownership-scope.test.mjs).
It contains an explicit target list, pure scope-plan validation and projected-state
comparison, with in-memory catalog fixtures. It imports only Node utilities and the
existing offline parser inventory; no database client or SQL executor is imported.

The design tests independently compare all18 signature/return/security records against
both the unchanged draft inventory and manifest. Synthetic type/function OIDs and
fixture_executor are invented fixture identifiers, explicitly NOT Production evidence.
The initial PUBLIC EXECUTE fixture is an approved synthetic snapshot example, not an
assertion about Supabase defaults. Outputs are descriptors labeled simulationOnly and
authority=UNVERIFIED_NOT_SIMULATED; they are never SQL or real mutations.

Tests cover matching-prefix non-target preservation; exact pre-existing collisions;
unexpected overloads; missing/extra/substituted/duplicate requests; duplicate function
OIDs/catalog rows/type mappings; missing type identities; wrong/missing owners; procedure
substitution; return/security/settings changes; initial/final unauthorized EXECUTE and
grant options; absent ACL baseline; tampered plan; unrelated owner/ACL changes; target
body/OID replacement. Late errors preserve the complete input fixture unchanged.

**Results:30/30 PASS.** Exact command run from repository root:

    node --test packages/infrastructure/database/tests/rental-contracts-ownership-scope.test.mjs

Additional checks: node --check on that file; targeted ESLint with zero warnings; direct
Markdown links/whitespace and git diff --check. No actual PostgreSQL type resolution,
SET ROLE, ownership/ACL operation, catalog locking, inheritance/RLS, migration history
or rollback was executed. These are simulated negative tests, not real PG17 validation.
The new .test.mjs suite requires the explicit command; the existing Vitest .test.ts
include pattern is not changed by this task.

## Remaining limitations and next step

The test model is intentionally a reference design, not a reusable deployment executor.
Its projection check assumes a supplied before/after fixture and cannot prove that
a real server preserved anything. ACL fixtures omit actual owner-implicit and role
closure semantics; definition stamps are synthetic, not deployed body hashes.
Catalog fixtures also do not model argument names/defaults/modes/variadic flags or
language/parallel/leakproof attributes; the full future preconditions above exceed
this narrow scope simulator. Those properties require source/catalog evidence and
separately reviewed checks, not an inference from the fixture tests. Existing
procedural/dynamic dependency, generated-name, catalog-size and Q16 truncation limits
remain. No actual migration authority was established and the broad draft loop is
still present/unsafe.

Next: independently review this exact-object algorithm and negative fixtures, then
close the executor/owner/grantor/default-ACL evidence gaps before separately authorizing
a new transactional release candidate or non-superuser rehearsal. Do not patch the
original guarded draft, remove its guard or deploy based on this design.

**Production Migration / Deployment remains NO-GO.**
