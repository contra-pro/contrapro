# Rental Contracts Phase 1A — Offline remediation plan

**Planning only — 2026-11-20 UTC. Production Migration / Deployment: NO-GO.**
This plan authorizes no implementation, database connection, SQL execution or Production
operation. Only this document was created. Existing draft, evidence, tests and application
code remain unchanged. Q14 remains BLOCKED; no execution or authorization bypass is proposed.

## Basis and evidence rules

Reviewed the [inactive draft](../supabase/migration-drafts/20261120001300_rental_contracts.sql),
[original readiness assessment](rental-contracts-production-readiness.md),
[consolidated assessment](rental-contracts-production-catalog-q01-q16-consolidated-readiness.md),
[evidence reconciliation](rental-contracts-production-catalog-evidence-reconciliation.md),
[Q16 result verification](rental-contracts-production-catalog-q16-production-results-verification.md),
the [harness README](../packages/infrastructure/database/integration/rentals/README.md)
and [12 static rental tests](../packages/infrastructure/database/tests/rental-contracts-draft.test.ts).
Existing audit/query-review/hotfix findings are preserved through these source reports.
No prior runtime test was repeated and no new database verification is claimed.

Use three distinct categories:

- **Confirmed source/release defect:** a demonstrable unsafe/incomplete future release
  mechanism; can be addressed locally in a separately approved new artifact. The draft
  is intentionally guarded and incomplete, not accidentally broken by that guard.
- **Evidence gap:** actual permissions, settings or behavior unknown; do not invent
  a fix or treat missing exports as failed execution.
- **Runtime/policy gate:** needs explicit policy acceptance or separately authorized
  execution. Static checks cannot discharge it.

Q12 corrected bool execution reportedly returned7 rows; the stale persisted boolean
copy is the known defect, not a failed corrected execution. Q13 reportedly returned3
metadata rows; Q15 reportedly returned1 privilege row. Raw artifacts/execution contexts
are missing, so those results remain PARTIAL, not “never executed.” Row counts do not
establish actual privilege values. Q16 directly verified2000/2746 rows,650 unique directed
edges, but omits746 result rows and all root/shared/extension-membership output groups.
Neither its valid prefix nor earlier query safety approvals establish release authority.

## Ordered remediation table

Order numbers express dependencies, not permission to implement. P0 gates block migration;
P1 gates block activation and must have a viable validation plan before release approval.
Local changes below belong to future separately scoped tasks, never this planning run.

| Priority | Problem | Proposed solution | Verification | Approval needed |
| -------- | ------- | ----------------- | ------------ | --------------- |
| 0 — P0-8 evidence foundation | Raw Q01–Q15/context gaps; Q13/Q15 reported not independently verified; Q16 truncated | Recover existing original exports and execution context; create per-blocker closure ledger; separate evidence missing from confirmed failures | Hash/parse complete files, exact SQL binding, headers/counts/NULLs, context/snapshot notes; retain UNKNOWN for unavailable values | Offline recovery of existing files only; any new collection requires separate authorization |
| 1 — P0-6 object scope | Draft376–383 uses a prefix ownership loop; a matching pre-existing function could be altered | First implement a database-free exact-signature/object manifest and validation tests in separate files; later replace the loop only in a separately reviewed new candidate | Inventory18 functions including nine public RPCs; reject extra matching functions, overload/default changes and duplicate/missing signatures; confirm draft bytes unchanged | Separate local implementation task; no SQL execution needed |
| 2 — P0-2 executor/role lifecycle | Actual migration session, CREATEROLE, ADMIN/SET/grantor and new-writer path unresolved | Resolve exact target/current_user/session_user and per-edge options; design the smallest evidence-backed temporary authority path, with original grantor/options restoration | Offline role-path reasoning; subsequently non-superuser PG17 rehearsal and before/after membership comparison | New metadata/rehearsal or privilege operations separately authorized; never assume postgres is superuser |
| 3 — P0-3 object/owner authority | Existing-table policies/grants and post-transfer grants require ownership/grant options; schema CREATE alone is insufficient | Map each draft operation to actual object owner, effective owner USAGE/SET, grant option and executor; design ordering only after step2 | Exact operation-to-authority matrix; fail closed on absent helper EXECUTE/REFERENCES/schema rights or no post-transfer grant path | Existing evidence review offline; new collection/candidate/authority rehearsal separately scoped |
| 4 — P0-4 final ACL closure | Broad public defaults reported; named-role revocations do not prove custom/default grants absent | Derive exact allowed ACLs/grant options per object/column/schema/function for creation and transfer; preserve unrelated grants; implement assertions in a new candidate later | Offline ACL fixtures include unexpected custom/PUBLIC grantees, grant options, inherited access and creator/schema defaults; actual final ACLs need rehearsal evidence | New candidate/local tests separately approved; no global default changes or Production revokes inferred |
| 5 — P0-7 dependency/security baseline | Helper/guard hardening, applicable policies/roles and exact tenant FK keys not fully established | Reconcile deployed settings/body fingerprints/owner/bypass/ACL/policy semantics with approved source and precise composite-key requirements; fix only proven defects | Explain every false/NULL hardening flag; exact ordered keys/types/REFERENCES, policy commands/roles and owner attributes; restricted-role behavior later | Existing source/evidence review offline; any security remediation or runtime test separately authorized |
| 6 — P0-8 dependency suffix | Missing Q16 suffix hides roots/shared authority/extension memberships; two-hop graph never complete | First request any already-exported omitted evidence; otherwise specify a minimal bounded collection scope for later review without adding SQL here | Address-based deduplication, count/truncation checks and required root/shared/extension coverage; stable-snapshot/order limitations explicit | Fresh collection needs independent review and separate authorization; no blind LIMIT removal |
| 7 — P0-5 history/sequencing | Q13/Q15 raw values unavailable; draft388 has no history INSERT; business locks do not serialize releases | Resolve reported metadata/privilege artifacts and expected sequence; design single-transaction history recording, dependency/collision guards, serialization/timeouts and error rollback in a new candidate | Source control-flow and negative fixtures; real authorized non-superuser rollback/locking rehearsal later. Q14 is not automatically required/approved | New candidate work and database rehearsal separately authorized; history-content inspection stays excluded |
| 8 — P0-1 releasable artifact | Original abort/ROLLBACK is deliberate; no reviewed deployable authority recipe exists | Keep it unchanged. Assemble a separate forward-only candidate only after steps1–7, preserving approved business logic, exact ACLs, owners and temporary authority restoration | Independently compare bodies/constraints/grants/policies to baseline, verify exact manifest, atomic pre/postconditions and no unrelated changes | Explicit candidate-preparation scope, independent review, rehearsal and eventual deployment approval are separate gates |
| 9 — P1-1 genuine auth/isolation | Synthetic harness JWT context cannot prove gateway identity or Production restrictions | Plan bounded genuine-auth Owner/role-less Staff, anonymous, revoked/disabled/suspended and cross-tenant denial checks | Actual restricted requests/transactions with no service-role/RLS bypass; preserve sanitized evidence | Separate runtime authorization including any data writes; no flags enabled by this plan |
| 10 — P1-2 definer/audit behavior | Metadata settings do not prove effective FORCE RLS or atomic audit under actual owner | Verify restricted final owners/EXECUTE allowlists/helper access and run bounded definer/RLS/audit checks after authority is settled | Same-tenant allowed and cross-tenant denied; audit failure rolls back mutation; no retained temporary authority; real runtime evidence | Separate database/runtime authorization; no automatic Production failure injection |
| 11 — P1-3 reliability | Local20/20 success covers finite cases under different bootstrap authority | Retain prior results; rehearse only identified authority/provider gaps and affected regression scenarios after changes | Idempotent create/confirm, numbering, reservation/extension/start races, immutable receipts/numbers and full rollback; actual concurrent PG17 sessions required | Separate isolated-cluster/test execution authorization; mocks alone cannot prove concurrency |
| 12 — P1-4 operational policy/recovery | Revocation timing, return acknowledgment, uncertain responses and rollback policy need explicit acceptance | Document linearization and approved return semantics, reconciliation for non-receipt operations, stop/recovery/activation criteria | Human policy sign-off plus reviewed failure/runbook scenarios; distinguish physical return proof from explicit acknowledgment | Explicit policy/recovery/activation approval; no business-rule change inferred |
| Independent P2 task | Q12 stale SQL, old Batch1 Q03 and aggregate classification ambiguity | Later documentation-only hotfix/review artifacts; preserve failed originals/history and distinguish result evidence from artifact correctness | Exact minimal diff, source/approved-copy equality and PG17 semantic type/column checks | Separate documentation implementation scope; does not approve rerun or unblock P0/P1 |

## What is actually wrong versus still unknown

### Confirmed local artifact issues that need future implementation

1. Prefix-based ownership/grant targeting (draft376–383) is not an exact-object release
   control. A new candidate must operate on an independently checked explicit manifest.
2. No reviewed temporary membership/owner-transition/post-transfer grant recipe exists
   (draft12–14,370–388). This is a missing authority implementation, not proof a particular
   Production membership grant is necessary. Existing authorized SET paths must be
   preferred if evidence establishes them.
3. Final ACL closure is not exhaustively asserted against custom default-derived
   grantees (draft114–118,381). Do not “fix” this by blindly revoking unrelated defaults.
4. No deployment history insert/serialization/precondition protocol or atomic release
   artifact exists. Draft BEGIN/ROLLBACK does not supply a committed deployment plan.
5. Persisted Q12 qualified type spelling is incorrect in catalog documentation. The
   separate reported corrected execution is not contradicted by that stale copy.

The unconditional guard/final ROLLBACK is a **required safety boundary**, not a defect
to remove. No rental business-function bug is established merely by these release gaps.

### Evidence gaps that must not trigger speculative patches

Actual executor identity and special attributes; owners and effective SET/USAGE/ADMIN/
grant options; custom creator/schema default grants; current helper/body/settings and
policy semantics; exact tenant key/types and privileges; history metadata/authority;
missing Q16 categories and executed-query provenance remain unresolved. Retrieve originals
first. Three Q13 rows/one Q15 row say nothing about individual booleans being true.
False exact-two-settings flags may reflect extra settings, formatting, missing explicit
row_security or a genuinely unsafe setting; determine which before hardening anything.

SECURITY DEFINER alone neither guarantees nor bypasses RLS: effective owner attributes
and FORCE RLS matter; row_security=on does not strip SUPERUSER/BYPASSRLS. Policy hashes
are not predicate proof. Existing permissive policies may OR with new applicable policies.
Type/language USAGE is not ownership/CREATE/REFERENCES authority. btree_gist is not required
by this draft's ordinary indexes, core range overlap and advisory-lock approach.

## Safe verification layers and planned offline checks

No tests ran during this planning task. Future database-free verification can use:

- File hashes and exact diffs preserving the guarded draft and original exports.
- Full-file JSON/CSV schema/count/address validation and same-snapshot reference checks;
  no authentic missing export may be reconstructed from prose.
- SQL/PLpgSQL AST parsing and function-call inventories, augmented with lexical CTE
  column binding, typed PG17 catalog descriptors and negative controls (original Q03
  projection error and invalid Q12 qualified type name). PG18 syntax parsing is not
  PG17 semantic resolution or actual privilege exercise.
- A new exact-signature manifest test suite and synthetic ACL/role-graph fixtures;
  static tests cannot prove that Postgres accepts a role recipe or enforces RLS.
- Existing draft static tests and harness safety/diagnostics/lifecycle/identity/baseline
  unit tests. The README identifies these as database-free; lifecycle subprocesses
  use controlled fake children and baseline tests mock SQL application. Review changed
  imports before any future test run to ensure that property remains true.

Proposed future targeted commands, **NOT RUN here**, using already-installed dependencies:

    npm run test --workspace=@contratpro/database -- tests/rental-contracts-draft.test.ts
    node --test packages/infrastructure/database/integration/rentals/safety.test.mjs packages/infrastructure/database/integration/rentals/diagnostics.test.mjs packages/infrastructure/database/integration/rentals/lifecycle.test.mjs packages/infrastructure/database/integration/rentals/identity.test.mjs packages/infrastructure/database/integration/rentals/baseline.test.mjs
    node --check packages/infrastructure/database/integration/rentals/run.mjs
    git diff --check

Do not run run.mjs, migrations:apply, broad database test commands, clean-install scripts
or an embedded PostgreSQL engine as “offline” validation. A no-network database process
still executes SQL and needs separate authorization. Do not reinstall dependencies.
Run only checks relevant to a concrete future change, not every previously passing suite.

Real PG17 SQL execution, role grants/owner transfers, RLS, lock acquisition/concurrency,
transaction rollback and genuine JWT/provider behavior require separately authorized
runtime verification. The prior native superuser/synthetic adapter does not reproduce
Supabase postgres authority; do not grant extra privileges to make tests pass. No test
environment choice or Production write authorization is implied by this plan.

## Checkpoints and release reconsideration

- **Checkpoint A (steps0–1):** evidence ledger clearly distinguishes reported/direct/
  missing facts; exact manifest has independent review and negative tests. Guard unchanged.
- **Checkpoint B (steps2–7):** each operation has an evidence-backed authority path;
  default ACL/security/history/dependency uncertainties are resolved or an explicit
  bounded residual risk is accepted. No placeholder privileges or “assume postgres.”
- **Checkpoint C (step8):** a separate exact-object candidate is independently reviewed;
  no business behavior drift or unrelated changes, and preservation/rollback plans
  are concrete. Candidate preparation is not execution approval.
- **Checkpoint D (steps9–12):** authorized non-superuser/runtime evidence and policy/
  recovery approvals cover the actual release. Obtain explicit Production migration/
  deployment/activation approval; metadata alone cannot mark the system READY.

## First recommended implementation task

After recording/requesting the missing original artifacts (step0), separately authorize
one small **database-free exact rental object/signature manifest and validator** task
(step1). Derive it from the unchanged draft:18 functions (nine public/nine private),
four tables, two explicit indexes, thirteen policies and three triggers, with schemas,
exact input signatures, intended security settings/owner and public/private EXECUTE
allowlist expectations. Treat that ownership/ACL expectation as design, not observed
Production permission. Include explicit unknown authority/dependency fields rather
than inventing them. Do not generate a deployable migration yet.

Acceptance criteria:

1. Exact manifest matches current approved source inventory, including complete's
   explicit boolean argument, and records all nine public entrypoints.
2. Negative fixtures reject an unrelated matching-prefix function, unexpected overload,
   duplicate/missing signature and changed security/ACL expectation. Expected differences
   cannot be swallowed by IF NOT EXISTS, broad wildcards or relaxed assertions.
3. Original draft and evidence hashes remain unchanged; tests execute no SQL, database
   connection, PostgreSQL binary or environment/configuration changes. Output is
   independently reviewable before any new candidate uses the manifest.

This is the smallest useful source-control improvement against a confirmed P0 defect
that does not depend on guessed Production privileges. Authority/default/history
implementation must wait for its evidence prerequisites. Do not edit the ownership
loop in the original guarded draft or remove its guard as the first task.

**No implementation or runtime verification performed. Production remains NO-GO.**
