# Rental JSON tokenizer — adversarial working-tree review

Verdict after the targeted repair: **GO for offline canonical request-encoder
development only**. Production Migration / Deployment remains **NO-GO**.

Reviewed the current uncommitted working-tree implementation, not a released commit.
HEAD is fffcc8d96dbe9be95e93b8c0d9eed3c2ea8acf42; these rental files are untracked
work in progress. Existing unrelated modifications were preserved. No database,
SQL, route, migration or Production operation was performed.

## Confirmed finding, severity and correction

**Medium — bounded-input CPU amplification, fixed.** In
`packages/domain/src/rentals/json-boundary.ts`, exactInteger's original trailing-zero
removal used the unanchored expression `/0+$/`. A long run of zeros followed by a
nonzero digit causes repeated failed suffix searches. The guard on integer length
was after this work, so the 32 KiB payload limit did not prevent it.

An isolated source-expression probe for runs of 4,000 / 8,000 / 16,000 / 32,000 zeros
recorded approximately 47 / 108 / 679 / 2,058 ms on this machine. The actual parser
stress fixture, containing maximum-size coefficients, recorded 1,727 ms before
repair and 6 ms after. These are local observations, not portable performance limits.

The only implementation change replaces that expression with a backward suffix
scan (current lines 24–28). Each suffix character is visited at most once. Decimal
normalization, accepted values, error codes and JSON representations are unchanged.
The new stress test asserts outcomes and limits, not a timing threshold; the source
analysis and before/after observation establish the performance correction. It is
not a CI latency guarantee or proof that all parser/BigInt work is linear.

No other correctness/security defect was confirmed in the documented text-input
and genuine-internal-result contracts. This is not an exhaustive verification of
all JavaScript engines or possible inputs.

## Independent checks

| Area | Evidence and outcome |
|---|---|
| Duplicate keys | Strings decoded before Set comparison at json-boundary.ts lines 77–80. Tested escaped ASCII aliases, surrogate pair versus literal astral character, case variants of lone-surrogate escapes, and identical values. No duplicate bypass found |
| Numeric exactness | Coefficient/decimal scale use bigint. Fractional or unsafe values stop before monetary Number conversion; the range check limits generated powers to a small scale. Tested safe-integer edges, near-integer fractions, exponent cancellation, negative zero and 8,000-digit exponents. Zero exponent normalization is intentional |
| JSON strings | Scanner finds the token boundary, then native JSON.parse validates that isolated string. Invalid escapes, truncated Unicode escapes, raw control characters and unterminated strings reject with fixed codes. JSON-allowed lone surrogates and U+2028/U+2029 decode but cannot become valid business identifiers; they are not falsely classified as malformed JSON |
| Depth | Nested object/array values reject at the opening character (line 61); no recursion occurs. Nested duplicate keys consequently reject as nesting-limit without traversal; duplicate-key diagnosis inside rejected containers is not promised |
| Size | Code-unit precheck plus UTF-8 encoded-length check at line 101. Tested exact byte boundary and one-byte overflow with astral characters, and maximum-size numeric coefficients |
| Grammar | Only space/tab/CR/LF whitespace, one complete root object and no trailing document. Tested primitive-prefix concatenations, malformed number endings, BOM, NUL and non-JSON whitespace |
| Properties | Null-prototype reader result (line 74), decoded-key Set, and create-input.ts lines 39–45 own-key allowlist prevent prototype-key bypass. Tested __proto__, constructor, prototype, toString, hasOwnProperty and toJSON; Object.prototype descriptors stayed unchanged |
| Errors | Boundary/parser messages and raw keys/values do not enter results. Domain codes/field names stay fixed. Synthetic private markers were absent from serialized failures |
| Output | Serializer at line 117 explicitly selects fields and converts all bigint values to decimal strings. Tested signed epoch boundaries, one-microsecond differences and existing 10^18 total round trip. No arbitrary-object replacer or global bigint hook |
| Composition | Existing timestamp/pricing/validator functions unchanged. No actor, agency, key, total, state or other unexpected field is accepted. No authorization or reference-existence inference |

## Complexity and limits

Let B be the accepted text size, bounded by 32,768 UTF-8 bytes. Character scanning,
suffix scanning and retained token/key/object storage are bounded by input size.
There is no recursive descent, and numeric power construction is capped by the
safe-integer digit check. Native decimal-to-bigint conversion of an exponent is
still implementation-dependent and may be superlinear; exponent text is bounded
by B. A null-prototype object, descriptor copy and Set retain O(B) content, with
engine object overhead. Encoding allocates at most a bounded multiple of the
code-unit cap before rejecting multibyte overflow.

The parser repeatedly slices suffixes for number matching. Conservatively, engines
that copy substring content can incur O(B^2) cumulative copying across many short
tokens, though live retained content stays bounded. A 2,000-key flat corpus was
tested (13 ms in the post-fix local run); this is not proof of a universal time
bound. No hard latency guarantee, exhaustive fuzzing, heap profiling or load test
is claimed. Future HTTP-level request limits/rate limits remain separate.

## Tests and mutation evidence

Added 59 adversarial cases in
`apps/web/src/rentals/json-boundary-adversarial.test.ts`. Existing 70 JSON boundary
tests and 128 other rental tests are retained. Coverage includes all topics above.
Temporarily disabling the duplicate-key guard caused all five selected new decoded
duplicate-key cases to fail. The guard was restored immediately; the temporary
mutation is not part of the final source. Filtered mutation runs naturally skip
unselected cases; no tests were disabled in the final suite.

Verification commands (offline only):

```text
npm run test --workspace=@contratpro/web -- src/rentals
npx --no-install tsc --project apps/web/tsconfig.json --noEmit --incremental false
npx --no-install eslint --config apps/web/eslint.config.mjs packages/domain/src/rentals/json-boundary.ts apps/web/src/rentals/json-boundary-adversarial.test.ts --max-warnings=0
git diff --check
```

Results: 257/257 rental tests passed; after a test-only tuple annotation correction,
the affected 59/59 adversarial cases passed again. TypeScript passed. Targeted lint
passed with the existing informational Next.js pages-directory notice; no lint
warnings/errors. Whitespace checks passed, including direct checks on the untracked
new files. The SQL draft retained SHA-256
3c27bc2a11de4d13a8003b35aa16d5d733eaeaa3be86557167a6fb2967214b79.

## Remaining limitations and encoder decision

These are declared boundaries, not newly confirmed tokenizer vulnerabilities:

- Input is text, not raw bytes. Fatal UTF-8 decoding, streaming byte limits,
  cancellation, content-type, CSRF and authentication belong to a future adapter.
- Serializer accepts genuine internal validation results, not arbitrary fabricated
  objects/proxies. It is not a general untrusted-object validator or output decoder.
- Mathematical decimal normalization and duplicate rejection differ from some
  PostgreSQL numeric/JSONB lexical behavior; extreme-zero exponents are intentionally
  accepted here. Never forward original numeric lexemes to SQL.
- The raw text cap is not pg_column_size, and strict application timestamps reject
  hour 24 / second 60. Numeric offsets do not validate Casablanca wall times.
- Normalized output strings are not RPC input. A future encoder must preserve
  bounded numeric money, exact UTC microseconds and deposit separation, and resolve
  UTC year 0/10000 formatting/reparse issues without silently changing the contract.
- Tenant isolation, restricted privileges, reference state, idempotency, concurrency
  and commits require separate implementations/evidence. No new guarantees inferred.

Proceed with a pure, database-free encoder and focused round-trip tests. Do not add
routes or RPC execution as part of that step. Production remains NO-GO.
