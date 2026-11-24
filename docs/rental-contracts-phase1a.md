# Rental contracts — local Phase 1A design, NOT deployment-ready

## Status and boundaries

Stage A compatibility for local drafting: PASS, based on supplied Production evidence.
Production deployment readiness: NOT READY. No remote access, SQL execution, Docker,
extension installation, migration application or business-module changes occurred.
The new SQL file is in `supabase/migration-drafts`, outside auto-deployment inventory.
It raises unconditionally before DDL, ends ROLLBACK and records no migration history.
The five business decisions are APPROVED and implemented locally in this revision;
deployment authority and PostgreSQL runtime behavior remain unverified.
Removing these barriers is NOT sufficient to approve deployment.

Accepted evidence: 13 history versions through 20261119001200; no rental objects in
identity/tenancy/app_private/public; validated nondeferrable (agency_id,id) keys on
clients/vehicles/memberships/roles; JWT-bound active canonical identity helpers;
active/revoked membership states; dependency FORCE RLS; composite audit membership FK.
Objects outside those inspected schemas remain unknown. No local-file equivalence
claim is made. Independently deployed external rental workflows must be disclosed.

Local sources: foundation context 0002, RLS/grants 0003, auth 0004, agency 0005,
clients 0006, vehicles 0008 draft, client receipt 0009 v3, hardening 0012 candidate.
0002 active_membership_id/tenant_is_active consume caller settings through context_uuid.
They belong to a trusted SQL executor model, not the browser JWT authorization path.
This design never trusts those settings. It explicitly checks canonical_auth_user,
active same-agency membership and active agency on every entrypoint. No Staff role
key is required: all active members are authorized as approved.

## Threat model and architecture

Untrusted inputs: agency/client/vehicle IDs, dates, keys, versions and money.
Identity is never an argument. JWT subject -> receipt_auth_uid -> canonical mapping.
Do not introduce browser service-role access or convert selected agency IDs into proof.

New proposed objects:
- tenancy.rental_contracts: same-tenant client/vehicle/creator membership FKs,
  pricing snapshots, period, state, version and optional number.
- app_private.rental_numbers: transactional agency/year counter.
- app_private.rental_creation_receipts: actor-scoped key, normalized immutable payload
  and original response. No mutable client PII is copied into receipts.
- app_private.rental_confirmation_receipts: original confirmation key/version/result,
  one immutable receipt per contract. No mutable business-policy configuration table.
- contratpro_rental_writer: proposed NOLOGIN/NOBYPASSRLS restricted definer owner.

No separate reservation relation is needed: contracts in confirme/en_cours are the
reservation records. Index supports scans. A partial unique index permits at most
one en_cours contract per agency/vehicle, independently of expected end.

Nine public operations: create, list, detail, update_draft, confirm, start, complete,
cancel, extend (`public.contratpro_rental_*`). Private helpers are not callable by
authenticated. Only the public entrypoints are SECURITY DEFINER; helper functions
are INVOKER. Every function pins pg_catalog,pg_temp and row_security=on.
Tables remain postgres-owned with FORCE RLS; no direct authenticated table access.
New role-specific policies/grants on existing dependencies are PROPOSED SQL only;
they preserve existing role policies and do not alter other modules' authorizations.
Policy/default-ACL and authority preservation must be reviewed before promotion.

The proposed role can read only dependency IDs/states, no identity documents or
client contact details. RPC outputs contain contract fields and references, not
canonical user IDs. Audit metadata contains contract ID/version, no input payload.
Creation/confirmation require an active client. Client/vehicle edits do not rewrite
contract pricing. History survives client archiving. FKs prevent referenced deletion.
Vehicles have no archive state in the inspected local draft. References are immutable
even in drafts: cancel/recreate to change them; this is a stated MVP restriction.
Agency/client/vehicle document snapshots are deferred to the document phase.

## Inputs and arithmetic

Input object: clientId, vehicleId, start, end, dailyRateMinor, optional depositMinor.
No owner, actor, totals, numbering, state or arbitrary fields accepted.
Dates must be ISO timestamps with explicit Z/offset and up to six fractional digits.
Offset-less Casablanca wall times are rejected; caller must resolve DST ambiguity
explicitly and reject nonexistent local times before constructing an instant.
This database API accepts instants, not a claimed Casablanca wall-time/offset pair.
UTC normalization makes equivalent offset representations identical for idempotency.
No session timezone is used for parsing, pricing or confirmation-year selection.

Minor units are integral centimes (100 = 1 MAD). Fractional minor units, NaN/infinity,
negative rates/deposits and values above 10^12 centimes are rejected. Bound duration
to 1..1,000,000 billable days; maximum total 10^18 fits bigint. No floating-point money.
Days = ceil(exact elapsed seconds / 86400), not Casablanca calendar-date subtraction.
Deposit defaults to zero and is excluded from rental total. Limits are proposed
technical bounds, requiring product acceptance before deployment.

## Lifecycle matrix

| Operation | From | To | Conditions |
|---|---|---|---|
| create | none | brouillon | authorization, references, valid input; no issued number |
| update_draft | brouillon | brouillon | version; references unchanged |
| confirm | brouillon | confirme | version, active client, no overlap; allocate confirmation-year number |
| start | confirme | en_cours | version; within scheduled interval; no other unreturned handover |
| complete | en_cours | termine | explicit authorized vehicle-return acknowledgement; version |
| cancel | brouillon/confirme | annule | explicit versioned action |
| cancel | en_cours | forbidden | approved rule; complete via explicit return instead |
| extend | confirme/en_cours | unchanged | later end; preserve rate; version; no overlap |
| any mutation | termine/annule | blocked | historical terminal rows retained |

Start timing restriction is a proposed safe technical default, not an approved
business requirement; approve or replace it explicitly before promotion.
Completion requires `p_return_confirmed=true`; false/NULL is rejected. This is an
explicit authorized return operation, not independent sensor or documentary proof.
It persists returned_at and return_membership_id and emits rentals.returned. Scheduled
end is never return evidence. Database checks require return fields exactly for termine.
Every successful mutation increments version exactly once and appends audit in the
same transaction. There is no implicit completion, extension or cancellation.

## Concurrency strategy and proof obligations

Use transaction-level advisory locks, not btree_gist (available, not installed).
Hash collisions serialize unrelated operations conservatively; they cannot allow
conflicts. New writer has no login; authenticated cannot bypass RPCs with table writes.
The restricted owner is trusted capability code, not a general browser SQL executor.

Require READ COMMITTED in entrypoints. At REPEATABLE READ a pre-lock snapshot could
miss a newly committed competing reservation; SERIALIZABLE retry semantics are not
implicitly assumed. Volatile PL/pgSQL statements re-read after lock acquisition.

Create: actor/key lock -> receipt read -> references -> insert UNNUMBERED draft ->
receipt and audit. Duplicate identical calls return original JSON even
after later edits/cancellation; changed normalized payload gets 40001. Authorization
is rechecked before receipt access; revoked members cannot use receipts.

Mutation: contract row FOR UPDATE -> vehicle advisory lock -> fresh conflict scan ->
state/price/version change -> audit and confirmation receipt where applicable.
References cannot change, avoiding two-vehicle
lock ordering. All confirmation/extension/start/complete/cancel paths share this lock.
Two confirmations on different drafts for one vehicle serialize: the second scan
observes the first committed reservation and rejects [start,end) overlap (23P01).
An adjacent interval is allowed. A rolled-back first transaction leaves nothing.
Same-row competing updates serialize and the stale version loses (40001).

Overdue: scheduled end does not release en_cours. A future confirmed booking remains
confirmed; start is denied while any other en_cours exists, even without scheduled
overlap. No automatic shifting, cancellation, reservation expansion or price change.
Detail RPC reports physicalUnavailable (other ongoing handover) and overdueConflict
(confirmed contract plus an overdue ongoing handover). These operational indicators
do not modify either record and are advisory snapshots; start rechecks under lock.
Existing future commitments require operator resolution. Confirmation may reserve a
future interval while an overdue vehicle exists; this never authorizes handover.

Counter upsert serializes by agency/year. APPROVED: issue only during successful
confirmation; capture one confirmation_at instant AFTER vehicle lock and overlap check.
Its Casablanca calendar year determines both counter and displayed number. Draft
creation year is irrelevant, including a draft confirmed in a later year.
Number serial and counter are bigint; minimum width four, never truncating longer
serials. 9999 -> 10000 -> 10001 is valid. At bigint maximum 9223372036854775807,
allocation rejects atomically rather than overflows/wraps/reuses. Counter has no delete
access. Trigger forbids changing any issued serial/year/confirmation instant or deleting
historical contracts. Cancelled confirmed contracts retain their number; cancelled
unnumbered drafts remain unnumbered. Number uniqueness is per agency/year in PostgreSQL.
Rollback can reuse an UNCOMMITTED allocation because it was never externally issued.
Responses must not publish a number before commit. Confirmation receipt is inserted
in the same transaction after audit. Under contract-row lock, same request key and
original expected version return immutable result BEFORE stale-version checking,
even after later lifecycle changes. Another key/version after confirmation conflicts.
Retries allocate no number, increment no version and append no duplicate event.

Creation AND confirmation have immutable replay. Other mutations use version checks:
after uncertain response, read detail/version and reconcile before another operation.
SQL categories: 42501 denied; P0002 missing; 40001 conflict/stale; 22023 invalid;
23P01 reservation conflict; unexpected errors unavailable.
No raw exceptions should reach the future HTTP API. Post-send unknown means uncertain.

## Outstanding deployment blockers

1. Five business decisions are now approved, NOT blockers: confirmation numbering;
   variable-width bigint serial; confirmed/ongoing extension; no handover cancellation;
   preserve future bookings while ongoing handovers remain physically unavailable.
2. Review proposed technical restrictions: immutable draft references, start timing,
   monetary/duration bounds and explicit return acknowledgement evidence semantics.
3. Review real PG17 role creation/ownership authority. Current draft does not provide
   an approved temporary SET membership recipe; ALTER OWNER requires that authority.
   No temporary authority may survive the future production transaction.
4. Assert dependency/default ACLs and owners at promotion, compare final memberships,
   verify default grants cannot broaden new objects, and add atomic history insertion.
   The draft's dynamic owner loop must become an exact approved signature allowlist.
5. Verify runtime RLS, owner authority, read committed locking, casts/types, rollback and
   concurrency on PostgreSQL 17 with synthetic data after separate SQL authorization.
6. Source client state may change concurrently with authorization/reference checks.
   Define lock order/linearization relative to client archiving and membership revocation;
   the current draft validates observed state inside the transaction, not a global
   guarantee that a concurrently revoked member's transaction is forcibly cancelled.

## Focused test protocol (PREPARED, NOT EXECUTED)

No database SQL is authorized even locally in this task. Do not run PGlite or Docker.
The automated test file performs static parsing/scope assertions only, using PG18
parser packages already installed. %ROWTYPE becomes record for procedural parsing
because the offline parser has no catalog. This does NOT validate PG17 type resolution.

Future authorized PG17 harness: isolated local database; genuine restricted roles and
synthetic JWT subject adapter; fixtures A/B agencies, active Owner/Staff, revoked Staff,
inactive canonical user, active/archived clients and same-/cross-tenant vehicles.
Load reconciled dependencies and a reviewed locally executable copy. Preserve the
original guarded draft. No contract business-policy table or flag is needed.

| Test | Inputs/actions | Required assertion |
|---|---|---|
| Tenant references | create for A with A client/vehicle; substitute each B reference | A succeeds; B denied; no counters/receipts/audit for failures |
| Owner/Staff | create/list/detail for active A Owner and role-less active A Staff | both allowed; no staff role dependency |
| Denials | anon; revoked member; inactive user/agency; member only of B | 42501; no data disclosure/mutation |
| Dates | equal/reversed/infinite; missing offset; DST gap/fold wall time | invalid; explicit instants required; equivalent offsets normalize identically |
| Days | 1 microsecond, 24h, 24h+1 microsecond, 48h across timezone changes | 1,1,2,2 days using elapsed duration |
| Money | fractional/negative/NaN/overflow minor units; zero rate | invalid bounds rejected; zero valid; total exact |
| Deposit | missing, zero, positive, fractional, negative | default 0; separate total; reject invalid |
| Draft number | create and update draft | null serial/year/confirmed_at; zero counter changes |
| Number year | old draft confirmed across Casablanca New Year; two agencies | confirmation instant selects independent agency/year counters |
| Number concurrency | two connections confirm different nonoverlapping drafts same agency/year | unique consecutive committed serials; no duplicate |
| Number width | fixture counter 9998; confirm three drafts | 9999,10000,10001 with untruncated formatted numbers |
| Bigint limit | fixture counter bigint max; confirm | atomic rejection; no wrapped number or partial state |
| Confirmation retry | same key/original version, concurrent or after complete/cancel | immutable result; one counter increment, version increment and audit |
| Replay | same actor/key, equivalent offsets and omitted/default deposit | byte-equivalent creation result; one unnumbered contract/receipt/audit; no counter |
| Payload conflict | same key with changed rate, reference or end | 40001; original receipt unchanged |
| Concurrent replay | two sessions identical fresh key | same immutable result; one committed bundle |
| Overlap | overlapping confirmed periods, then exactly adjacent periods | overlap rejected; adjacency succeeds |
| Concurrent confirmation | S1 confirms and holds transaction; S2 confirms overlap | S2 blocks; after S1 commit S2 rejects; after S1 rollback S2 may succeed |
| Lifecycle | every from-state x operation pair from matrix | only allowed edges; terminal history retained |
| Extension | later end in confirme/en_cours; earlier/equal end; brouillon/termine/annule; future overlap | preserve rate; recalculate days/total; one version/audit; failures unchanged |
| Concurrent extension | S1 extends, S2 competing confirm/extend | serialization produces no conflicting reservations |
| Stale version | same version submitted twice, including two sessions | one increment/event; loser 40001 |
| Overdue | A en_cours past end; B confirmed future period | B cannot start until explicit A completion; A never auto-completes |
| Return | complete with true, false and NULL; attempt cancellation in en_cours | only explicit true completes; timestamp/actor/return audit persist; cancellation denied |
| Handover race | two starts; start vs completion on same vehicle | at most one ongoing; lock loser rechecks current state |
| Preserve future booking | overdue A and confirmed B | detail reports conflict; B dates/number/state/version stay unchanged |
| Rollback | induce audit failure after contract/counter work in isolated fixture | no contract/receipt/counter advance/reservation survives |
| Audit | each successful operation; replay; invalid operation | one correct actor/event/version for success; none for replay/failure |
| Isolation | repeat concurrency at READ COMMITTED vs repeatable/serializable | RC passes; unsupported isolation explicitly rejected |
| Privileges | invoke private helper, direct new-table INSERT/UPDATE/DELETE as auth | denied; no raw receipt/identity read; no owner SET path |

These are executable-harness requirements, not claimed behavioral test results.
A native, isolated multi-session harness is now PREPARED at
`packages/infrastructure/database/integration/rentals/README.md`. Its runner has not
been executed. It creates only a new owned local cluster and never accepts a database
URL. See that README for baseline projections, local auth/superuser differences,
positive safety checks, real lock barriers and future execution command.

## Next step

Review remaining technical assumptions and approve the detailed local test protocol,
then authorize an isolated local PG17 integration run. Separately reconcile execution
authority at deployment preparation; no additional full Production inventory is needed.
