# Offline digest pre-implementation reference workspace

**PROPOSED reference artifacts only. No application exports/imports, production engine, runtime integration, approval or signing capability.** This directory is outside all application/package source and existing test suites. Only fixed local synthetic files are consumed. Node/Python use standard libraries; no installs or network calls are needed.

The [specification and closure report](../../docs/rental-contracts-offline-digest-preimplementation-closure-v1.md) is the human entry point. C1–C8 are a review baseline, not owner approvals. ADR-001 remains PROPOSED.

## Files and reproduction

- `schemas-and-registry.proposed.json`: exact native-type schema DSL, profile/domain registry, budget values and proposed error ordering. It is **not JSON Schema**, a production validator or a change to evidence V1.
- `author-corpus.py`: deterministic data author, no hashing. Writes schema proposals and `corpus-input.json`; constructs fixed synthetic labels and complete typed-value inputs independently of application models.
- `corpus-input.json`: `cp-reference-corpus-draft1`, typed input transport, source-row IDs, 153 runnable cases and explicit pending vectors. Native bigint/Number/negative-zero distinctions are not transported through ordinary untagged JSON numbers.
- `reference-node.mjs`: primary isolated reference encoder/framer/known-answer evaluator. No exports; fixed input/output filenames. Writes `known-answers.json`, with complete canonical text/hex, frames/lengths and digests for exact-byte cases.
- `reference-python.py`: separately implemented second encoder/framer, schemas/probes and package builder from original inputs; compares every complete answer, not just final digests. Writes `independent-python-report.json`; does not rewrite the expected corpus.
- `check-dotnet.ps1`, `dotnet-report.json`: optional third primitive-only path. **UNVERIFIED:** local lean-ctx policy rejected `pwsh` before execution. It was not retried/rerouted or allowlisted. No .NET result/version is claimed.
- `test_reference.py`: isolated tests, including deliberate corruption of an expected byte to ensure Python detects it. It restores the original bytes in `finally` and reruns the clean check. It does not invoke the blocked .NET path.
- `check-specification.mjs`: schema/reference/DAG/link/whitespace consistency, 49-row traceability and nine previously recorded source/test Git-object checks. Writes `specification-check-report.json`, also recording script hashes and byte examples. Source checks are read-only and do not import application code.

From repository root, authorized local reproduction commands are:

```text
python verification/offline-digest-preimplementation-v1/author-corpus.py
python verification/offline-digest-preimplementation-v1/test_reference.py
node verification/offline-digest-preimplementation-v1/check-specification.mjs
```

The tests regenerate the primary answers, independently compare them, exercise metamorphic/revision/budget properties and verify the corruption detector. They write only files in this directory. Do not run existing application regression tests for this artifact-only task. Do not import/copy these experimental oracles into production or treat their generated answers as an approved standard. Any future implementation needs an independently accepted corpus and explicit authorization.

## Independence and coverage limits

Node recursively emits text with its own string escaper, code-point comparator and Buffer number/framing operations. Python constructs a separate typed tree, uses Python scalar ordering/JSON-library scalar escaping, struct binary64/length packing and a DFS graph check (Node uses incoming-edge elimination). No encoder, framer, graph implementation or package builder is shared. Both consume the same **proposed** schema/corpus data, so agreement is not proof that the proposal is correct.

SHA-256 APIs are Node crypto and Python hashlib with distinct recorded runtime/OpenSSL versions. Both are OpenSSL-family implementations; no claim of independent cryptographic-implementation families or certification is made. Three fixed primitive known answers are checked separately by both paths. The unexecuted .NET path cannot strengthen that claim. No human reviewer identity, approval or trusted time is manufactured.

`exact-byte-reference` means complete agreed canonical/preimage/digest output for that scoped case. `rejection-reference` means an agreed rejection. `counter-model-only` tests inclusive arithmetic over supplied counters—not actual large allocations, peak memory or timing. `graph-model-only` tests an explicit edge model—not a production object resolver. None establishes authenticity, consent, trusted time, artifact validity or legal authority.

All 49 source rows are traced, **not all fully verified**. See `deferredRows` and the ten `pendingVectors`. K04/U11 raw import is excluded; P03/P05/P06 require prohibited/deferred PDF/signature/content work. Native JavaScript property boundaries, populated PNG screening, populated prior-edition linkage, combined-fault precedence and full measured resource-cost coverage remain UNVERIFIED. The full closure report distinguishes those gaps from the independently compared runnable corpus.
