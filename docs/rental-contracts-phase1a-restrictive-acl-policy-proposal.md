# Phase1A — Restrictive function ACL policy proposal

**PROPOSAL ONLY — NOT APPROVED OR IMPLEMENTED. Production Migration / Deployment: NO-GO.**
No SQL, connection, new Production query or privilege operation occurred. Only this
new report was created. Existing draft, manifest, tests, evidence and reports unchanged.
Q14 remains BLOCKED; nothing here authorizes history-content inspection.

## 1. Basis and meaning of this policy

Read [initial ACL baseline review](rental-contracts-phase1a-initial-acl-baseline-review.md),
[exact ownership design](rental-contracts-phase1a-exact-ownership-scope-design.md),
[remediation plan](rental-contracts-phase1a-remediation-plan.md),
[inactive SQL draft](../supabase/migration-drafts/20261120001300_rental_contracts.sql),
[manifest](../packages/infrastructure/database/manifests/rental-contracts-phase1a.json),
[validator](../packages/infrastructure/database/manifests/rental-contracts-phase1a.mjs),
[manifest tests](../packages/infrastructure/database/tests/rental-contracts-manifest.test.mjs),
[scope tests](../packages/infrastructure/database/tests/rental-contracts-ownership-scope.test.mjs),
[consolidated catalog assessment](rental-contracts-production-catalog-q01-q16-consolidated-readiness.md),
[evidence reconciliation](rental-contracts-production-catalog-evidence-reconciliation.md)
and [Q16 results](rental-contracts-production-catalog-q16-production-results-verification.md).

**Desired policy** is an acceptance criterion, not a description of current Production
ACLs. All18 exact initial ACL values remain UNKNOWN. Q07 broad schema-public defaults
were reported, but creator/object-kind/grantee/grantor details are not independently
reconciled. Do not confuse schema public with ACL grantee PUBLIC. Q16 has no returned
shared-role/ACL group and cannot fill those gaps. Q13/Q15 were reportedly collected,
but their missing raw values cannot prove privilege authority.

Functions are proposed NEW via plain CREATE FUNCTION; existing exact identities are
collisions. The guarded source unconditionally aborts before DDL and ends ROLLBACK.
This proposal neither promotes that artifact nor removes its guard. Current SQL exact
identity selection is statically reviewable; its missing independent initial-ACL gate
and incomplete whole-set postvalidation remain outstanding.

## 2. Exact per-signature FINAL ACL policy

Intended owner for all18: **contratpro_rental_writer**. Policy requires its ordinary
EXECUTE privilege to be established and checked; ownership alone does not prove that
ordinary EXECUTE is currently granted. Ownership management/grant authority is separate
and is not removable by treating ordinary EXECUTE
revocation as a DENY. Stored owner ACE representation must be handled separately from
non-owner grants. No function grant option is permitted for a non-owner.

**D-public:** no direct grant to PUBLIC, anon, service_role, authenticator or any other
unapproved non-owner role; authenticated is the sole permitted direct non-owner EXECUTE
grantee. **D-private:** same prohibition PLUS authenticated; no direct non-owner grant.
These are proposed restrictions, not assertions those roles have or lack memberships.

| Order | Exact function identity | Mode | Intended owner | Intended EXECUTE access | Forbidden direct grants |
|---|---|---|---|---|---|
| 1 | app_private.rental_member(pg_catalog.uuid) | INVOKER | contratpro_rental_writer | owner only | D-private |
| 2 | app_private.rental_receipt_immutable() | INVOKER | contratpro_rental_writer | owner only | D-private |
| 3 | app_private.rental_history_guard() | INVOKER | contratpro_rental_writer | owner only | D-private |
| 4 | app_private.rental_price(pg_catalog.timestamptz,pg_catalog.timestamptz,pg_catalog.numeric,pg_catalog.numeric) | INVOKER | contratpro_rental_writer | owner only | D-private |
| 5 | app_private.rental_input(pg_catalog.jsonb) | INVOKER | contratpro_rental_writer | owner only | D-private |
| 6 | app_private.rental_number(pg_catalog.uuid,pg_catalog.timestamptz) | INVOKER | contratpro_rental_writer | owner only | D-private |
| 7 | app_private.rental_lock(pg_catalog.uuid,pg_catalog.uuid) | INVOKER | contratpro_rental_writer | owner only | D-private |
| 8 | app_private.rental_available(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.uuid,pg_catalog.timestamptz,pg_catalog.timestamptz) | INVOKER | contratpro_rental_writer | owner only | D-private |
| 9 | public.contratpro_rental_create(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.jsonb) | DEFINER | contratpro_rental_writer | owner; authenticated without grant option | D-public |
| 10 | public.contratpro_rental_detail(pg_catalog.uuid,pg_catalog.uuid) | DEFINER | contratpro_rental_writer | owner; authenticated without grant option | D-public |
| 11 | public.contratpro_rental_list(pg_catalog.uuid,pg_catalog.int4) | DEFINER | contratpro_rental_writer | owner; authenticated without grant option | D-public |
| 12 | app_private.rental_change(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid,pg_catalog.text,pg_catalog.jsonb) | INVOKER | contratpro_rental_writer | owner only | D-private |
| 13 | public.contratpro_rental_update_draft(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid,pg_catalog.jsonb) | DEFINER | contratpro_rental_writer | owner; authenticated without grant option | D-public |
| 14 | public.contratpro_rental_confirm(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid) | DEFINER | contratpro_rental_writer | owner; authenticated without grant option | D-public |
| 15 | public.contratpro_rental_start(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid) | DEFINER | contratpro_rental_writer | owner; authenticated without grant option | D-public |
| 16 | public.contratpro_rental_complete(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid,pg_catalog.bool) | DEFINER | contratpro_rental_writer | owner; authenticated without grant option | D-public |
| 17 | public.contratpro_rental_cancel(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid) | DEFINER | contratpro_rental_writer | owner; authenticated without grant option | D-public |
| 18 | public.contratpro_rental_extend(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid,pg_catalog.jsonb) | DEFINER | contratpro_rental_writer | owner; authenticated without grant option | D-public |

### Direct, PUBLIC and effective permissions

- A grant to PUBLIC permits all roles subject to other access gates; it is not a
  grant to a real membership role. Final PUBLIC EXECUTE must be absent on all18. Do
  not use PUBLIC as a pg_has_role membership subject.
- No direct EXECUTE to service_role/anon/authenticator/custom roles is authorized by
  this proposal. BYPASSRLS alone does not confer function EXECUTE; it matters to data
  access after invocation. SUPERUSER and ownership powers are different control-plane
  capabilities which a function ACL cannot universally neutralize.
- For private functions, untrusted application roles must have neither effective
  inherited EXECUTE nor a SET/admin escalation path into the owner/another executing
  role. Validate per-edge INHERIT/SET/ADMIN and role attributes; NOINHERIT on the writer
  alone is not proof. A role that can become the owner can alter the function, not
  merely invoke it. Trusted administrative exceptions must be explicitly identified
  and approved; do not claim isolation from all database administrators.
- Public entrypoints are intended for the authenticated runtime context. Ordinary
  inheritance or SET ability involving authenticated must be reviewed against the
  genuine JWT/gateway model; role names alone prove no trusted authentication. A
  separately approved authenticator→authenticated SET path may be legitimate gateway
  behavior without a direct function grant to authenticator. It does not authorize
  authenticator/application access to private helpers or SET into the writer.
- Schema USAGE, object EXECUTE and application tenant checks are separate gates. SQL
  role authenticated does not by itself establish an active canonical identity,
  agency membership or Owner/Staff authorization.

Desired final non-owner grant provenance: public EXECUTE granted by the verified
function-owner role contratpro_rental_writer, without grant option. Any alternative
grantor path needs explicit review/approval, not acceptance of whoever happens to
appear. Decode grantor/grantee/privilege/grant-option tuples; keep role/OID binding
within the verified execution context. Owner implicit authority is not inferred from
an arbitrary explicit owner ACE. No Production grantor capability is established here.

### Additional protection for all nine SECURITY DEFINER entrypoints

Require intended restricted owner identity/attributes, safe role memberships, pinned
pg_catalog/pg_temp search_path, row_security=on, approved definition/parameter/return/
language metadata and closed helper/dependency privileges. FORCE RLS must apply where
required; row_security=on does not strip SUPERUSER/BYPASSRLS. Verify genuine caller
identity, membership/state/tenant checks and transactional audit behavior separately.
Private SECURITY INVOKER helpers run with their caller privileges, which may be the
definer writer; their private ACL does not replace safe code or restricted data grants.

## 3. Comparison of implementation approaches

| Approach | Executor/grantor authority | Transaction/rollback | Unrelated object risk | Defaults | Effective inherited rights | Fail-closed/evidence requirements |
|---|---|---|---|---|---|---|
| A — independently verified initial ACL baseline before mutation | Reading baseline is not authority to revoke/transfer/regrant; actual creator/owner, SET and post-transfer grantor path still required | Validate all18 first; later errors must abort entire reviewed release transaction | Low only with exact identities/OID checks; baseline does not justify broader operations | Requires exact creator-global/schema function default evidence and stable creation context, or an independently approved acceptance baseline | Must assess separately; raw ACL equality alone is insufficient | Strongest immediate no-action stance while baseline UNKNOWN; block on missing/changed evidence |
| B — authorized restrictive normalization before owner changes | Requires verified owner/grant options for every change and review of grantor chains/dependent grants; creation owner is not assumed | All operations within one transaction; warnings/partial revokes must be caught by assertions; rollback is runtime behavior | Can be bounded to18, but blind schema/default revokes or cascade can affect unrelated grants | Can reduce reliance on knowing the exact default recipe only if complete actual ACL state and normalization scope are inspected/authorized | Not solved by direct normalization; owner/membership/SET/superuser paths remain | Reject when authority/grantees/grant chains are unsupported; cannot claim successful isolation from intended operations alone |
| C — validated initial policy + narrow normalization + full postvalidation | Same actual authority needs as A/B; no invented memberships or grantor assumptions | Plan/validate complete set before any mutation; verify whole final set and rollback on any failure | Exact targets, scope assertions and before/after unrelated snapshots; prohibit blind cascading effects | Initial independent policy/default evidence defines acceptable variation; unknown deviations stop | Explicit and effective checks plus role-path review at both stages | Recommended future design after explicit policy approval/evidence; currently BLOCKED for implementation-ready baseline |

### A: strengths and limits

An independently supported initial expectation avoids approving whatever is observed.
Compare semantic decoded ACL tuples, preserving NULL-versus-explicit raw provenance.
NULL proacl uses hardwired defaults for the object owner; it is neither empty nor a
lookup of current pg_default_acl. Global creator defaults can replace hardwired ACLs;
per-schema defaults add grants. Defaults of inherited roles are not automatically
creator defaults. Current defaults after creation are not proof of those used earlier.
A does not prove that subsequent grants/transfers are executable or that a principal
has no indirect access. Missing initial evidence keeps the mutation gate BLOCKED.

### B: safe only as a different, explicitly authorized design

A normalization instruction is not a grant of database authority. An owner/grantor
may be unable to remove grants issued through another authority path without broader
consequences. RESTRICT-style refusal must be preferred over blind CASCADE; dependent
grant revocations outside the approved ACL closure stop for separate review. Cascading
object grants concern that object's grant chain, not permission to change unrelated
functions, roles or schema privileges. Named-role revocations
alone do not close custom/default grants. Merely creating functions then revoking
known names can leave unexpected grant options or inherited access.

Do not normalize global/schema default ACLs, unrelated functions or memberships as
an implicit side effect. Do not snapshot actual ACLs and label that same snapshot
approved. B changes the approved sequencing assumption that initial ACL validation
precedes mutation; it cannot silently satisfy the missing gate by mutating first.
A permissive creation window is not justified solely by eventual cleanup: separate
sessions ordinarily cannot see uncommitted new objects, but same-transaction calls,
event hooks and privileged actors still require review. No such behavior was tested.

## 4. Recommendation — conditional C, immediate gate remains BLOCKED

**Recommended desired design: C. Current permitted posture: A-style refusal to mutate
without independently supported/approved expectations.** C provides explicit preconditions,
least-privilege target-only operations and a full final assertion, rather than pretending
unknown initial ACLs were known or that normalization proves effective isolation.

Suggested future sequencing, NOT an implemented or approved procedure:

1. Verify exact18 identities/creation provenance, source/owner/settings and scope;
   establish the actual creator/executor, mutation/grantor authority, trusted operational
   exceptions and independent role/default evidence.
2. Approve an initial acceptance policy before observing whether it passes. A possible
   conservative envelope is owner ordinary EXECUTE plus PUBLIC ordinary EXECUTE with
   no non-owner grant options, all other grantees denied. **This is only a proposed
   envelope**, not the actual baseline or a currently approved Production exception.
   If global/schema defaults produce named/custom grants, stop; do not enlarge the
   envelope or silently revoke them to force PASS. Alternatively recover an exact
   independently reviewed initial baseline.
3. Compare every initial ACL and supported grant chain against the approved policy;
   UNKNOWN owner/grantor/role/default/hook conditions abort before the first mutation.
   No partial action plan is released before all prechecks complete.
4. Under separately verified authority, close non-owner target grants using the narrow
   approved changes only; transfer ownership in an order whose PG17 grantor/SET behavior
   has been rehearsed. Re-establish only the final matrix rights. Never infer an owner
   role switch from SQL Editor privileges or grant temporary memberships by guesswork.
5. Revalidate the entire18-object set after all actions: OID/identity/body/security/
   settings, exact owner, explicit grantor/grantee/options, effective application access
   and SET/admin paths. Check unrelated objects and original authority snapshots are
   unchanged/restored. Abort the transaction on errors, warnings implying incomplete
   action or any failed assertion. Do not mark an iteration-by-iteration owner/ACL
   check as this full-set verification.

C requires separately approved policy/implementation/runtime scopes. This report
provides none of those authorizations and contains no executable migration/query.
The proposed final matrix does not approve an initial exception automatically.

## 5. Required Production prerequisites — currently unverified

- Actual project/database/session/current creator identity and exact source/artifact
  context. Current source/manifest can show intent, not real execution rights.
- Complete relevant creator-global and app_private/public function-default ACL
  evidence, role/grantor/options and a stable creation window; complete original Q07/
  Q01/Q08 artifacts should be recovered first. Reported row counts are not values.
- Actual initial object owner/ACL provenance, ability to revoke each grant, dependent
  grant chains, ALTER OWNER prerequisites, required schema CREATE/USAGE and ability
  to SET the intended new owner, plus authorized final EXECUTE grantor.
- Owner-role attributes/memberships and application-role inheritance/SET/ADMIN paths.
  Trusted administrative authority is an explicitly separate plane, not an ACL denial
  guarantee. No Production role graph is invented by this proposal.
- Event-hook/concurrent DDL assumptions, exact target absence/new-creation controls,
  serialization/lock limits, atomic migration history and restoration/recovery plan.
- Actual restricted authenticated invocation, private-helper denial, tenant isolation
  and audit rollback under the intended writer. Local synthetic tests are insufficient.

Only the requirement definitions are statically verifiable. Complete PG17 catalog
resolution, ACL/default merge/owner-transfer/grantor behavior, warnings, effective
privileges and rollback require separately authorized execution/rehearsal. The supplied
Q16 export and prior local20/20 integration do not establish the non-superuser path.

## 6. Negative regression test plan — not implemented or executed

| Failure case | Database-free tests can establish | Actual PostgreSQL evidence required |
|---|---|---|
| PUBLIC EXECUTE | Reject PUBLIC on any final target; reject initial PUBLIC grant option or unapproved envelope | Actual default merge, NULL ACL normalization and final effective access |
| Unauthorized direct grant | Synthetic extra named/custom grantee, changed grantor/options or missing ACL expectation blocks plan | Owner/grantor authority and actual complete ACL/privilege outcomes |
| Unauthorized inherited EXECUTE | Role-graph fixtures distinguish PUBLIC, per-edge INHERIT, SET and ADMIN escalation; flag private access via writer or another grantee | Real role options/attributes, pg_has_role/has_function_privilege behavior and restricted sessions; synthetic closure is not proof |
| Incorrect owner | Wrong/missing creator/final owner invalidates descriptors; no default postgres assumption | Actual ownership transfer, implicit owner rights and new-owner SET/schema prerequisites |
| Missing/duplicate target | Exact allowlist/OID/type fixture validation aborts before all actions | Real name/OID resolution, catalogs and transactional DDL collisions |
| Unexpected overload | Same-schema/name unlisted input vector aborts; unrelated prefix stays untouched | Real prokind/proargtypes/default/variadic resolution and overload behavior |
| Unauthorized grantor | Full tuple fixtures reject unapproved grantor or dependent chain; no self-approved actual snapshot | Actual grantor selection, owner transfer rewriting and permitted revocation paths |
| Normalization failure | Scripted warning/error/incomplete ACL outcome rejects projected whole set and releases no success state | Real REVOKE warnings, grant options, RESTRICT/dependent-grant semantics and final permissions |
| Unrelated object mutation | Before/after synthetic owner/ACL/definition/settings changes outside18 rejected | Real before/after catalog snapshots and event/DDL side effects |
| Partial mutation or rollback failure | Simulated late failure never reports success; verify candidate control flow has one transaction/error propagation | Real atomic rollback of functions/ACL/roles/schema grants/history, lock failures and connection/client behavior |

Additional fixtures: hardwired NULL versus explicit equivalent ACL; different creator/
schema/object-kind defaults; per-schema revoke cannot remove a global grant; duplicate
exact tuples rejected without collapsing legitimate distinct grantors; missing role
provenance stays UNKNOWN; authenticated public access allowed only in approved context;
private access denied through alternate memberships even if direct ACLs look closed.
SQL source checks must validate all preconditions before mutation and whole-set
postvalidation afterward, not merely a stronger independent simulator.

No offline test can certify PostgreSQL rollback, effective privileges or RLS execution.
A recorded synthetic PASS must retain that label rather than being called Production
verification. Tests must not resolve unknown evidence by granting extra authority.

## 7. Remaining blockers and approval boundaries

Initial baselines remain UNKNOWN for all18; actual executor/SET/grantor/default/role
evidence is unresolved. The current exact-object SQL still lacks the approved complete
initial-ACL comparison and whole-set final definition/settings revalidation. History
atomicity/recovery and other P0/P1 readiness gates remain. No new claim of safe
Production normalization, complete inherited isolation or deployment readiness follows
from this desired matrix.

Next offline action: review/approve or reject this policy, and recover existing raw
creator/default/membership artifacts. Only then separately scope a manifest/test and
inactive-candidate implementation. Any new catalog collection, non-superuser rehearsal,
privilege operation, migration or activation requires separate authorization. No new
Production query is proposed; Q14 is not executed or implicitly unblocked.

Only this proposal file changed. References/whitespace were checked; no implementation
or runtime tests ran. **Production Migration / Deployment remains NO-GO.**
