# Final gap closure reference workspace

Finite synthetic verification only. No application digest engine, trust authority or signing capability. Owner approval is pending; ADR-001 remains PROPOSED.

From the repository root:

```powershell
node verification/offline-digest-final-gap-closure-v1/native-boundary.mjs
python -B verification/offline-digest-final-gap-closure-v1/prepare.py
python -B verification/offline-digest-final-gap-closure-v1/resource_probes.py
python -B verification/offline-digest-final-gap-closure-v1/test_final.py
node verification/offline-digest-final-gap-closure-v1/check-final.mjs
git diff --check
```

`preflight.mjs` was run once before work. It refuses to replace its protected baseline. Do not rerun earlier workspace writers: replay copies read its registry and fixtures without writing there. The original Node/Python canonicalization and framing blocks are checked unchanged. New gap helpers independently construct PNG screens, precedence outcomes and synthetic lineage frames. Native admission has two Node traversal implementations; Python checks the five admitted transported cases, not native JavaScript semantics directly.

The corpus contains 153 baseline and 53 new vectors. Resource probes are separate: 39 cap-neighbour component workloads plus three expected-context node-budget cases. Each child is contained in a Windows Job with a 384 MiB process-commit limit, Node 128 MiB old space and a 15-second timeout. Python independently reconstructs and compares complete successful witness streams, frame boundaries and digests; transient witnesses are removed. These are component workloads, not a production engine benchmark. Filled byte buffers are not valid PDFs or image files.

`resource-initial-report.json` retains two stdout-pipe timeout outcomes from the first run. Concurrent bounded pipe draining corrected the harness; limits and profile bytes were unchanged. `resource-report.json` is the completed 42-probe run.

PNG screening does not decode pixels or validate CRCs. Synthetic lineage establishes graph consistency, never historical authority. All integrity results remain unverified and cannot activate Signed. Node/Python are separate encoder/frame implementations but both use OpenSSL-family SHA-256 libraries; this is not human reviewer acceptance. Optional .NET remains UNVERIFIED due to the earlier local allowlist block; no bypass or retry was attempted.

See the [owner acceptance report](../../docs/rental-contracts-offline-digest-final-gap-closure-v1.md) for open decisions and entry gates. `final-check-report.json` records the exact workspace inventory and protected-file comparison. Its inventory excludes its own changing checksum.
