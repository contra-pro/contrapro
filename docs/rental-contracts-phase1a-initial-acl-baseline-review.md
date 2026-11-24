# Phase1A — Initial function ACL baseline review

**Verdict: BLOCKED. Production Migration / Deployment remains NO-GO.**
Offline, read-only source/evidence review. Only this new report was created. No SQL,
database connection, Production query, migration, role/ACL operation or code change
occurred. Q14 remains BLOCKED.

## Evidence inspected

- [Inactive SQL draft](../supabase/migration-drafts/20261120001300_rental_contracts.sql).
- [Exact ownership design](rental-contracts-phase1a-exact-ownership-scope-design.md),
  especially initial-ACL precondition at lines74–76 and failure table at109.
- [Consolidated readiness](rental-contracts-production-catalog-q01-q16-consolidated-readiness.md),
  Q07 row and P0 default-ACL/executor/authority gaps.
- [Evidence reconciliation](rental-contracts-production-catalog-evidence-reconciliation.md):
  reported execution is separate from raw-export availability.
- Existing catalog batch/audit/verification reports, including
  [Batch2 Q07](rental-contracts-production-catalog-batch2.md),
  [Batch2 verification](rental-contracts-production-catalog-batch2-verification.md),
  [Q16 results review](rental-contracts-production-catalog-q16-production-results-verification.md).
- [Manifest](../packages/infrastructure/database/manifests/rental-contracts-phase1a.json),
  [validator](../packages/infrastructure/database/manifests/rental-contracts-phase1a.mjs),
  [manifest tests](../packages/infrastructure/database/tests/rental-contracts-manifest.test.mjs),
  [ownership-scope tests](../packages/infrastructure/database/tests/rental-contracts-ownership-scope.test.mjs).

All rental-contracts Markdown reports present were read/searched. docs/evidence contains
only the supplied Q16 export; no complete raw Q07 default-ACL/executor evidence is
available there. This does not prove such artifacts do not exist elsewhere. Q16 is
a truncated dependency export, not default-privilege or new-function ACL evidence.
The manifest is a declared/source-checked contract, not an independent live ACL source.

## 1. Creation order, existence and per-signature classification

Every declaration below is a plain CREATE FUNCTION, not CREATE OR REPLACE. All18 are
proposed NEW functions in the draft. If an exact identity already exists when creation
is attempted, creation must error; its old ACL must not be treated as a new-function
baseline. Unexpected overloads are separately rejected by the ownership block.

The source guard at lines4–7 aborts before these declarations and final line472 rolls
back. Thus this guarded file performs no successful creation as written. The following
analysis concerns a future separately authorized release transaction, not a claim that
these new functions currently exist in Production. Q11 reported scoped absence, but
no fresh raw absence/executor evidence or complete Q16 root inventory establishes
current Production absence independently.

Classification concerns the **exact initial ACL**, not whether the declaration/order
exists. UNKNOWN means the actual creator/default ACL inputs and authoritative ACL
tuples are missing. A conditional derivation formula is known, but is not a verified
per-function baseline.

| Order | Exact function signature | CREATE line | New versus deployed | Initial ACL baseline |
|---|---|---:|---|---|
| 1 | app_private.rental_member(pg_catalog.uuid) | 35 | Proposed NEW; current Production identity not independently established | UNKNOWN |
| 2 | app_private.rental_receipt_immutable() | 132 | Proposed NEW; current Production identity not independently established | UNKNOWN |
| 3 | app_private.rental_history_guard() | 139 | Proposed NEW; current Production identity not independently established | UNKNOWN |
| 4 | app_private.rental_price(pg_catalog.timestamptz,pg_catalog.timestamptz,pg_catalog.numeric,pg_catalog.numeric) | 152 | Proposed NEW; current Production identity not independently established | UNKNOWN |
| 5 | app_private.rental_input(pg_catalog.jsonb) | 165 | Proposed NEW; current Production identity not independently established | UNKNOWN |
| 6 | app_private.rental_number(pg_catalog.uuid,pg_catalog.timestamptz) | 190 | Proposed NEW; current Production identity not independently established | UNKNOWN |
| 7 | app_private.rental_lock(pg_catalog.uuid,pg_catalog.uuid) | 201 | Proposed NEW; current Production identity not independently established | UNKNOWN |
| 8 | app_private.rental_available(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.uuid,pg_catalog.timestamptz,pg_catalog.timestamptz) | 206 | Proposed NEW; current Production identity not independently established | UNKNOWN |
| 9 | public.contratpro_rental_create(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.jsonb) | 215 | Proposed NEW; current Production identity not independently established | UNKNOWN |
| 10 | public.contratpro_rental_detail(pg_catalog.uuid,pg_catalog.uuid) | 244 | Proposed NEW; current Production identity not independently established | UNKNOWN |
| 11 | public.contratpro_rental_list(pg_catalog.uuid,pg_catalog.int4) | 255 | Proposed NEW; current Production identity not independently established | UNKNOWN |
| 12 | app_private.rental_change(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid,pg_catalog.text,pg_catalog.jsonb) | 269 | Proposed NEW; current Production identity not independently established | UNKNOWN |
| 13 | public.contratpro_rental_update_draft(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid,pg_catalog.jsonb) | 351 | Proposed NEW; current Production identity not independently established | UNKNOWN |
| 14 | public.contratpro_rental_confirm(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid) | 354 | Proposed NEW; current Production identity not independently established | UNKNOWN |
| 15 | public.contratpro_rental_start(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid) | 357 | Proposed NEW; current Production identity not independently established | UNKNOWN |
| 16 | public.contratpro_rental_complete(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid,pg_catalog.bool) | 360 | Proposed NEW; current Production identity not independently established | UNKNOWN |
| 17 | public.contratpro_rental_cancel(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid) | 363 | Proposed NEW; current Production identity not independently established | UNKNOWN |
| 18 | public.contratpro_rental_extend(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid,pg_catalog.jsonb) | 366 | Proposed NEW; current Production identity not independently established | UNKNOWN |

**Totals:0 VERIFIED FROM DRAFT /0 CONDITIONAL ON UNVERIFIED PREREQUISITES /18 UNKNOWN**
for exact ACL values. Independently verified source facts are plain creation, order,
schema, intended security mode and absence of intervening target-function ACL edits.
If classifications are used for the creation recipe rather than exact values, the
recipe is conditional on the prerequisites below; that must not be mislabeled PASS.

## 2. Privilege layers that must not be conflated

| Layer | PostgreSQL/source meaning | Evidence state here |
|---|---|---|
| Hardwired function defaults | In the absence of applicable customized defaults, owner and PUBLIC normally receive ordinary EXECUTE. Owner grant authority is implicit and need not appear as an explicit ACL grant-option marker | PG17 baseline rule; NOT established as the applicable Production default for these creations |
| Creator-global default ACL | A global pg_default_acl row for the actual creating role and function object kind replaces the hardwired default baseline | UNKNOWN: required raw role/object-kind/grantor/grantee/options not supplied |
| Creator/schema default ACL | Relevant per-schema defaults add grants to the global/hardwired baseline. A schema-specific revoke does not remove a grant supplied globally | UNKNOWN for actual creator in app_private/public |
| Explicit function grants/revokes | Target-specific SQL changes stored ACLs independently of defaults | VERIFIED FROM DRAFT: none affects the18 new functions before line452 |
| Inherited/effective access | PUBLIC, owner/superuser rules and usable membership paths affect privilege inquiry results; schema USAGE also matters for invocation | UNKNOWN; ordinary membership does not import every other roles default ACL into object creation |
| Independently verified Production ACL | Actual bound object/default ACL export plus context and independent interpretation | Not available for these initial states; target functions are not independently proven deployed |

Only the defaults of the role creating the object apply; defaults of roles it belongs
to are not automatically combined as creator defaults. The new writer being the
intended final owner does not make its defaults the initial defaults. No SET ROLE
appears in the draft before creation/ownership; the creating role C is current_user
for those CREATE statements. Its actual identity and authorized execution context are
not established by an SQL Editor label, manifest field or the later owner assertion.

Raw proacl=NULL represents hardwired object defaults for that owner, not today’s
pg_default_acl and not an empty ACL. An explicit ACL equivalent to defaults is a
different raw representation. Semantic comparison should decode grantor, grantee,
privilege and grant-option tuples while preserving raw provenance. Do not infer owner
ordinary EXECUTE or every grant-option flag solely from ownership; owner management/
grant authority and ordinary privileges are different questions.

## 3. Exact state immediately before ownership mutation

The first function ACL change is the dynamic REVOKE at draft452; ownership transfer
is453 and public EXECUTE grant454. All18 CREATE statements have completed by366.
Before452:

- Line16 grants EXECUTE only on the two EXISTING dependency helpers, not the18 new
  functions. It supplies no initial ACL expectation for rental functions.
- Lines114–118 concern TABLE grants/revokes only. They do not revoke function EXECUTE.
- Line372 grants schema CREATE to the future writer. This neither changes existing
  function ACLs nor changes the creator/current_user or ownership.
- No ALTER DEFAULT PRIVILEGES or role switch establishes a deterministic function
  creation baseline. The role-attribute checks at387–391 do not inspect default ACLs.
- Existing prevalidation423–431 checks creator ownership, definition and security
  settings but not an independently approved proacl/default snapshot.

Conditional model for a newly created function F in schema S:

    initial stored ACL(F) = creator-C global function defaults (or hardwired defaults)
                            merged with creator-C/S function additions
                            plus any target-specific changes before the gate

The draft supplies no target-specific changes for these18 before the gate. The actual
C/global/schema inputs are unknown. External DDL event hooks/administrative interference
and concurrent default changes also require release assumptions/evidence; they are
not encoded by this source formula. A single current default-ACL snapshot taken after
creation is not automatically proof of which defaults applied at each creation.

Accordingly, exact grantors, grantees, ordinary EXECUTE and grant options cannot be
listed authentically from this repository. No expected PUBLIC/anon/authenticated/
service_role/custom-grantee tuple is invented. Global/default customization may affect
both private and public functions; source schema names alone do not distinguish safe
from unsafe initial ACLs.

## 4. What existing evidence supports

Q07 reportedly collected96 rows and broad defaults in schema public were identified.
Without the complete raw rows, that summary does NOT establish which creating role,
object kind, grantee (PUBLIC versus a named role), grantor or grant options apply.
The schema public is not the pseudo-role PUBLIC. It also does not prove absence of
relevant global/app_private defaults. Current role memberships from Q08 remain unresolved.

Q05 concerns existing canonical helpers, not these18 newly created objects. Q10 hashes/
settings and Q13/Q15 reported row counts do not fill the creation-default gap. Q16
shared-edge output is missing due truncation; even full shared edges would not substitute
for exact creator/default ACL data. No other-role permission success establishes C.

The scope test fixture uses initial non-owner PUBLIC EXECUTE as an APPROVED SYNTHETIC
example (test fixture lines140–144); it is explicitly not Supabase evidence. Its
initialAcls map and the real draft intention must not be conflated. The validator
checks signatures/settings/declared template scope, not actual initial PostgreSQL ACLs.
Its Production-only permission status remains UNVERIFIED.

## 5. Can the required pre-mutation gate be implemented now?

**BLOCKED for an independently supported, passable baseline.** The same transaction
deterministically creates functions, but does not deterministically reset or pin the
external creator default-ACL inputs. Capture of actual target ACLs is an observation,
not an independent expectation; comparing a captured ACL with itself cannot approve it.
The later named-role REVOKE is a mutation and cannot justify a baseline that must be
validated before any such mutation. A postcondition or eventual rollback is not the
missing precondition.

It is mechanically possible to prepare a generic fail-closed comparison that rejects
UNKNOWN expectations, or to use a separately approved conservative acceptance policy.
That would not establish that Production will PASS. Owner/PUBLIC-only initial acceptance
would be a new policy decision, not an already verified state from the manifest/fixture.
Do not invent it or make a silent migration change under this review.

## 6. Minimum evidence and safe correction recommendation

1. Recover already-collected original Q01/Q07/Q08 artifacts first: actual creator/session
   identity, complete global and app_private/public function-default ACL records, role
   identities/grantors/options and execution timestamps/project context. Absence of a
   default row must be independently evidenced, not inferred from a truncated export.
2. Define and approve a symbolically role-bound initial ACL policy for each creation
   schema/creator, with exact allowed grantor/grantee/privilege/grant-option tuples.
   Record whether this is an expected observed default recipe or a restrictive acceptance
   criterion. Only bind numeric OIDs in the verified target context; do not hardcode
   unrelated fixture OIDs or assume postgres.
3. Under a separate implementation scope, compare all18 initial ACLs to that approved
   baseline BEFORE the first function revoke/owner change. Retain missing/default/
   malformed/unknown evidence as an abort condition. Normalize hardwired NULL ACLs
   using the actual initial owner without confusing them with current default-ACL rows.
4. Preserve exact OID/signature checks, require a stable default/creation window and
   independently reviewed non-superuser grantor/SET authority. Complete final whole-set
   definition/settings/owner/ACL verification remains a separate outstanding correction.

No extra query, default-ACL modification, grant/revoke or SQL patch is offered here.
If original artifacts are unavailable, any fresh collection/rehearsal requires separate
authorization. Transaction-local default changes or blanket ACL normalization would be
a different migration design with preservation/authority requirements, not a justified
shortcut for this gate. The current source guard remains the safety boundary.

## 7. Recommended database-free negative regression tests (not implemented/run)

- Missing creator binding or initial expectation for any of18 identities aborts before
  action descriptors; PUBLIC-only synthetic defaults never become Production facts.
- Unknown custom grantee, authenticated/service_role/anon access beyond policy, changed
  grantor or added grant option fails even when object/signature/count/hash matches.
- Defaults attached to a different creator/schema/object kind must not satisfy the
  expectation; inherited-role defaults must not be silently imported.
- Global PUBLIC removal plus per-schema additions is modeled distinctly from hardwired
  owner/PUBLIC defaults; per-schema revoke must not erase a global grant in the model.
- NULL proacl versus equivalent explicit defaults is compared according to an explicit
  normalization policy; NULL must never become an empty privilege set.
- Duplicate exact ACL tuples/malformed fields fail; multiple grantors for one grantee
  are not accidentally collapsed. Compare the full tuple, not raw ACL text ordering.
- A copied actual-ACL map cannot become an approved expectation merely by marking it
  verified. Baseline provenance/approval must be independent.
- The SQL implementation must gate ALL18 before its first mutation, not merely pass a
  separate synthetic simulator. Add control-flow/source checks and retain runtime unknowns.
- Snapshot/creator/OID drift and unexpected event-hook changes are explicit abort cases;
  actual PostgreSQL default merge, owner transfer and rollback need later authorized
  PG17 execution, not mock certification.

## Final conclusion

**No exact initial ACL is independently VERIFIED FROM DRAFT for any of the18 functions.**
Their creation/order is known; actual ACL values and independently approved default
prerequisites are not. The initial-ACL gate remains BLOCKED pending evidence or an
explicit separately approved acceptance policy. No existing evidence was modified,
no tests or SQL were executed, and no Production readiness is claimed.

**Production Migration / Deployment remains NO-GO.**
