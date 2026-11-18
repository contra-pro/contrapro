# Canonical provisioning Development security acceptance

Prepared locally; **no live case has been run by this harness**. Target is only
gllsiklbvqpxzucvkehw. Provisioning stays OFF and authenticated EXECUTE stays denied.
The accepted Development postflight is an input, not an audit to repeat here:
`../deployment-0007/postflight-output.txt` lines 37-52, 77-174, 176-243; manual
semantic review found no deployed contract differences. Production is excluded.

## Local tools and evidence

The [temporary A02 capability package](a02-temporary/README.md) implements the
accepted Gate 1 design as offline templates/ports/tests only. It is outside native
migration discovery and has no execution approval, nominated live IDs or credentials.

The [A02 cohort plan](a02-cohort-plan.md) records the four separate approval gates
and the missing canonical-write/cleanup authority. It is BLOCKED, not permission
to create Auth users, bypass RLS or activate provisioning.

For A02 prerequisites, safe in-memory session inputs, the exact three-read budget
and unresolved independent-observer dependencies, see [a02-readiness.md](a02-readiness.md).
This is an operator handoff using the existing observer, not an A02 execution CLI.

The bounded Category A observer and exact request/input handoff are documented in
[category-a.md](category-a.md). It requires explicit transport and independent
evidence injection; the observer itself has no default network access.
An explicit A01-only operator command now wires direct loopback HTTP to that
observer; see the handoff's A01 command and running-process prerequisites. It was
not executed during local preparation. The evidence-review CLI remains inert.
The [A01 no-RPC handoff](a01-no-rpc.md) adds an opt-in Development Node preload
and execution-correlated server traces; legacy boolean no-RPC files are rejected.

`plan.json` is the fixed case/fact contract. `fixtures.json` is deliberately partial
and marked offline-fixture. It contains no actual users, tokens or customer data.
`scripts/canonical-security-acceptance.mjs` has only plan and evidence-review modes:

```powershell
node scripts/canonical-security-acceptance.mjs --plan
node --test scripts/canonical-security-acceptance.test.mjs
node scripts/canonical-security-acceptance.mjs --review docs/canonical-acceptance/fixtures.json
```

The last command intentionally exits 1/UNVERIFIED: mock observations cannot satisfy
live acceptance. For a later authorized operator run, copy the evidence shape into
a separate local non-secret report, set source to operator-live-development, list
only authorized categories, and supply only the named boolean facts actually proved.
Missing facts stay UNVERIFIED; false facts BLOCK. Unknown fields, raw responses,
identifiers, errors and credentials are rejected. Complete operator assertions are
still CONDITIONAL_OPERATOR_EVIDENCE, never activation approval. A source label is
not a signature or independent proof; a human must inspect the private evidence.

The exported `collectCase` accepts a trusted observer callback and an exact target/
category authorization descriptor. It invokes that observer once with a deadline
of at most ten seconds and aborts on completion/failure. It has no default adapter,
no HTTP/SQL/SDK imports, no dynamic adapter loading and no live CLI mode. A JavaScript
authorization object is an execution guard, NOT permission from the operator.
Cancellation requires a cooperative adapter; this is not a sandbox that can stop
an arbitrary callback. No callback is used for live access in this task.

## Authorization classes

| Class | Exact separate authorization needed |
| --- | --- |
| A: read-only while OFF | Named Development loopback app origin and pinned project API, existing synthetic sessions A/B/U, fixed read-only auth-access RPC and endpoint rejection checks, independent trace/baseline evidence. No Auth login/refresh, fixture creation, privileged probe or mutation RPC. Existing catalog postflight is reused. |
| B: temporary capability | Explicit grant authority and time window for authenticated EXECUTE on **only** public.contratpro_provision_identity(), restricted synthetic users, exact case IDs/request budgets, observer, revocation authority and final denial verification. No bridge EXECUTE, role membership, direct identity-write grant or app gate activation. The grant applies to the authenticated role, not just one test account: restrict test exposure and schedule accordingly. |
| C: controlled writes/faults | B plus named disposable synthetic Auth users and exact identity/mapping fixture rows, before/after observer, bounded write counts, fault mechanism, recovery/cleanup ownership and environment. C04/C05 additionally require separate authorization of provisioning and auth-access gates in an isolated Development app process only. Agency/client gates remain unchanged. |

No grant/revoke, fixture DML, token issuance, signing-key export, trigger, role,
diagnostic function or fault proxy is created by this package. Existing capability
owner permissions cannot be assumed: approved owner-capable grant/revocation and
temporary-authority removal procedures are prerequisites, not commands invented here.

## Test identities, measurements and hard bounds

Use an operator-owned synthetic cohort, never real customer accounts:

- A/B: existing active distinct canonical mappings, no agency memberships; distinct
  Auth subjects. U: fresh unmapped subject. D: disabled canonical mapping. E: equal
  provider/canonical IDs. K: reviewed conflict fixture. Tokens stay only in the
  authorized local process; map these logical labels to actual UUIDs privately.
- Never force an Auth subject to a deterministic UUID or rely on matching UUIDs.
  Assert relationships (same subject, distinct canonical, one link) deterministically.
- The independent observer captures the cohort's exact canonical IDs, candidate
  user ID set, mapping set, active states, and agency/membership associations before
  and after. Evidence report stores booleans only; retain sensitive baselines privately.
- An orphan delta requires tracking newly inserted candidate IDs, including those
  with no mapping. A self-only JWT read cannot see them. Use an approved operator
  observer scoped to a disposable isolated cohort/environment; global counts or
  successful return values alone cannot prove rollback/no orphan.
- Existing-case B calls require a verified mapping baseline, serialized fixture
  edits and no concurrent identity deletion. If it changes, stop before invoking.
  No expected row writes in B. An unexpected write aborts B and requires C review.
- Per request deadline 7 seconds; observer deadline <=10 seconds; one case at a time
  except the C01 pair; concurrency <=2. Per-case HTTP budgets: A01 8, A02 4, B01 1,
  B02 6, B03 4, B04 2, C01 2 simultaneous + 1 explicit repeat, C02 3, C03 1,
  C04 1 + 1 separately initiated reconciliation repeat, C05 1. C06 requires a reviewed
  finite denial-statement list of at most 8 attempts. No automatic retries.
  Observer reads need a separately approved finite query list and deadlines. Keep
  each case <=60 seconds, stop at first failure/uncertainty; never auto-run all cases.

## Live matrix and acceptance procedure

| Case | Class | Action and deterministic acceptance |
| --- | --- | --- |
| A01 | A | FR/AR empty same-origin POST to /auth/provision returns blocked/503 while OFF, with no provisioning RPC. Cross-origin/missing Origin ->403; nonempty body ->400; GET never provisions. Use existing endpoint, not a test-only bypass. |
| A02 | A | Existing A/B JWTs call only contratpro_auth_access; each sees its subject/mapping only; existing U remains unmapped. No refresh, writes or user creation. |
| B01 | B | Real PostgREST zero-argument RPC for pre-existing A returns existing. Reviewed bridge acceptance supports inference that its authenticator/session role/typed claims checks passed through nested definers. Explicit runtime context observation requires a separately reviewed mechanism; never claim direct observation from a mock or set_config. No public bridge diagnostic RPC. |
| B02 | B | Anonymous key/no user JWT, malformed JWT, expired JWT with refresh disabled, signed anonymous-user JWT, wrong issuer/audience: denial and zero cohort delta. JWT corruption proves signature rejection only; it does not test bridge claim validation. Typed malformed claims require an approved isolated signing/claim-fixture mechanism, otherwise mark that coverage UNVERIFIED. |
| B03 | B | Extra subject/target RPC parameters rejected; A cannot read B and vice versa. Reuse accepted catalog evidence for bridge EXECUTE, writer SET, direct-write privileges and FORCE RLS. This is not behavioral DML/RLS proof; attempted direct writes require C06 even when expected to fail. |
| B04 | B | Two separately initiated calls for A return existing; canonical ID, user/link and agency/membership baselines unchanged. |
| C01 | C | Fresh U: barrier-release exactly two independent same-subject calls with observable overlap. Both return created/existing; exactly one active distinct canonical user and one mapping; zero candidate orphan delta and no agency/membership creation. Explicit repeat retains canonical ID. |
| C02 | C | D/E/K fixtures reject; no reactivation, relinking or repairs. Exact K conflict mechanism must be reviewed first; do not weaken unique/FK/RLS constraints. Skip/block unsupported conflict injection, never fabricate proof. |
| C03 | C | Disposable Development clone only: inject a reviewed failure after candidate insert and before mapping completion. Mapping delta and candidate orphan delta both zero; unrelated rows unchanged; remove fault and verify removal. No production/shared-Development function replacement or global trigger fault. |
| C04 | C | Isolated app uses the real provisioning handler/adapter through a bounded test proxy. Drop the upstream response only after the controlled write may have committed, not merely disconnect the browser. Existing handler must return uncertain/503, make one attempt; independent observer reconciles actual commit; explicit later repeat preserves canonical ID. Losing only the downstream browser response proves delivery loss, not handler uncertainty. |
| C05 | C | Let a valid token expire after an established write attempt, delaying upstream acknowledgement/read-back in the isolated transport. Disable automatic refresh. Handler returns uncertain/503, not401; observer reconciles same subject and no duplicate identity. A pre-write expired-token denial is a different test. Do not alter system clock or deployed function. |
| C06 | C | Approved restricted-session procedure: verify actual session/effective role; reject direct identity INSERT/UPDATE, writer SET, bridge invocation and wrong-subject reads; exercise FORCE RLS through the existing capability path. Record statement-specific denial, transaction rollback and unchanged fixture/unrelated rows. No broad grants, synthetic authenticator impersonation as gateway proof, or customer records. This procedure is not implemented or authorized by the local harness. |

References to existing implementations, reused without duplicate business logic:
`apps/web/src/auth/{provisioning-handler,canonical-provisioning,identity}.ts`,
`apps/web/src/auth/{provisioning-handler,canonical-provisioning}.test.ts`,
`supabase/migrations/20261116000700_canonical_provisioning.sql` lines 29-107.
Existing injected tests already exercise expiry/read-back/subject binding and
uncertainty; these are offline application proofs, not live PostgreSQL evidence.

## Evidence and stop/disable rules

Record case ID, authorization reference/time window, target confirmation, artifact
hashes, credential-free request trace/timestamps, approved observer baseline/deltas,
actual status and fixed outcome, and reviewer sign-off in a protected operator log.
Do not copy tokens, cookies, raw JWTs, signing keys, customer rows, passwords or raw
driver errors into this repository or the boolean report. Require an existing
verified CA and hostname-validation path for any future database observer.

On target drift, unexpectedly enabled gate, privilege drift, customer data, timeout,
failure, ambiguous write or missing orphan evidence: stop, preserve evidence, use
read-only reconciliation; no retry, repair, deletes or history edits. After B/C,
separately authorized owner-capable revocation restores authenticated EXECUTE denial,
isolated app gates return OFF and final effective-denial checks are required.
Fixture cleanup is a separately reviewed dependency-aware operation, not an automatic
DELETE or cascade. Do not delete canonical identities to roll back provisioning.

## Remaining blockers before activation

The Category A observer is prepared offline; its live transport, session evidence
and independent trace/baseline callbacks still require review and authorization.
No B/C live adapter, signed malformed-claim fixture facility, direct-context observer,
restricted-role denial procedure, orphan observer, conflict/fault harness or cleanup
procedure is approved by this local preparation. Review and authorize each one before
its case. Application gate activation for C04/C05 is a separate limited test action,
not implied by temporary SQL EXECUTE. A/B/C observations and reviewed evidence must
all pass; the harness never authorizes activation. The Provision UI caller and all
other application gates remain separately scoped.
