# Canonicalization and digest candidate vectors V1

Status: **PROPOSED — DOCUMENTATION ONLY**, 2026-11-21 UTC. Companion to the [candidate specification](rental-contracts-offline-canonicalization-digest-specification-v1.md). ADR-001 remains PROPOSED. Implementation, real signing and Production remain NO-GO.

These are deterministic **candidate expectations**, not executable tests, generated artifacts, computed digests, signatures, consent receipts or trusted timestamps. All labels/text/date literals are synthetic. Scalar/object examples test the proposed codec grammar; they are not complete valid contract snapshots. A future approved schema validator may reject a grammar example at a contract field where that type is not permitted.

Use exact code-point/byte listings when promoting these to fixtures; visual text alone is insufficient, particularly for combining marks and bidi characters. No actual SHA-256 output is supplied or calculated in this milestone. “Same/different” below refers to specified canonical bytes or framed hash inputs; unequal preimages must be checked against approved digest vectors rather than treated as a mathematical collision-impossibility guarantee.

## Candidate matrix

| ID | Synthetic inputs / change | Proposed expectation and boundary |
| --- | --- | --- |
| K01 | Object `{"b":null,"a":true}` vs `{"a":true,"b":null}` | Same canonical node bytes; keys sorted by scalar values |
| K02 | Keys U+E000 and U+10000, in opposite insertion orders | Same canonical order: U+E000 first, U+10000 second; catches accidental UTF-16 sorting |
| K03 | Keys `a`, `aa`, `A` | Order `A`, `a`, `aa`; no locale/case/numeric sorting |
| K04 | Duplicate raw JSON keys `{"a":true,"\u0061":false}` | Strict future importer rejects before object construction; no last-key-wins candidate |
| K05 | Original marker array `[markerA,markerB]` vs `[markerB,markerA]` | Different canonical bytes even if rendering appears identical; no sorting by ID/view |
| U01 | French U+00E9 (`é`) vs U+0065 U+0301 (`e` + combining acute) | Different bytes under proposed no-normalization profile; NFC/NFD not silently applied |
| U02 | Source JSON `"\u00e9"` vs literal `"é"`, both strictly decoded to U+00E9 | Same string-node bytes; source escape spelling is not retained in the current value model |
| U03 | Arabic U+0623 vs U+0627 U+0654 | Different scalar sequences/bytes; no canonical composition at hash boundary |
| U04 | U+0628 U+064E U+0651 vs U+0628 U+0651 U+064E | Different bytes; mark-order normalization is not performed |
| U05 | U+0644 U+0627 vs presentation-form U+FEFB | Different bytes; no glyph shaping or compatibility normalization |
| U06 | Arabic base string with/without U+0640 tatweel, U+200D ZWJ or U+200C ZWNJ | Different bytes; preserve distinctions; separate input/display policy may reject before finalization |
| U07 | Text with/without bidi isolate U+2067/U+2069 or embedding controls | Different bytes; do not strip to force equality or confuse logical order with visual order |
| U08 | String containing LF vs CRLF, ordinary space vs NBSP U+00A0, trailing space vs none | Different bytes; exact conditions/footer retained |
| U09 | String containing quote, backslash, LF and tab | Quote/backslash escaped; LF is `\u000a`, tab is `\u0009`; no short-escape alternative |
| U10 | Valid scalar U+1F697, literal vs valid UTF-16 surrogate pair | Same decoded scalar and UTF-8 string bytes; unpaired high/low surrogate rejects |
| U11 | Invalid UTF-8, overlong encoding or a file-level BOM in a candidate canonical byte representation | Reject as canonical-byte input; no replacement-character repair or BOM stripping. BOM inside a source string remains data |
| V01 | Absent optional key vs present null vs permitted own undefined | Three distinct nodes/object shapes; schema eligibility of own-undefined historical tags remains an approval choice |
| V02 | V1 document with absent tag vs explicit `schemaVersion: 1` | Preserve distinct original snapshots and tag-presence metadata; same resolved read version does not imply same snapshot bytes |
| V03 | Untagged V1 combined identity/make-model vs manually split V2 fields | Distinct schema/content; no canonicalizer conversion or evidence reuse |
| V04 | Valid source snapshot labels 1, 2 and 3 under their approved schemas | Dispatch exact historical schema; preserve all fields; no reclassification as operational data |
| V05 | Unsupported source schema 4 or unapproved canonicalization/manifest/domain profile | Reject; no V3/previous-profile fallback and no mutation of evidence V1 |
| N01 | Bigint `9007199254740993n` vs bigint `9007199254740992n` | Distinct decimal-string nodes, preserving values beyond safe Number precision; synthetic codec inputs, not asserted valid rental prices |
| N02 | Bigint `1n`, Number `1`, string `"1"` | Three distinct typed nodes; no coercion |
| N03 | In-memory Number `1` produced from lexical `1`, `1.0` or `1e0` | Same binary64 node. Original lexical spelling is outside this value model; unsafe raw numeric import must be rejected separately |
| N04 | Positive Number zero vs negative Number zero | Distinct `0000000000000000` vs `8000000000000000` bit strings; no accidental JSON zero collapse |
| N05 | Valid fractional coordinate Number `12.5` vs `12.500000000000002` | Different binary64 values/bytes; no coordinate rounding/quantization |
| N06 | NaN, infinities, unsafe Number integer in a safe-integer revision field | Reject according to codec/schema; never replace with null or stringify invalid values |
| N07 | Proposed bigint lexical forms `01`, `+1`, `1e0`, `-0` in a future typed-byte importer | Reject non-canonical forms; canonical bigint zero is decimal `0` |
| T01 | Rental string `2026-01-01T00:00:00Z` vs `2026-01-01T01:00:00+01:00` | Different snapshot string bytes even if they denote the same instant; no timezone normalization |
| T02 | `2026-01-01T00:00:00Z` vs `2026-01-01T00:00:00.000Z` | Different bytes; no precision rewrite or generated trusted-time claim |
| T03 | Missing timestamp vs null vs explicit source text | Preserve only forms allowed by that source schema; do not fill “now” or infer a timezone |
| R01 | Same captured snapshot/PDF, different immutable document-revision ID | Same content preimages, different binding-manifest preimage; old evidence cannot bind replacement revision |
| R02 | Same snapshot, changed captured agency/settings revision or conditions/footer character | Different snapshot canonical bytes; new package/revision policy applies; never load live settings to reconcile |
| R03 | Same PDF bytes, changed renderer/template/font-assets/profile version in manifest | Same PDF content preimage, different manifest preimage; hash does not attest claimed rendering provenance |
| R04 | Same rental ID associated with a different agency context | Explicit binding/ownership mismatch rejects; neither content-only hash authorizes tenant fallback |
| R05 | Aggregate/CAS revision increments after finalization with no content change | Frozen finalization manifest remains unchanged; live CAS/attempt eligibility checked separately, not rewritten into the manifest |
| P01 | Retained PDF bytes `B` vs identical retained bytes `B` | Same complete framed artifact input; no re-render needed |
| P02 | `B` vs `B` with one metadata byte changed, one trailing LF appended, or file identifier changed | Different artifact bytes/framed input, even if pages look identical; no metadata/whitespace stripping |
| P03 | Same snapshot reprinted by a different browser/font setup | Byte identity not presumed. Retain as new artifact if changed; visual/content completeness requires separate checks |
| P04 | Full PDF vs prefix/subset of pages, or declared length differs from actual bytes | Reject incomplete/length-discrepant input; never hash just the visible first page |
| P05 | Base PDF vs legitimate future signature/time incremental update | Different artifact input; verify exact ordered base/intermediate/final chain under a separate approved signature profile, not equality to base |
| P06 | Provider PDF rewrites conditions or appends unapproved contract pages | Content/chain discrepancy blocks acceptance; a matching self-supplied digest does not make the rewrite permitted |
| D01 | Identical payload under snapshot vs PDF domain tags | Different framed preimages; wrong-domain descriptor cannot substitute |
| D02 | Same payload, altered canonicalization/domain version, algorithm identifier or digest encoding metadata | Unsupported profile or binding/digest mismatch; no algorithm guessing or profile fallback |
| D03 | Valid expected digest descriptor vs one changed hex digit, uppercase encoding, wrong length or wrong source | Valid-but-wrong digest is mismatch; malformed candidate descriptor rejects. New candidate requires lowercase 64-hex form; current evidence codec behavior is not changed |
| D04 | Fixed approved ASCII tag with a payload containing non-ASCII text | Frame lengths count actual bytes, including UTF-8 payload bytes, not scalars or JS string length; an unregistered/non-ASCII tag rejects under this candidate registry |
| D05 | Manifest contains its own digest or a mutable verification outcome | Reject under the proposed exact manifest schema; no circular computation or mutable digest repair |
| A01 | Two different records/files claiming the same ref/owner/revision with conflicting contents | Ambiguous input rejects; no first/last selection, no replacement under an existing reference |
| A02 | All snapshot/PDF/manifest comparisons match but no identity/consent/time/signature/audit evidence | At most future `integrity-match-unverified`; current Signed remains unavailable and technical/legal trust is not inferred |

## Small exact serialization candidates

These snippets specify candidate **UTF-8 output text with no final newline/BOM**, not hash outputs. Markdown/table formatting is not part of the proposed byte sequence. Future vectors must publish complete byte lengths/hex dumps to eliminate that display ambiguity.

| Source value | Candidate canonical text |
| --- | --- |
| Null | `["null"]` |
| Boolean true | `["boolean",true]` |
| String `1` | `["string","1"]` |
| Bigint one | `["bigint","1"]` |
| Number one | `["binary64","3ff0000000000000"]` |
| Negative Number zero | `["binary64","8000000000000000"]` |
| Empty object | `["object",[]]` |
| Empty array | `["array",[]]` |
| Object with `b = null`, `a = true` | `["object",[["a",["boolean",true]],["b",["null"]]]]` |
| Permitted own undefined at `a` | `["object",[["a",["undefined"]]]]` |
| LF string U+000A | `["string","\u000a"]` |

## Promotion to approved conformance vectors

Before implementation, reviewers must approve the profile and complete manifest/asset/source schemas. A later separately scoped milestone must publish deterministic full synthetic snapshots (including bigint, all historical tag forms, full FR/AR conditions and fractional marker values), retained synthetic PDF bytes and full manifests. Each approved vector needs exact input type/schema, original scalar sequence/bytes, canonical output byte length and hex/UTF-8 representation, exact domain-framed preimage, expected digest descriptor or fixed rejection, and independent verification provenance.

Do not use a new implementation's output as its own oracle. Mathematical/standards known-answer cases and independently produced cross-implementation vectors are prerequisites; no such results are fabricated here. If a profile choice changes, revise the proposed vectors explicitly before approval rather than make tests silently normalize historical data.

**GO for review/refinement of this candidate matrix only. NO-GO for declaring these passing vectors, implementing a codec/hash pipeline, real signing or production.**
