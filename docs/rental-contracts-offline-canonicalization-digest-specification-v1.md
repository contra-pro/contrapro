# Offline canonicalization and digest specification V1

Status: **PROPOSED — DESIGN ONLY**, 2026-11-21 UTC. Candidate names/rules below are not registered or approved runtime profiles. **Implementation, real signing and Production remain NO-GO. ADR-001 remains PROPOSED and unchanged.**

This document proposes a lossless encoding and digest-binding boundary; it does not compute hashes, implement a codec, add fixtures/tests, select a provider, capture evidence or enable Signed. “Must” below describes requirements **if this candidate is separately approved**, not currently deployed behavior. No legally authoritative representation is selected.

## Sources and current constraints

Read the [schema conformance inventory](rental-contracts-offline-signing-evidence-schema-conformance-v1.md), [evidence schema proposal](rental-contracts-signing-evidence-schema-v1.md), [architecture](rental-contracts-electronic-signature-architecture-v1.md) and [ADR-001](decisions/001-proposed-electronic-signature-evidence-boundary.md), together with `contract-settings.ts`, `inspection-presentation.ts`, `ContractDocument`, `ContractPagination`, `ContractPdfExport` and current print CSS. The [candidate vector matrix](rental-contracts-canonicalization-digest-candidate-vectors-v1.md) accompanies this proposal.

Current snapshots capture agency settings plus a V1/V2/V3 presentation document. Prices are TypeScript `bigint`; V3 marker coordinates are finite binary64 numbers in a 0–100 canvas, without integer quantization. Historical V1 may omit its optional version tag and retains combined driver/vehicle strings and a historical inspection shape. V2/V3 contain nullable structured driver/vehicle fields; V3 has separate departure/return inspections and five diagram views. Settings include exact conditions/footer, branding, inline PNG logo text, template and agency-settings revision. Demo flags and unsigned placeholders remain data and cannot be removed to create an operational document.

Existing version dispatch is not a complete authoritative lossless decoder for every historical field. A reviewed, bounded importer/validator is a prerequisite; current presentation readability alone must not authorize hashing arbitrary objects.

The current export calls `window.print()`, checks resource readiness and reports a print request, not a saved file. Pagination measurement is conservative, not a PDF byte/page-count attestation. CSS requests A4 with 10 mm margins and readable text; browser scale, headers/footers, backgrounds, fonts and environment affect output. None of these observations identifies the exact PDF the user saved. The current Arial/fallback stack also does not identify fixed font files. This milestone changes none of that behavior.

## 1. Binding-target comparison

| Target | Integrity and reproducibility | Verification and compatibility | Constraints / limitations |
| --- | --- | --- | --- |
| Immutable snapshot only | Deterministic candidate encoding can reproduce bytes from the same validated typed value; covers unrendered fields, full configured text and captured settings | Can preserve V1/untagged-V1/V2/V3 and exact bigint values; independent of browser PDF metadata | Does not prove what was displayed/printed, correct Arabic glyphs, layout, missing/clipped fields or representative/signer identity |
| Exact PDF bytes only | Detects changes to retained bytes, including metadata and incremental updates; no visual-equivalence normalization | Standard file retention/export is useful; verifier needs the exact artifact, not a re-render | Reprinting may differ byte-for-byte; font fallback, browser version and print options matter. Text extraction is lossy and is not a snapshot substitute. PDF alone does not establish source-data completeness or agency authority |
| Combined immutable binding manifest | Binds independently identified snapshot and PDF, context, revision, party/policy plan and rendering/assets; recommended technical candidate for review | Can reproduce snapshot encoding and verify retained artifact bytes separately; retains explicit schema/profile versions | Requires an authoritative package/renderer, content-completeness review and retained inputs. A manifest containing two digests does not prove the PDF accurately represents the snapshot or that either was approved/signed |

**Recommendation for review:** retain all three: snapshot-content digest, exact-PDF artifact digest and a combined binding-manifest digest. The manifest supplies context binding; neither content digest alone is a complete revision/tenant/signing decision. Whether snapshot, PDF, both or another representation has legal authority, and how discrepancies are handled legally, requires separate explicit review. This proposal only requires technical discrepancies to block acceptance.

## 2. Candidate canonical byte profile

Candidate profile identifier: `cp-c14n-typed-json-draft1`. This is a proposed internal lossless typed format, **not ordinary JSON serialization, JCS compliance, an accepted evidence-schema version or an operational projection**. Its explicit tags prevent bigint/string and number/string collisions without injecting reserved keys into user data.

### 2.1 Input boundary and schema dispatch

Canonicalize a detached, validated immutable value and explicit source-schema metadata. Never traverse a live agency repository, browser DOM or mutable settings reference. No defaulting, omitted-field filling, identity splitting, amount conversion, timestamp generation, text rewrite or fetching missing assets.

An approved schema registry must enumerate all included fields/types for each historical snapshot and any separately approved operational projection. Capture the complete `{demonstration, settings, document}` snapshot, including branding/logo text, exact conditions/footer, inspection arrays, placeholders, settings revision and historical fields. Do not choose a renderer-visible subset. Unknown fields, unsupported schemas, cycles, accessors, custom prototypes, non-enumerable/symbol properties, functions, dates/classes, sparse arrays or ambiguous input reject rather than disappear.

For example, retain `settings.logo` as its exact source string or null; do not decode/re-encode PNG/base64, normalize colors or remove whitespace from conditions to produce a friendlier snapshot hash. Any separately retained decoded logo asset and its relationship to the source representation require a reviewed asset-manifest rule.

Plain objects have only own enumerable data properties. Arrays have only dense index data properties plus their ordinary length; additional properties reject. A future raw-JSON importer must detect duplicate decoded member names **before** building a map/object, validate UTF-8 and reject ambiguous/over-precision input; ordinary last-key-wins parsing is insufficient. Such an importer is not specified or implemented here. An already rounded number cannot be reconstructed by hashing it.

### 2.2 Typed node mapping

The following are **literal data-format examples, not executable encoder code**. Every input value is represented by one tagged JSON array:

| Input type | Candidate node | Deterministic rule |
| --- | --- | --- |
| Null | `["null"]` | Distinct from absent and undefined |
| Boolean | `["boolean",true]` or `["boolean",false]` | Lowercase JSON literals |
| String | `["string","…"]` | Exact Unicode scalar sequence, encoded as below |
| Bigint | `["bigint","9007199254740993"]` | ASCII signed base-10 integer: `0` or optional `-` followed by a nonzero digit and further digits; no `+`, leading zeros, exponent or negative zero |
| Number | `["binary64","3ff0000000000000"]` | Exact finite IEEE-754 binary64 bit pattern as 16 lowercase hex digits in most-significant-byte-first order; example is numeric 1 |
| Array | `["array",[node,…]]` | Preserve every element and original order; never sort damage markers, parties or assets automatically |
| Object | `["object",[["key",node],…]]` | Sort original decoded keys as specified below; preserve each key once |
| Explicit undefined | `["undefined"]` | Preserves an own undefined value if the separately approved source schema permits it; never insert it for an absent key |

No native JSON numeric tokens are emitted by the node grammar; application numbers use their bit-string tag, bigints use their decimal-string tag. Array punctuation and boolean literals have the forms shown. The encoder must reject NaN and infinities, without emitting null or string replacements. Integer-valued schema fields still require their existing integer/range validation **before** encoding. Numeric `1` and lexical source `1.0` become the same Number value; bigint `1n`, Number `1` and string `"1"` remain distinct. Preserve negative zero as `8000000000000000`; positive zero is `0000000000000000`. Do not round coordinates to a decimal scale or convert bigint money through Number.

Binary64 is proposed because the existing inspection model permits arbitrary finite fractional coordinates. Alternatives—shortest decimal formatting or a future fixed-point coordinate schema—need explicit specification/vectors or a new reviewed projection; they must not silently change historical coordinates. JSON lexical spelling of numbers is not available in the current in-memory snapshots. Retaining original source-document bytes, where available, is a separate archive concern.

### 2.3 Ordering, serialization and encoding

Object keys are ordered lexicographically by their **Unicode scalar values**, compared as unsigned code points; at the first difference the lower scalar sorts first, and a strict prefix sorts before the longer key. Do not use locale collation, case folding, numeric-key enumeration or a language's default UTF-16 comparison. Do not normalize keys. Reject duplicate decoded keys. Array order is significant even when a reordering would look identical on paper.

Serialize the node grammar as compact JSON with no insignificant whitespace, no BOM and no final newline. Encode as UTF-8 only. JSON strings use:

- `\"` for a quotation mark and `\\` for a backslash.
- Lowercase six-character `\u00xx` escapes for every control U+0000 through U+001F; use this form rather than short `\n`, `\t`, etc.
- Literal Unicode scalars for all other characters, including non-ASCII, slash, U+2028 and U+2029; do not escape ASCII slash or HTML characters as a second serialization mode.
- No unpaired UTF-16 surrogate and no malformed UTF-8. Valid surrogate pairs represent one scalar; literal and escaped source spellings of the same decoded scalar produce the same node bytes.

This is an artifact serialization format, not HTML/script content. Embedding it into HTML would require a separate safe transport without changing the canonical bytes. A U+FEFF character **inside** a string is retained as data; a file-level BOM is not part of canonical output.

Distinguish canonicalizing a validated native value from accepting an already canonical byte representation. For the latter, a future strict inverse parser must validate tag names/arity/types, sorted unique object-key pairs, exact bigint/bit-string forms and source-schema eligibility, then reproduce precisely the same bytes. Non-canonical whitespace, alternate escapes, unordered pairs or trailing material reject as retained canonical input; do not silently normalize an alleged canonical artifact and compare a different byte stream.

### 2.4 Unicode, Arabic and French

**Propose no Unicode normalization at the hashing boundary.** Preserve original scalar sequences, case, whitespace, line endings, accents, Arabic combining marks/order, tatweel, presentation-form characters, bidi controls and ZWJ/ZWNJ. Do not transliterate, reshape, trim, fold diacritics, apply NFC/NFD/NFKC/NFKD or hash visual glyph outlines instead of text.

Thus precomposed `é` and `e` + U+0301 differ; Arabic U+0623 and U+0627 + U+0654 differ. This intentionally treats even some canonically equivalent or visually similar strings as distinct source content. It follows the architecture's no-silent-text-normalization constraint. Presentation shaping/RTL/font behavior belongs to the pinned renderer and retained PDF, not the canonical string encoder.

Input/UI policy may separately reject dangerous or unsupported text before finalization; canonicalization cannot repair it. If a future policy prefers normalized new data, it needs an approved new-input/projection policy that preserves original material and does not rewrite historical snapshots. Choosing normalization for the digest profile would change identity semantics and require separate approval and profile/version migration. No blanket statement that visually similar strings are semantically interchangeable is made.

### 2.5 Null, absence, historical tags and timestamps

Absent object fields produce no key entry. A present null produces its key and `["null"]`. A present undefined produces its key and `["undefined"]` only where a reviewed source schema allows it. These are three distinct encodings. Required fields may not use absence/undefined as a fallback. No JSON round-trip may drop undefined or coerce bigint before encoding.

V1 absent `schemaVersion`, explicit `schemaVersion: 1` and an own `schemaVersion: undefined` have distinct source shapes. Existing read dispatch can identify V1 without rewriting it; the manifest records resolved source schema plus tag presence. **Open choice:** whether an approved archive importer permits own-undefined V1 tags or rejects them for explicit review. The codec preserves the distinction if accepted; it must not quietly omit the property. No V1 identity/vehicle splitting, inspection upgrade or V2→V3 conversion is allowed.

Current rental start/end and licence/date descriptions are source strings. Preserve them exactly. Equal instants with different offsets, fractional precision or textual spelling remain different snapshot strings. Do not parse through `Date`, infer Casablanca offsets, assume a timezone, truncate precision, insert UTC or use the local clock during canonicalization.

A future operational projection may define stricter new timestamp fields (for example an explicitly validated UTC representation with fixed precision), but precision, offset handling, leap seconds and source-provenance rules require separate approval. Such a representation cannot replace original historical strings silently. Trusted capture time remains separately verified evidence; encoding any date does not make it trusted.

## 3. Candidate digest profile and exact byte boundaries

Candidate algorithm identifier: `sha-256`; candidate output encoding: `hex`, exactly 64 lowercase ASCII hex digits representing the 32-byte SHA-256 output, without `0x`, separators or newline. This follows the architecture's proposed SHA-256 baseline; **no algorithm/profile is approved or implemented by this document**. An implementation/library/version and independent known-answer validation must be reviewed before use. No external standards or provider systems were accessed for this offline design.

### 3.1 Domain-separated framing

Propose the following mathematical byte concatenation as the entire hash input:

`F(tag, payload) = ASCII("CONTRATPRO-DIGEST") || 0x00 || U32BE(tagByteLength) || UTF8(tag) || U64BE(payloadByteLength) || payload`

`D(tag, payload) = SHA-256(F(tag, payload))`

This defines a proposed preimage format, not a hashing implementation. `||` concatenates bytes. `U32BE` and `U64BE` are fixed-width unsigned big-endian integers. Lengths count bytes, not characters, code points or UTF-16 units. The terminator is exactly one NUL byte after the ASCII magic; no other separator/newline is inserted. The fixed tag is ASCII for this candidate, encoded identically by UTF-8. Length overflow or a declared/actual length discrepancy rejects. No fallback to an unframed digest.

Operational total byte/depth/node/collection limits and PDF parsing budgets must be approved before implementation, well below the abstract framing limits. Current field bounds are not a sufficient total-resource policy. Streaming future artifact hashing may reproduce this exact frame but may not omit the length or hash only a prefix.

| Candidate domain tag / `domainVersion` | Payload boundary |
| --- | --- |
| `cp.snapshot.typed-json.draft1` | Complete UTF-8 canonical-node bytes of the validated original snapshot, with no source metadata inserted into that snapshot |
| `cp.pdf.exact-bytes.draft1` | Entire retained PDF file from first to last byte, including metadata, xref/trailer, incremental sections and trailing bytes; zero stripping/recompression/reordering |
| `cp.binding-manifest.typed-json.draft1` | Complete canonical-node bytes of the immutable binding manifest specified below, excluding its own computed digest |
| `cp.render-assets.typed-json.draft1` | Complete canonical-node bytes of a separately specified frozen rendering asset manifest; schema/coverage approval remains a prerequisite |
| `cp.asset.exact-bytes.draft1` | Entire retained individual renderer/font/image/CSS asset bytes; type/path/version and relationships bind through the asset manifest |

The candidate digest descriptor uses existing field names: `algorithm: sha-256`, `encoding: hex`, `domainVersion: <exact tag above>`, `value: <64 lowercase hex digits>`. No actual digest value is supplied here. The tag is part of the preimage, not just an unauthenticated label. Changing a tag/profile is a different computation. The same payload under different domains has different framed input; a verifier must not interchange their descriptors.

These framed PDF/asset digests are **not** the ordinary unframed SHA-256 file checksum produced by a generic utility or necessarily supplied by a signature provider. If a future export also records a standard raw file checksum, label it separately under a reviewed schema; it cannot substitute for `baseArtifactDigest`. A provider's byte-range/signature hash may cover a different boundary and must be verified under its own approved signature profile. This proposal does not define PDF signature ByteRange processing.

### 3.2 Combined immutable binding manifest

Proposed manifest profile: `cp-binding-manifest-draft1`, distinct from evidence schema V1 and presentation schema V1/V2/V3. It needs its own reviewed exact field/type inventory before implementation. Required groups proposed for that review:

| Group | Bind explicitly |
| --- | --- |
| Profile and mode | Manifest profile, canonicalization profile, digest suite, synthetic vs separately approved operational mode; no promotion of demonstration data |
| Identity/revision | Agency ID, contract ID, immutable document-revision ID, aggregate revision **at finalization**, source-schema identity and original source-tag presence |
| Snapshot | Immutable snapshot reference and framed snapshot digest descriptor; entire captured settings remain inside the snapshot, not loaded from live configuration |
| Base PDF | Immutable artifact reference, framed base-artifact digest descriptor, exact byte length, media type `application/pdf`; declared metadata does not prove valid/safe content |
| Rendering | Renderer/build version, selected template identity/version for all five styles, CSS/diagram/assets manifest reference/digest, exact font/image asset identities, render environment/version, locale, timezone and explicit print-profile version/options |
| Parties/policies | Immutable party-plan reference/digest/order; approved signing/authentication/consent/verifier/use-case policy references and their integrity bindings as required by their separately approved schemas |
| Lineage | Explicit prior document-revision/package reference where present; null/absence rules specified by the reviewed manifest schema, never guessed |

All fields must have fixed types under the approved manifest schema. Revisions/lengths that are Numbers or bigints remain distinct under the codec; that choice must not vary by implementation. **Open choice:** require bigint for manifest byte lengths and fixed integer Number fields for bounded revisions, or another exact typed representation. Implementers may not choose ad hoc conversions. Asset/party/policy manifest schemas and their domain registry are not silently completed by this table.

The manifest must not include its own digest, future signatures, mutable verifier/audit outcomes, capture timestamps or the current changing aggregate/CAS revision. Including the frozen finalization revision does not make the manifest stale every time a pending/signing operation increments the aggregate. Live eligibility/CAS checks remain separate.

Content-only digests can remain the same when an identical snapshot or identical PDF is associated with a different document revision. The manifest includes the explicit context, so its preimage changes. Conversely, unchanged PDF bytes with a different declared renderer/assets version produce the same PDF-content input but a different manifest input. Do not claim a content hash alone prevents cross-agency/revision substitution.

No digest proves snapshot↔PDF equivalence. A separately reviewed freeze pipeline must render from the captured snapshot, verify complete FR/AR content, conditions, diagrams/markers, signature placeholders, footer, font shaping and pagination without clipping, then retain exact bytes and provenance. Long conditions may require multiple pages. A “fits A4” DOM measurement or successful browser print call is insufficient.

Template identity uses the existing saved identifiers `classic`, `luxury`, `modern`, `detailed` and `bilingual`, not translated display names or a default fallback. Changing the template or its rendering/assets version must remain visible in the snapshot/manifest binding even when the resulting pages look similar.

### 3.3 Freeze, artifact revisions and ordered signing

Freeze and retain the approved base PDF once; do not regenerate it during verification. PDF metadata/file identifiers/compression can change across renders without a visible change. A re-render is a new artifact and requires explicit package/render provenance rather than replacement under an old digest.

Future agency-first/customer-second signing normally produces new bytes. Keep the base manifest immutable, retain base/intermediate/final artifacts and bind exact input/output digest descriptors in separate append-only chain records. Never require the final signed bytes to equal the unsigned-file digest and never normalize away signature updates to make them match. Permitted PDF cryptographic updates and rejection of altered clauses need a separately approved verifier profile; hashing alone cannot decide this.

Any changed content, settings, party plan or rendered-document replacement must follow the architecture's new-revision/package and pending-intent supersession policy; old records remain historical. No automatic old→new digest overwrite or evidence reuse. A request attempt and its generation bind separately to the frozen manifest and current eligibility fence; a static manifest is not authorization to dispatch or sign.

## 4. Proposed verification contract

Future verification inputs must be explicit, immutable and independently scoped:

1. Expected agency/contract/document revision, active attempt/generation and current authorization/CAS context from the future authoritative boundary—not a callback's tenant claim.
2. Original typed snapshot or a strictly decoded retained canonical snapshot representation, complete source-schema metadata, and approved schema/canonicalization/digest profiles.
3. Retained complete PDF bytes and declared byte count, immutable manifest and retained rendering/assets manifests/bytes as required by the approved coverage policy.
4. Expected snapshot, artifact and manifest digest descriptors from a protected reference; current allowed-profile registry, plus ordered artifact-chain records when relevant.

Validate structure, scope, versions, unambiguous ownership and declared byte counts first; produce canonical bytes only under the exact approved profile, then compare computed descriptors to the protected expected descriptors. Compare complete digests and their algorithm/domain/encoding metadata. Do not retrieve a replacement file from an untrusted URL or consult live settings to repair a mismatch. A digest read from the same attacker-controlled package as its bytes is not an authenticated expected value.

Candidate outputs are separated: `unsupported-profile`, `invalid-input`, `binding-mismatch`, `digest-mismatch`, `ambiguous-input`, `unavailable-input`, or `integrity-match-unverified`. These are proposed future result categories, **not additions to the existing decoder/resolver error union**. No boolean “verified signature,” timestamp, consent or Signed result is produced by digest verification. Record which approved profile and targets were evaluated without inventing signing evidence.

Unknown algorithms/versions, malformed expected digests, duplicate keys, missing bytes, inconsistent owner/revision/rendering context or conflicting candidates fail closed. No best-effort normalization, fallback profile, first/last candidate selection, inferred success or automatic rewrite. A byte/hash mismatch preserves the supplied records for scoped discrepancy handling and blocks acceptance. The expected trust source, incident retention and authorization for discrepancy access remain implementation gates.

Cryptographic integrity does not establish authentication, agency representation, document review, explicit consent/intent, trustworthy capture time, signature validity or legal sufficiency. Even a successful future digest comparison satisfies only part of architecture predicate S; the current evidence trust assessment still denies and the offline lifecycle still rejects Signed.

## 5. Decisions requiring explicit approval

| Gate | Required decision/evidence | Current result |
| --- | --- | --- |
| C0 — authority/scope | Which representation(s) have legal/operational authority; discrepancy policy; separately approved operational projection | Unresolved; no authority selection |
| C1 — codec/profile | Approve or replace typed-node grammar, key ordering, escaping/UTF-8 rules, binary64/negative-zero policy and full source-schema inventories | Proposed, not approved |
| C2 — source preservation | No-normalization policy, historical absence/own-undefined policy, lossless import boundaries, timestamp precision/source policy and compatibility | Proposed; archive/import choices unresolved |
| C3 — digest/framing | Algorithm identifier, framing constants/lengths, domain registry, lowercase encoding, approved library and independent known-answer vectors | Proposed; no hashes computed here |
| C4 — manifest/assets | Exact fields/types, asset/party/policy coverage, byte-length type, render versions, template/font/locale/print options and self-reference exclusion | Incomplete pending schema review |
| C5 — artifact retention | Authoritative PDF capture/freeze, completeness checks, exact-byte retention, privacy/access/retention and signed-artifact chain verifier | Current manual print is insufficient |
| C6 — limits/fault handling | Concrete byte/depth/node limits, strict import/duplicate detection, ambiguity/mismatch behavior, protected expected values and recovery ownership | Unresolved operational limits/authority |
| C7 — conformance authorization | Reviewed candidate matrix promoted to exact byte/preimage/known-answer vectors, independent implementations and compatibility/security review; separately scoped offline implementation authorization | Not satisfied by this design |

The [candidate vectors](rental-contracts-canonicalization-digest-candidate-vectors-v1.md) are design inputs, not passing tests or known-answer evidence. No computed checksums or external calls were made. A later milestone must agree on exact full-package fixtures and independently checked expected digests before a codec/hashing implementation is considered ready.

## 6. Readiness and change scope

**GO for architecture review and candidate-vector specification only. NO-GO for canonicalization/hashing implementation now.** A separately authorized synthetic codec milestone first needs explicit approval of C1–C4/C6/C7 for its synthetic profile and a documented C0 scope excluding legal-authority claims. Operational use requires all gates, including the full authority/legal review. Passing offline conformance would not cross legal/activation gates.

Real signing, Signed activation and Production remain NO-GO. ADR-001 status is unchanged. Only this proposal and its companion candidate-vector document are added. No production/test code, existing snapshot, renderer, PDF action, print CSS, evidence contract/resolver or previous ADR/document was modified. Runtime tests/builds/PDF generation are not rerun or claimed for this documentation-only milestone.

Documentation review checked the typed-value grammar, byte framing, preservation/compatibility constraints, distinction between preimage changes and digest claims, and agreement with the 49 candidate matrix rows. Tracked `git diff --check` and explicit trailing-whitespace checks on both new documents reported no whitespace diagnostics. No hashing or network/provider operation was performed.
