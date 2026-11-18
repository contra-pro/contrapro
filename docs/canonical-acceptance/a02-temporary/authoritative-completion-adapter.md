# A02 reviewed completion adapter — offline contract

This is a validator, not a Supabase evidence producer. Gate 2 remains unauthorized.
No real policy/receipt/source was created. Test fixtures are explicitly fictional.

## Actual local sources and their limits

| Existing mechanism | What it establishes | What it does not establish |
| --- | --- | --- |
| Auth SDK createUser, GoTrueAdminApi.ts:480 | POST response/acknowledgement | Independent backend commit/drain evidence after a lost response |
| Auth SDK getUserById, GoTrueAdminApi.ts:623; exact-ID observer auth.users lookup | Current user state when independently read | Completion of an exact earlier request or absence of delayed writes |
| Auth SDK deleteUser, GoTrueAdminApi.ts:843 | DELETE response; returned user data is fetched BEFORE deletion by this SDK | Independent post-delete absence or authoritative rollback/finality |
| Migration 0007 provisioning function | Transactional user/link logic, including subtransaction rollback on conflict | An independently accessible request-correlated commit/rollback exporter |
| Independent identity.supabase_users/identity.users observation | Current exact mapping/active state and scoped business facts | Proof an unknown request is no longer in flight |

Actual commit/rollback authority belongs to the database transaction outcome. No
current repository mechanism exports an independently authenticated, exact-request
terminal event for these operations. Provider/database export availability and
semantics remain UNVERIFIED; no raw Supabase log format or guarantee is assumed.

## Prepared adapter and trust boundary

scripts/a02-authoritative-completion.mjs validates an independently reviewed
transaction-export contract. Its two supported source categories are
reviewed-provider-transaction-export and reviewed-database-transaction-export.
These names describe accepted policy categories, not deployed exporters.

The required policy is an out-of-band reviewed trust root: exact Development project,
run, Gate 2 or Gate 4, 120-minute start/end, review reference, independent capture,
authority ID/type/review/semantics, supported operations and explicit guarantees of
request correlation, backend completion and commit outcome. It includes a finite
operation ledger with expected attempt UUID, operation, A/B/U label, exact nominated
subject, start time, provider/backend request ID and source-artifact SHA-256.
All references are UNBOUND until actual evidence is reviewed. Typed assertions,
hashes and source labels cannot establish that an authority really provides those
guarantees; source authenticity must be established before supplying the policy.

The adapter does not discover authority, authenticate a provider signature, sign
exports, mint operation IDs, execute operations or bless an executor-written file.
The policy must not be copied from the receipt being evaluated or derived solely
from the mutation executor's logs. A source or logging contract which cannot meet
these requirements remains unsupported, even if a JSON file validates structurally.

## Bounded file integration

Existing createA02TerminalReceiptReader now requires authorityAdapter, created via
createA02AuthoritativeCompletionAdapter({policy,now}). No default authority exists.
For one exact attempt it reads only two files, each <=8KiB, from the approved local
directory outside Git/reparse paths:

- `<attemptId>.json`: existing normalized terminal contract, exact expected hash.
- `<attemptId>.transaction.json`: independently obtained/reviewed export, hash pinned
  in the policy ledger.

The export's exact field set is:

```text
format='a02-reviewed-transaction-export-v1', projectRef, runReference, authorityId,
attemptId, operation, label, subject, requestId, transactionId, startedAt,
completedAt, terminal=true, outcome=COMMITTED|ROLLED_BACK
```

This is a normalized review interface, not a claim that Supabase emits this format.
Any transformation from real evidence must itself be independently reviewed and
retain exact source provenance; no such live transformation/source is supplied here.
No credentials, emails, request bodies or unrelated records are allowed fields.

Checks include exact target/run/request/transaction/identity/outcome agreement,
completion after the expected start and within the window, no future time, <=30s
receipt age, unique attempt/actor/request ledger entries and one-time consumption.
Unknown/in-flight, timeout-only, missing-commit, stale, duplicate, tampered and
mismatched receipts fail closed. There is no retry/polling fallback.

Validated objects carry process-local lineage. The reconciler refuses plain JSON,
clones or typed `verified:true` flags, then still requires a separately obtained
observer snapshot after completion with successful rollback, integrity checks and
matching exact-ID state. The import remains inside the existing two-second deadline;
no HTTP/SQL operation or extra observation budget is introduced.

Gate 2 supports at most three auth-create plus two provision records, never U
provisioning. Gate 4 supports at most three auth-delete records only. Deletion
receipt validation does not authorize deletion, cleanup or Gate 2 reconciliation;
post-delete state still needs separately authorized Gate 4 exact-ID observation.

## Remaining real evidence requirement

No live authority policy is bound. Obtain an existing independently accessible
source's documented correlation/finality semantics and a sanitized pre-existing
sample/export for review, without creating a test user, invoking provisioning or
disclosing credentials. If none is available, retain UNVERIFIED/BLOCKED; do not
construct a FINISHED receipt to fit this adapter. Offline tests demonstrate rejection
and integration logic only, not live Supabase commit guarantees.
