# PROPOSAL ONLY — Option B: bounded state-based A02 acceptance

**NOT APPROVED. NOT IMPLEMENTED. NOT EXECUTION AUTHORIZATION.**

Target: Supabase Development `gllsiklbvqpxzucvkehw` only. Gate 2 remains BLOCKED;
application provisioning remains OFF. The current strict adapter, readiness rules,
packet, SQL, grants and runtime configuration remain unchanged. This document alone
cannot satisfy an existing blocker or authorize any operation.

## 1. Current strict requirement and replacement inventory

The strict path requires an independently reviewed authority/export policy, an exact
operation ledger, transaction-correlated COMMITTED/ROLLED_BACK terminal evidence,
and then an independent database snapshot after completion. No established live
Auth/provisioning exporter supplies that entire contract. Available committed-state
reads establish narrower facts which this proposal would explicitly accept.

| Current dependency | Source | Proposed treatment |
| --- | --- | --- |
| Reviewed provider/database authority, backend-completion/commit guarantees and semantics reference | `scripts/a02-authoritative-completion.mjs` | Replace for this cohort's state acceptance; no producer or guarantee is invented |
| Provider request ID, transaction ID, raw transaction export and source-artifact hash per operation | Strict adapter policy/ledger | Replace with a client intent ledger plus independently captured state; retain exact local attempt ID, run, operation, subject and artifact bindings, without claiming provider correlation |
| Paired `<attemptId>.json` and `.transaction.json`, FINISHED outcome, source review and <=30s terminal freshness | `createA02TerminalReceiptReader` / strict adapter | Replace with a distinct state-evidence contract and capture freshness; never fabricate strict terminal files |
| Process-local authoritative-validation lineage before reconciliation | `createA02Reconciler` | Replace only in a separately approved state-mode path with validated observer-capture lineage; retain default strict behavior |
| Completion timestamp before snapshot; COMMITTED plus presence / ROLLED_BACK plus absence | Strict reconciler | Require snapshots after the attempt/transport observation; accept only the resulting state. Never infer request completion or rollback from absence |
| `terminalReceiptSource`, `terminalSourceReview`, `terminalReceiptDirectory`, `authorityPolicyReference`, and strict transaction-outcome ledger requirements | Packet `independentEvidenceBindings` and readiness checks | Replace in approved Option B only with state-policy approval, intent-ledger and capture/review references. No placeholder PASS for old fields |
| `securityVerification.authTerminalSource` and `provisioningTerminalSource` must PASS | Readiness validator | Replace in approved Option B with explicit state-policy prerequisites; retain UNVERIFIED finality as a limitation, not a hidden PASS |
| In-flight completion accounting before advancing setup/removal/cleanup | Packet and recovery procedures | Replace normal successful-stage acceptance with state checks; ambiguous writes stop setup and enter bounded reconciliation. Allow only expressly approved containment; destructive cleanup has the additional restrictions below |
| Auth deletion terminal evidence under Gate 4 | Strict adapter supports deletion receipts; Gate 2 rejects deletion | Propose separate Gate 4 state acceptance only after independently verified cleanup and exact-ID pre/post observations; never grant deletion scope to Gate 2 |

Native migration SQL/history atomicity, exact pending plans, privileged cleanup
transaction guards and history reconciliation are **not** replaced. Unknown native
installation/removal outcomes remain subject to their existing bounded recovery
procedure. An unknown installation may commit later; function absence alone does
not authorize replay, removal, history repair or a claim that installation failed.

Referenced contracts reviewed: `gate2-execution-packet.json`,
`scripts/a02-packet-readiness.mjs`, `scripts/a02-independent-observer.mjs`,
`scripts/a02-reconciliation.mjs`, `cohort-observation.sql`,
`observer-reconciliation-integration.md`, `authoritative-completion-adapter.md`,
`scripts/canonical-category-a-observer.mjs`, and `cleanup.sql.in`.

## 2. Proposed acceptance semantics

Option B would accept **specific committed database state at named observations**.
It would not assert which backend transaction produced it, that an HTTP request has
terminated, that all work is drained, or that a missing effect rolled back.

Keep three independent fields in every future result:

- Acceptance: PASS / FAIL / UNKNOWN / BLOCKED, with scope and reason.
- Transport observation: ACKNOWLEDGED / REJECTED / TIMEOUT / CONNECTION_LOST /
  CANCELED / NOT_ATTEMPTED. These are observations from the executor, not DB proof.
- Request finality: UNPROVEN unless separately established by genuinely authoritative
  evidence. State PASS must not manufacture FINISHED, transaction IDs or rollback proof.

A normal timely acknowledgement plus the exact fresh independent expected state can
produce PASS with basis `INDEPENDENT_COMMITTED_STATE`. An acknowledgement alone
cannot. A transport error after an attempt starts produces UNKNOWN immediately,
including credential expiry, lost response, cancellation or failed confirmation.
An HTTP error cannot prove no write. If an error is followed by verified conflicting
state, classify the state violation FAIL while preserving unproven request finality.

PASS means the stated checkpoint succeeded under this deliberately narrower policy.
It is not readiness, permission for another operation, global no-change evidence,
acceptance of cleanup, or acceptance of the whole A02 case.

## 3. Retained controls and independent blockers

Retain unchanged:

- Exact Development project/issuer/route, PostgreSQL 17 and trusted CA/hostname
  verification; read-only privileged observer visibility; fresh separate connections,
  read-only transactions, successful observer ROLLBACK and validated capture integrity.
- Existing verified-session/JWT subject binding and feature/auth gates. No identity
  supplied through a new client parameter, mutable setting or untrusted metadata.
- Original provisioning RPC authenticated EXECUTE denied; application provisioning OFF;
  temporary parameter-free wrapper's A/B allowlist, absolute <=15-minute expiry,
  verified gateway bridge, NOBYPASSRLS writer, FORCE RLS and unchanged ordinary ACLs.
- Exactly three nominated Auth identities, two active distinct canonical mappings,
  U unmapped, zero memberships including revoked, zero scoped business data.
- No ordinary table-write privileges, implicit agencies, invitations, clients or
  activation. No changes to Auth/provisioning mutation payloads or production behavior.
- Native install/disable/removal as separately reviewed atomic SQL/history batches,
  exact archived bytes, no CASCADE, repair, seed or broad discovery.
- Memory-only hidden credentials/sessions, no refresh or persistence, default redaction,
  private capture ACLs and separate execution/observation manifests. Same owner may
  operate both processes; independently sourced captures remain mandatory.
- Structured logging clearance, actual Admin authority, protected runtime, private
  inbox/domain ownership and connection/credential-transport verification.
  Check 3's reported settings/ROLLBACK remain observations; its unverified overall
  20-second deadline/TLS/transport and blocked logging clearance are not waived.
- Existing 120-minute execution window, explicit actual runtime timestamps, artifact
  hashes and separate Gate 2 setup/lifecycle, Gate 3 reads and Gate 4 cleanup approvals.

No requirement to prove a source's request finality would be silently replaced by a
typed boolean. Approval must explicitly accept the reduced evidence claim and risks.

## 4. Evidence before any mutation

Keep nominations and reserved lifecycle versions unchanged:

| Label | Auth UUID |
| --- | --- |
| A | `17eaeec9-37e1-4720-ba7a-c1e16f659af5` |
| B | `305fb936-588e-42f9-bc4d-f41a0d3f60c0` |
| U | `f7334db7-f402-4f00-9c1a-754eb3eb2f3e` |

Versions remain install `20261117000100`, reserved disable `20261117000200`, removal
`20261117000300`; they are not deployed or approved by this proposal.

Before the first mutation, independently capture the exact target, native baseline,
original RPC denial, wrapper absence and temporary-rights absence. For only the
three nominees, prove Auth rows and mappings absent. After known installation and
immediately before the first Auth mutation, check the three private email addresses
and nominated IDs for collisions through the existing parameterized, logging-cleared
observer, within its 30s freshness limit; output labels/booleans only. Any collision stops; no adoption, reset,
replacement UUID, broad user enumeration or silent baseline refresh.

Record an append-only non-secret intent ledger before each allowed attempt:
run/attempt ID, gate, operation, label, expected Auth subject, approved artifact,
monotonic order and UTC time, allowed attempt count and transport observation.
Intent/transport records do not prove effects. No headers, keys, passwords, tokens,
private emails or raw responses belong in this ledger.

Independently capture target/run/checkpoint, actual snapshot timing, successful
read-only guard/ROLLBACK, exact row facts and capture hashes. Start a new transaction
for every observation; never reuse an old repeatable-read snapshot. Bind captures
to the intent ledger without pretending that the local ID is a provider request ID.
Record canonical IDs only in approved private evidence and pin them once observed.

The owner must coordinate exclusive control of writes concerning these nominees
and the temporary wrapper during the run. This is an operational safeguard, not
cryptographic proof that no other administrator/provider activity exists.

## 5. Separate acceptance conditions

### Auth creation — Gate 2

At most one create attempt each for A/B/U, at most three total, using the unchanged
existing payload and private ownership approval. Timely matching acknowledgements
are corroboration only. Before provisioning, a fresh independent capture must show
all three exact Auth IDs present, all three unmapped and no scoped business links.
Use the private preflight/address binding to prevent choosing unrelated existing
users; no address is written into repository evidence. Missing/partial cohort state
cannot PASS the whole Auth stage. No account reset/update or automatic compensation.

### Canonical provisioning — Gate 2

After Auth-stage acceptance, make at most one existing wrapper attempt as A, then B;
never U. Observe A before B's attempt. For A, require its exact mapping to an active
canonical user, all Auth rows still present, B and U unmapped, no memberships/business
references. For B, require both exact active mappings, two distinct canonical UUIDs,
neither equal to any nominated Auth UUID, U unmapped and all scoped counts zero.

Preserve observed canonical UUIDs for subsequent checks. A switch to another valid
canonical UUID is drift/FAIL, not a replacement success. Unexpected `existing`
responses in a fresh run trigger reconciliation; do not count idempotency as permission
to replay. A positive independent read proves committed mapping state; it does not
prove request finality or absence of an unknown unlinked candidate row elsewhere.

### Wrapper containment/removal — Gate 2 lifecycle

After A/B state observations and acceptance, remove immediately rather than waiting
for expiry. Require the existing native history/body/owner/ACL comparisons and
post-removal absence of every wrapper overload, original RPC denial and restoration
of temporary SET/schema CREATE privileges. Capture final cohort state again.

For unknown fixture mutations, only an expressly approved recovery branch may
revoke/remove access while reconciliation is pending. This is a proposed replacement
of the universal pre-removal drain prerequisite, not implicit emergency authority.
Record containment separately from fixture acceptance: revocation, expiry and DROP
are not cancellation of prior work. Unknown native installation outcome remains a
special barrier because a delayed installation could expose the wrapper later.
DROP failure rolls its revoke back; retain the existing separately authorized disable
then removal procedure. Never label cleanup complete solely because expiry elapsed.

### A/B/U isolation — Gate 3, separately approved

Only after wrapper removal and accepted cohort state, reuse fresh already verified
sessions and the existing exact three GETs to the pinned auth-access RPC. No spare
probe, login, refresh, new user or mutation. Preserve <=60s verification age and >10s
expiry margin; stale sessions BLOCK execution and need new explicit session scope.

Expected A/B results: exactly their own subject/canonical pair, active user, and all
five membership/agency fields null in the existing eight-field response. U returns
an empty array and remains unmapped in independent state. A seeing B or B seeing A,
duplicate rows, any unexpected membership or U becoming mapped is FAIL.

Require fresh before/after scoped cohort/security observations and an independent
review that only the three allowlisted GETs were issued. A fresh post-removal capture
may serve as the before capture if its age is <=2s and context is unchanged. Otherwise
Gate 3 approval must include the two read-only captures; the three-GET authorization
alone does not authorize extra SQL. Capture hashes/counts alone do not prove absence
of transient or unrelated writes. If the required scoped no-change/transport evidence
cannot be obtained, return UNKNOWN/BLOCKED, never fabricate `noDataChanges:true`.

With zero memberships, this verifies self-identity/membership visibility across A/B/U.
It does not establish agency/client cross-tenant RLS, all SECURITY DEFINER behavior
or the broader Category B/C suite; no fake agency data is introduced to extend scope.

### Cleanup and Auth deletion — Gate 4, separately approved

Keep exact-ID administrative RLS-bypass acknowledgement, ownership/dependency checks,
wrapper absence, original RPC denial, serializable cleanup transaction, locks and
affected-row assertions. Use only independently observed owned canonical IDs; never
guess IDs or delete by email/domain/population scan. No automatic cleanup in Gate 2.

For a known accepted cohort, verify exact mappings/canonical rows before cleanup;
after the acknowledged cleanup transaction, independently verify their absence and
unchanged unrelated scoped state. Then, only within separately approved Auth-delete
scope, attempt each evidenced existing Auth ID once and independently verify absence.
The SDK's returned pre-delete user is not post-delete evidence. Delete acceptance
means absence at the observation, never proof that no delayed writer can recreate it.

Default: destructive cleanup is BLOCKED while a creation/provisioning outcome is
unresolved UNKNOWN, or any canonical ID/presence/ownership/dependency is uncertain.
Positive-state adoption after a timeout does not itself grant cleanup authority or
prove quiescence. Any cleanup despite retained late-write risk requires a distinct
Gate 4 risk decision and reviewed bounded procedure; it is outside this proposal's
default path. An unknown deletion followed by absence stays UNKNOWN; no second DELETE
or guessed compensation. Quarantine remaining fixtures and escalate.

## 6. Bounded UNKNOWN reconciliation and escalation

1. Mark UNKNOWN as soon as a mutation loses reliable confirmation. Persist its intent
   and private evidence references. Freeze forward setup mutations and all retries.
   Stop the partial Auth creator; do not instantiate another creator to resume/replay.
2. If already included in the proposed run approval, take at most two fresh independent
   recovery snapshots for the affected Auth phase, A phase or B phase. Each is <=20s,
   with >=1s between completed snapshots; entire pair <=45s and within the remaining
   approved window. Stop early on lost authorization, guard failure or window end.
   These are new explicit state-reconciliation rules, not a waiting period proving drain.
3. If both snapshots show the same exact expected positive state, record
   `POSITIVE_STATE_OBSERVED`. UNKNOWN is not automatically promoted. The owner may
   record a separately reviewable state-adoption decision acknowledging unproven
   request finality under the approved Option B policy. This can accept that stage's
   observed effect; it cannot authorize additional writes, retries or cleanup.
4. Two absent snapshots remain UNKNOWN: no rollback, terminal failure or safe-retry
   claim. Changing/partial state remains UNKNOWN; a verified isolation/integrity
   violation is FAIL. Failed observer rollback or unavailable evidence cannot PASS.
5. At the bound, stop and escalate with exact attempt IDs, observations and unknowns.
   Use only the expressly approved containment/removal branch. No polling loop,
   deadline extension, new login, account substitution or extra mutation.
6. A partial Auth/setup phase remains incomplete even if one effect is adopted.
   Continuing unattempted mutations needs a newly reviewed bounded continuation
   scope; this proposal supplies no resume API or automatic workflow transition.
   A fully formed cohort may proceed to separately approved Gate 3 only after explicit
   state adoption, removal acceptance and every independent blocker is cleared.

Proposed ceilings: six normal cohort checkpoints (baseline, post-install, after-auth,
after-A, after-B, post-removal); one private email collision transaction; existing
exact-ID inventory once. Recovery replaces the implemented one-slot-per-phase rule
with at most two slots for each of Auth/A/B, six extra snapshots total, never per-user
polling. Normal mapping confirmations retain their existing 2s limit; other snapshots
retain 20s overall and SQL 5s statement /2s lock /10s idle limits with ROLLBACK.
The six recovery slots do not include native-history/install/remove recovery or
post-disable verification: those retain their existing separate exact approved
artifact/run limits, and must be enumerated in the run packet, not inferred here.
Gate 3 has exactly three GETs and at most two scoped observation captures as above.
Gate 4 counts, deadlines and IDs must be fixed in its own approval before any cleanup.

## 7. Proposed acceptance matrix

| Situation | Outcome | Consequence |
| --- | --- | --- |
| Timely matching ACK + fresh exact expected state + all controls satisfied | PASS for that checkpoint | Finality remains UNPROVEN; next gate/operation still needs its own scope |
| ACK without an independent capture | UNKNOWN after mutation | Stop setup; bounded observation only |
| Timeout, connection loss, cancellation, post-attempt expiry or malformed acknowledgement | UNKNOWN | No retry or automatic next write |
| Ambiguous mutation + one positive snapshot | UNKNOWN | Insufficient for state adoption |
| Ambiguous mutation + two stable positive snapshots | UNKNOWN pending owner review; state PASS only after explicit adoption | Preserve transport uncertainty; no implicit continuation/cleanup |
| Ambiguous mutation + two absent snapshots | UNKNOWN | Never relabel ROLLED_BACK/confirmed-no-write; quarantine/escalate |
| Fresh cross-user row, wrong canonical pair, unexpected U mapping/membership/business reference | FAIL | Stop and preserve evidence; no automatic repair |
| Missing target/TLS/logging/Admin/runtime/ownership approval before attempt | BLOCKED | Issue no mutation or private-parameter query |
| Prerequisite/observer access disappears after an attempted mutation | UNKNOWN for its outcome; BLOCKED for further execution | No assumed no-write result |
| Wrapper absent plus expected native history/ACLs under known lifecycle context | PASS for containment observation | Does not prove all Auth/provisioning work drained |
| Wrong native history, privilege drift or unexpected overload | FAIL | Existing bounded recovery only |
| Gate 3 exact A/B self rows and U empty, independent scoped checks pass | PASS for A02's defined isolation scope | No broader tenant-data or global no-write claim |
| Gate 4 acknowledged exact-ID cleanup/delete + verified expected absence, no unresolved mutation UNKNOWN | PASS for scoped cleanup state | Residual no-recreation limit remains explicit |
| Gate 4 timeout/unknown creation/deletion or uncertain ownership/dependencies | UNKNOWN/BLOCKED | No retry, cascade or automatic compensation |

## 8. Residual risks and acceptance limits

- A visible row proves committed state in that snapshot, not exact-request attribution,
  absence of queued work or lack of later change. The owner explicitly accepts this
  narrower claim if Option B is approved.
- Two stable snapshots improve detection but do not prove drain. No finite delay,
  TTL, revocation, hash, local lock or operation counter provides that guarantee.
- Late Auth creation after observed absence, late provisioning, and cleanup/recreation
  races remain possible when a mutation is UNKNOWN. Conservative stops/quarantine
  deliberately sacrifice automatic recovery and may leave fixtures pending review.
- State adoption can accept an effect while retaining uncertainty about its producer
  and future side effects. It is not a provider transaction receipt.
- The existing observer scopes by nominated Auth IDs and discovered canonical IDs.
  It cannot prove absence of arbitrary unrelated/transient writes or enumerate an
  unknown orphan canonical ID. Atomic provisioning SQL and tested constraints remain
  assumptions/contracts; suspected orphans require separate investigation.
- The owner also observes. Separate processes, capture provenance and private hashes
  support review but do not provide an independent human or tamper-proof audit service.
- Auth hooks/configuration drift, concurrent administrators, stale sessions, clock
  disagreement or incomplete privileged visibility undermine the baseline. Stop on
  observed drift; assumptions and unavailable evidence must remain explicit.
- This is Development synthetic-cohort acceptance only. No Production security claim,
  fresh-user provisioning activation, new grants or commercial-user acceptance follows.

## 9. Feasibility and minimal later implementation

**Feasible for state acceptance without changing production authentication,
provisioning SQL, RLS or tenant isolation. Not implementable by supplying fake strict
receipts or deleting current readiness blockers.** Reuse existing exact target,
nominees, transports, hidden credentials, mutation ceilings and independent queries.
Current scripts cannot execute Option B unchanged: the reconciler requires branded
strict terminal evidence, the observer has one recovery slot per phase, and the
readiness validator explicitly requires terminal-source/authority-policy evidence.
Cleanup and A02 no-change evidence still need their separately reviewed captures.

Minimal separately approved implementation slices:

1. Add a pure A02 state-policy evaluator/result schema and explicit proposal-approval
   binding. Strict remains the default; no fallback when strict validation fails.
   Keep request-finality and independent security-blocker fields separate.
2. Add state reconciliation beside the strict adapter, consuming only validated
   independent captures and the bounded intent ledger. Implement UNKNOWN freeze,
   two-slot caps, exact positive-state adoption and no absence-to-rollback transition.
   Retain existing create/provision payloads and one-shot behavior; no resume API.
3. Adapt the existing observer's recovery checkpoint identifiers/capture grouping;
   reuse its SQL and visibility/rollback/integrity checks. Add independent cleanup
   absence capture handling under Gate 4 only if separately approved; no mutation SQL
   changes or new broad database scans in this slice.
4. Add explicit reviewed state-mode readiness criteria and independent blocker checks.
   Keep source/finality status UNPROVEN rather than writing PASS to strict source fields.
   Change only the approved synthetic-tooling policy path, not app authorization.
5. Refresh the run packet/hashes only after code review/tests. Require separate review
   of the state-adoption/containment risks and the exact live operation/read budgets.
   No live work is part of this implementation approval.

Required deterministic acceptance tests for that later implementation:

| ID | Fixture / exact expected result |
| --- | --- |
| B01 | Missing Option B approval or unrecognized mode -> BLOCKED; strict remains unchanged |
| B02 | Wrong project/subject/run, stale baseline, duplicate nominee or existing ID/email -> BLOCKED before any write |
| B03 | Three matching Auth ACKs + independent three-present/unmapped snapshot -> Auth PASS; missing row -> no PASS |
| B04 | Auth ACK alone, cached snapshot or executor-produced success flag -> UNKNOWN |
| B05 | Partial Auth create followed by timeout -> UNKNOWN; no B/U continuation or second creator invocation |
| B06 | A exact active map with B/U unmapped, then B distinct active map and U unmapped -> provisioning PASS |
| B07 | Shared/equal/switched canonical ID, inactive user, missing Auth row or premature B/U mapping -> FAIL |
| B08 | Any membership including revoked, agency/client/invitation/audit reference -> FAIL for cohort acceptance |
| B09 | Mutation timeout/lost response/cancellation/post-write expiry -> UNKNOWN, zero automatic retries |
| B10 | Two absent recovery captures -> UNKNOWN; no rollback/finality/confirmed-no-write assertion |
| B11 | Two stable positive captures without owner adoption -> UNKNOWN; with approved adoption -> state-only PASS, finality UNPROVEN |
| B12 | Changing captures, one successful capture, failed ROLLBACK, capture tampering or stale metadata -> no PASS |
| B13 | Third capture in one phase, seventh recovery capture, <1s separation or >45s pair -> BLOCKED; fake clock and cancellation tests |
| B14 | Unresolved native install plus absent wrapper -> UNKNOWN; no replay/removal shortcut/history repair |
| B15 | Known install + expressly approved containment despite UNKNOWN fixture -> only scoped disable/remove; no claim of cancellation/drain |
| B16 | Delayed synthetic mutation after an absent/containment snapshot -> UNKNOWN remains; no cleanup or false permanent-success claim |
| B17 | Drop failure rolls revoke back -> existing separate disable branch only; expiry alone cannot PASS removal |
| B18 | A/B three-GET self mapping results and U empty + scoped independent checks -> A02 PASS; swapped rows/unexpected U -> FAIL |
| B19 | Stale/unverified A/B/U session -> BLOCKED before GET; no refresh/login or fourth request |
| B20 | No independent scoped no-change evidence around A02 -> UNKNOWN/BLOCKED, never a constant true callback |
| B21 | Unresolved creation, unknown canonical ID, missing ownership or extra dependency -> Gate 4 BLOCKED before deletion |
| B22 | Gate 4 exact known-owned cleanup ACK + independent absence -> scoped state PASS; SDK pre-delete user alone -> no PASS |
| B23 | Delete timeout + absence or late recreation -> UNKNOWN/FAIL as appropriate; no second DELETE/automatic compensation |
| B24 | Any attempted Gate 2 deletion or unapproved Gate 3/4 transition -> BLOCKED |
| B25 | Every logging/Admin/runtime/TLS/credential/ownership blocker independently absent -> BLOCKED even with perfect state snapshots |
| B26 | Capture/intent/result inspection and serialization expose no passwords, tokens, headers or private emails; original templates untouched |
| B27 | FR/AR disabled provisioning/access behavior and existing mapped-user/client regressions remain unchanged; no production/app-gate modifications |
| B28 | Future result asserts only observed state; test rejects fabricated transaction ID, FINISHED receipt or rollback/drain proof derived from snapshots |

Use injected transports, fake clocks and deterministic synthetic captures only for
implementation tests; then targeted lint, relevant regression suites and TypeScript
checks if TypeScript code changes. These tests are proposed, not newly run here.

## 10. Remaining blockers and approval boundary

Even if accepted as a design, Option B leaves logging clearance (including current
-1 parameter-length policy and unverified inspection safeguards), actual Admin
authority/channel selection, protected runtime, ownership evidence, current target/TLS,
timestamps, final native artifacts/hashes and separate execution approval outstanding.
All current strict source-policy requirements remain active until a reviewed explicit
implementation change replaces them. No live field is marked verified by this file.

Approval sequence, each distinct:

1. **Design decision:** owner explicitly approves or rejects this proposal's narrower
   state claim, ambiguity rules, added read budget, residual risks and cleanup limits.
2. **Offline implementation approval:** names the permitted script/policy changes and
   tests. It authorizes no source lookup, credentials, SQL, HTTP, grants or fixture work.
3. **Completed-packet execution approval:** separately binds actual operators, private
   evidence, cleared independent blockers, runtime window/expiry, exact artifacts and
   Gate 2 normal/recovery operations. Gate 3 and Gate 4 remain separate approvals.

**Present decision: PROPOSAL ONLY. Gate 2 is BLOCKED and UNAUTHORIZED. Only this
document is created; no executable behavior, source-hash manifest, packet status,
SQL, runtime setting, private template or live state is changed.**
