# Offline Digest Final Gap Closure V1

**GO for owner acceptance review only. Offline Digest implementation, real signing and Production remain NO-GO.** C1–C8 are a technical baseline awaiting owner approval. ADR-001 remains PROPOSED and unchanged. This report supplies isolated synthetic reference evidence; it grants no implementation authorization or signing trust.

## 1. Scope and exact file inventory

Only this report and the following new files under `verification/offline-digest-final-gap-closure-v1/` were created. No earlier report, application source, existing test or previous verification file was modified. The final checker compares 190 pre-existing protected files byte-for-byte using their preflight SHA-256 values.

| Files | Purpose |
| --- | --- |
| `README.md`, `preflight.mjs`, `protected-before.json` | Commands, original protected-file baseline |
| `native-boundary.mjs`, `native-report.json`, `native-accepted-inputs.json` | Two native admission traversals and admitted transported fixtures |
| `prepare.py`, `preparation-report.json`, `corpus-input.json`, `png-fixtures.json` | Deterministic new synthetic corpus and read-only baseline replay preparation |
| `gap-node.mjs`, `gap_python.py` | Independently written PNG, combined-fault and lineage helpers |
| `replay-node.mjs`, `replay-python.py` | Isolated replay copies; original codec/framing blocks preserved |
| `known-answers.json`, `independent-python-report.json` | Complete byte/frame/digest answers and independent comparison |
| `resource-worker.mjs`, `resource_probes.py` | Bounded per-process component workloads and independent stream verification |
| `resource-initial-report.json`, `resource-report.json` | Initial harness timeout evidence and completed resource run |
| `test_final.py`, `check-final.mjs`, `final-check-report.json` | Seven isolated acceptance tests, source/registry consistency and exact checksummed inventory |

The machine-readable inventory in [final-check-report.json](../verification/offline-digest-final-gap-closure-v1/final-check-report.json) excludes its own checksum. No changes to lifecycle, PDF or rendering behavior. No application regression commands were run because those protected files remain unchanged; the authorized isolated checks directly cover this verification-only scope.

## 2. Five applicable gap outcomes

### A. Native JavaScript boundary

32 actual native cases agree between recursive descriptor/ancestry traversal and iterative descriptor/stack traversal. Five admitted cases (plain object, array, frozen data, shared non-cyclic references and valid surrogate pair) also have independent Node/Python canonical-byte, frame and digest comparison.

The proposed strict branch rejects the remaining cases as `invalid-input`: null/custom prototypes, class instances, own undefined, array undefined, hidden properties, getters/setters, symbol keys, sparse/extra/hidden array keys, cycles, lone surrogate values/keys, Date, Map, Set, typed arrays, ArrayBuffer, functions, symbols, boxed strings, NaN, Infinity and Proxy. Accessors were inspected without invocation: getter/setter counters remain zero. Proxy detection precedes traversal. Shared references without cycles are encoded by occurrence.

**Null-prototype admission remains OPEN.** The rejection is an explicitly labelled candidate interpretation of “plain data”, not a newly approved rule. Accepting null-prototype records instead requires an owner decision and corresponding accepted vectors. Python cannot independently exercise JavaScript object prototypes; its role starts at the five admitted transport fixtures. See [native-report.json](../verification/offline-digest-final-gap-closure-v1/native-report.json).

### B. Populated PNG screen

20 predicate cases: 7 accepted and 13 rejected. Seven accepted decoded byte sequences also have asset-domain exact-byte vectors. Synthetic minimal 1×1 and bounded 2×2 fixtures contain IHDR/IDAT/IEND. Negative cases cover signature, missing IHDR/IDAT, zero or excessive dimensions, decoded cap+1, invalid base64/padding bits, trailing data, acTL, malformed chunk lengths and oversized URI. Decoded 204,799/204,800 bytes pass; 204,801 rejects.

The existing proposal is a **structural screen**: canonical base64, bounded URI/decoded bytes, PNG signature, first 13-byte IHDR, dimensions 1–2048, bounded chunk traversal, IDAT, final zero-length IEND, no acTL or trailing bytes. Deliberately corrupted CRC and invalid compressed IDAT content pass this screen. No CRC, pixel decoding, visual validity or renderer-safety claim follows. The two ordinary positive fixtures have authored synthetic pixel/zlib/CRC bytes, but this run does not certify decoding. Mandatory logo/asset coverage remains OPEN. See [png-fixtures.json](../verification/offline-digest-final-gap-closure-v1/png-fixtures.json).

### C. Actual combined-fault precedence

11 cases exercise actual input, dependency graphs, expected bindings and digest comparisons. Node uses indegree traversal; Python uses DFS. They do not select the minimum from an input list of error codes.

| Synthetic case | Deterministic candidate result |
| --- | --- |
| Valid complete input | integrity-match-unverified |
| Unsupported profile + malformed input | unsupported-profile |
| Malformed + missing dependency; malformed + cycle | invalid-input |
| Cycle + missing; cycle + binding/digest faults | ambiguous-input |
| Missing + binding; missing + digest | unavailable-input |
| Binding + digest | binding-mismatch |
| Two independent wrong digests | digest-mismatch; both IDs reported |
| All fault classes | unsupported-profile |

The proposed order is unsupported → invalid → ambiguous → unavailable → binding → digest → integrity-match-unverified. Earlier-stage rejections perform zero hash calls. Terminal hashing cases independently compare full witness bytes/frames and digests. **Precedence remains PROPOSED**, not an approved runtime error contract.

### D. Actual bounded resources

42 probes completed: cap−1/cap/cap+1 for all 13 C6 budgets (39), plus three expected-context node-count cases. Every child has a Windows Job **384 MiB process-commit limit**, kill-on-close, Node **128 MiB old space**, and **15-second wall timeout**. Actual buffers, arrays, object members, depth, nodes, strings, keys and bigint values are constructed within those controls.

| Proposed cap | Exercised boundary |
| --- | --- |
| PDF 16 MiB; asset 4 MiB; assets 128 | Each cap−1, cap, cap+1 |
| Aggregate 64 MiB; snapshot 2 MiB; each core/root 256 KiB | Each cap−1, cap, cap+1 |
| Depth 32; nodes 50,000; members 256; array 1,024 | Each cap−1, cap, cap+1 |
| Key 256 UTF-8 bytes; string 512 KiB; bigint 256 digits | Each cap−1, cap, cap+1 |

Measured wall time: **126.879–1,140.754 ms** per process. Peak resident memory: **41,041,920–112,709,632 bytes** (Windows PeakWorkingSetSize). Resident memory differs from the Job's commit limit; the V8 setting is not a total-process limit. Parent time includes launch, supervision, output and witness verification; measurements are environment-specific, not SLAs or signing timestamps.

Python independently reconstructs expected successful payload/framing streams from recipes and compares every witness byte and SHA-256 output, rather than hashing one shared frame twice. Aggregate accounting includes PDF + asset bytes + four emitted canonical component lengths; expected-context nodes count toward the node budget without entering the root bytes. Cap+1 rejects before hashing, with no witness or partial successful result. Large full hex streams are not retained; recipes, component offsets/lengths and digests permit reproduction.

These are ASCII codec/component workloads, **not full-schema package or future engine performance certification**. Filled PDF/asset buffers are not valid PDFs/images. The first run had two stdout-pipe deadlocks at large asset counts. Its report is retained; bounded concurrent pipe draining fixed the harness without raising resource limits or altering profile bytes. Final result: **42 verified, 0 unverified**. See [resource-report.json](../verification/offline-digest-final-gap-closure-v1/resource-report.json).

### E. Synthetic prior editions

Eight cases independently construct complete prior/current root canonical bytes, frames and digests where hashing is reached.

| Case | Candidate result |
| --- | --- |
| Valid previous edition; changed live CAS | integrity-match-unverified |
| Self-reference; duplicate edition; cyclic lineage | ambiguous-input |
| Missing prior edition | unavailable-input |
| Cross-agency prior edition | binding-mismatch |
| Conflicting prior manifest digest | digest-mismatch |

The candidate key is `(editionId, manifestRef)` within explicit agency/contract scope. Frozen finalization revision 6 is separate from live CAS 7/8; changing only CAS leaves root digest unchanged. The cyclic negative fixture deliberately carries an inconsistent declared digest; no cyclic hash fixed point is fabricated. Earlier structural/graph/binding failures hash nothing.

This proves consistency of explicitly declared **synthetic** lineage, not authenticated retained history. `historicalAuthority` stays `not-established`. A real previous edition would require unavailable authenticated history and durable authority checks; neither is inferred from a matching digest.

## 3. Verification counts and provenance

**206 compared corpus vectors, zero discrepancies:** 153 unchanged baseline + 53 new. New cases comprise native admitted 5, PNG screen 20, accepted PNG asset bytes 7, combined faults 11, lineage 8 and historical-preservation package witnesses 2. The latter preserve whitespace in original text and a signed bigint money value; they do not approve business eligibility.

Comparison classes: exact-byte reference 104; rejection reference 41; existing graph models 3; existing counter models 39; new gap references 19. Native admission 32 and actual resource probes 42 are separate test dimensions and must not be added to 206 as unique digest vectors. All 49 original source rows remain represented; three primitive SHA-256 known answers remain unchanged. The registry contains 67 native-DSL definitions, not a claim of JSON Schema compliance.

Node **v24.15.0**, OpenSSL **3.5.5**, win32/x64; Python **3.14.0**, OpenSSL **3.0.18**, Windows **10.0.19045**. Separate Node/Python encoding, scalar ordering, framing and hashing paths compare full canonical UTF-8/hex, framed bytes/lengths, counts, schemas, digests and result objects. Both cryptographic libraries are OpenSSL-family implementations; this is automated cross-reference evidence, not human independence or cryptographic certification.

Exact commands run from repository root (through the local lean-ctx shell wrapper where applicable):

```powershell
node verification/offline-digest-final-gap-closure-v1/preflight.mjs
node verification/offline-digest-final-gap-closure-v1/native-boundary.mjs
python -B verification/offline-digest-final-gap-closure-v1/prepare.py
python -B verification/offline-digest-final-gap-closure-v1/resource_probes.py
python -B verification/offline-digest-final-gap-closure-v1/test_final.py
node verification/offline-digest-final-gap-closure-v1/check-final.mjs
git diff --check
```

Preflight ran once; its baseline cannot be overwritten. Preparation/tests were rerun as new fixtures were added. Resource supervision ran initially and after the bounded I/O correction. `test_final.py`: **7 tests passed**; it runs only new replay copies and reads original outcomes without rewriting them. Final checker: protected files, original codec/framing blocks, schema digest/count, corpus cardinality, exact first 153 outcomes, no discrepancies, resource results, no residual witness and new-file whitespace. `git diff --check` supplements whitespace checks for untracked new files.

## 4. Remaining UNVERIFIED and deferred scope

- Optional .NET: **UNVERIFIED-TOOL-POLICY**; earlier local allowlist block respected, no retry or bypass. This is not a Node/Python disagreement.
- Authenticated historical authority, real identities, consent, trusted time, provider evidence, durable audit and legal sufficiency: unavailable/out of scope; no trust upgrade.
- Original pending raw JSON importer K04 and raw UTF-8 importer U11: deferred because this profile accepts native data/typed fixtures, not raw import.
- P03 deterministic PDF rerender, P05 signature incremental PDF changes and P06 legally authoritative representation: deferred because no renderer, signing or authority decision is implemented.
- Full engine performance, PNG decoding/CRC/safety, arbitrary native realm compatibility and approved mandatory asset coverage: not established by these finite reference cases.

The five applicable gaps now have scoped reference outcomes. Policy approval and independent human acceptance remain pending; unchanged old reports intentionally retain their earlier pending labels.

## 5. Owner decision register

Every row remains **OPEN** or **PROPOSED**. Computation does not approve a policy.

| Decision/status | Recommended choice | Alternative and consequence | Evidence / exact owner action |
| --- | --- | --- | --- |
| Native prototypes — OPEN | Ordinary data objects/arrays only; reject null/custom prototypes and accessors | Admit null prototypes explicitly; adds compatible data but changes the admission boundary | A: 32 cases. Decide null-prototype admission and exact rejection category; accept or amend strict branch |
| Populated logo/assets — OPEN | When a logo binding is declared, bind its exact decoded bytes to its asset digest | Screen-only logo or mandatory exhaustive asset coverage have different integrity/completeness guarantees | B: 20 screens/7 byte vectors. Decide required coverage, mapping and whether stronger PNG validation is required |
| Historical trim — PROPOSED | Temporary trimmed view for validation only; hash original source unchanged | Reject whitespace or normalize first; excludes archives or changes identity | Whitespace package witness. Approve validation-only trim and original-byte preservation |
| Historical money — OPEN | Preserve signed historical bigint type/value; separate business eligibility from integrity | Apply current nonnegative ranges; may reject readable history | Negative-money package witness. Decide historical acceptance and exact range/schema policy |
| Prior editions — PROPOSED | Scoped composite identity, unique editions, no self/cycles, exact prior digest; authority separately required | Null-only scope excludes lineage; authenticated history requires future integration | E: 8 cases. Approve graph policy and explicit lack of historical authority |
| Expected context budget — PROPOSED | Count its nodes with all four canonical structures; do not hash live context into root | Exclude context from caps risks unbounded work; include it in root changes identity | Three context probes plus CAS invariant. Approve exact counting boundaries |
| Error precedence — PROPOSED | Unsupported → invalid → ambiguous → unavailable → binding → digest → unverified match | Another fixed order changes diagnostic compatibility; unordered selection is nondeterministic | C: 11 actual combinations. Approve exact order and mismatch collection policy |
| Profile/schema registry — PROPOSED | Freeze the exact draft registry/67 definitions and version all future incompatible changes | Amend before implementation and regenerate/independently accept affected vectors | Unchanged schema SHA-256 in comparison report. Approve exact file bytes, schemas, domains and exclusions |
| Runtime/resource acceptance — OPEN | Pin reviewed Node/Python builds and retain C6 caps; approve reference evidence separately from engine acceptance | Other runtime/limits require new measured evidence | D: 42 probes. Select responsible reviewers, accepted platform/limits, future engine resource criteria and optional third implementation policy |

## 6. C1–C8 readiness

| Baseline | Evidence available for review | Approval state |
| --- | --- | --- |
| C1 scope/targets | Independent snapshot/PDF identities and synthetic manifest baseline; no authority selection | OWNER APPROVAL PENDING |
| C2 input/compatibility | Strict schema/native cases; original data preservation witnesses; null prototype/money policy open | OWNER APPROVAL PENDING |
| C3 canonical bytes | Unchanged codec; Unicode/number/order baseline and independent byte comparison | OWNER APPROVAL PENDING |
| C4 digest/profiles | Unchanged framing/domains, raw/internal PDF distinction, three SHA-256 known answers | OWNER APPROVAL PENDING |
| C5 graph/revisions | Acyclic cores, non-null synthetic lineage, frozen/live revision split; historical authority excluded | OWNER APPROVAL PENDING |
| C6 limits | All 13 actual cap boundaries plus context counting; environment/envelope limitations explicit | OWNER APPROVAL PENDING |
| C7 result boundary | Actual combined faults, fail-closed precedence, unconditional unverified/no Signed | OWNER APPROVAL PENDING |
| C8 independent vectors | 206 comparisons, zero discrepancies; exact schema/corpus hashes and provenance | OWNER APPROVAL PENDING |

## 7. Human acceptance and implementation entry

- [ ] Owner records approve/reject/amend decisions for all nine register rows and C1–C8; no implicit approval from this report.
- [ ] Named responsible technical/security reviewers independently inspect native admission, PNG scope, graph policy and resource accounting.
- [ ] Independent reviewer reproduces exact input/canonical/frame/digest answers, validates provenance and accepts the OpenSSL-family limitation or commissions another permitted implementation.
- [ ] Exact schemas, profile/domain identifiers, framing bytes, output/error contract, limits and exclusions are approved; any amendment receives new independent vectors.
- [ ] Applicable gaps are accepted as closed within this reference scope or explicitly excluded by owner-approved scope. Deferred cases remain explicitly excluded.
- [ ] Historical compatibility decisions preserve original data and reconcile with previous architecture gates; no authentication, audit or signing dependencies are silently assumed.
- [ ] Reviewers accept measured reference costs and separately specify acceptance criteria for a future application engine.
- [ ] Separate, explicit Offline Digest implementation authorization is issued with bounded files, tests and capability exclusions.

No reviewer identities, approvals, audit events, consent, signatures or trusted timestamps have been fabricated. All results remain unverified and cannot activate Signed.

**GO: owner acceptance review only. NO-GO: Offline Digest implementation until every entry gate above is satisfied. Real signing: NO-GO. Production: NO-GO.**
