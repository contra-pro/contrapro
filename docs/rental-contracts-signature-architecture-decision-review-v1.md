# Signature architecture decision review V1

Status: **REVIEW ONLY — NO APPROVAL**, 2026-11-21 UTC. **ADR-001 remains PROPOSED and unchanged. Canonicalization/digest implementation, real signing, Signed activation and Production remain NO-GO.** This is an agent review of the available repository proposals, not an independent human/security/legal certification.

## Review outcome and evidence boundary

The proposal is ready for explicit architecture decisions, **not implementation authorization**. Its separation of integrity from identity/consent/signing is coherent. The current offline TypeScript boundary intentionally denies trust and cannot serve as an operational verifier. The main blockers are incomplete source/manifest schemas, an unresolved transitive digest-dependency graph, byte/profile choices without approved known-answer vectors, missing resource budgets, and absent operational identity/audit/time/provider authority.

One document is added: this review. No prior proposal, ADR, production/test code, snapshot, PDF pipeline or renderer is edited. No hashes, test files, signatures, events, signing timestamps or PDF artifacts are generated. No provider, network or database is contacted. Existing working-tree changes were inspected and are outside this review.

Reviewed sources:

- [ADR-001](decisions/001-proposed-electronic-signature-evidence-boundary.md) and [electronic-signature architecture](rental-contracts-electronic-signature-architecture-v1.md).
- [Evidence schema](rental-contracts-signing-evidence-schema-v1.md), [provider boundary](rental-contracts-signing-provider-boundary-v1.md) and [audit-event proposal](rental-contracts-future-audit-event-contract-v1.md).
- [Canonicalization/digest specification](rental-contracts-offline-canonicalization-digest-specification-v1.md) and its [49 candidate vector rows](rental-contracts-canonicalization-digest-candidate-vectors-v1.md).
- `packages/application/src/rentals/signing-evidence.ts`, `signing-evidence-resolution.ts`, snapshot/settings/inspection models, offline lifecycle and browser PDF action; the [schema conformance inventory](rental-contracts-offline-signing-evidence-schema-conformance-v1.md) supplies prior compatibility evidence.

No external legal/standards/provider material was revalidated: this task prohibits network access. Prior test counts and print evidence remain historical, not a fresh test/cryptographic certification.

## 1. Decision register

All entries are **OPEN / recommendation only**. Roles below are proposed decision participants, not assigned people or recorded approvals. Decisions group the unresolved requirements in the reviewed documents; they do not authorize implementation by appearing here.

Classification:

- **O** — blocks the affected offline component: changes byte identity, schema compatibility, isolation or safe resource handling. These are not implementer preferences.
- **S** — security-critical before operational signing/acceptance; can remain deferred for a strictly synthetic pure component that claims no such capability.
- **L** — owner/legal/privacy authority decision; no legal sufficiency is inferred by this review.
- **P** — implementation preference that can be delegated if approved bytes, interfaces and safety constraints remain identical.

“Closure” means an explicit versioned choice, rejected alternatives, exact scope, rationale, review evidence and identified approver recorded later. None is closed here.

### Offline format and binding decisions

| ID / class | Decision requiring closure | Recommended direction / rationale | Required closure evidence |
| --- | --- | --- | --- |
| DR-01 O/S | Exact next milestone scope and meaning of success | Synthetic in-memory codec/integrity results only; no lifecycle integration or operational trust | Owner/architect-approved scope and prohibited capabilities; no implied ADR acceptance |
| DR-02 L | Legally authoritative representation(s), conflict adjudication and contract use case | Leave legal authority unselected; technical discrepancies block acceptance | Owner with qualified legal/privacy review before operational use; offline scope explicitly excludes legal claims |
| DR-03 O | Snapshot-only, PDF-only or combined technical binding | Separate snapshot and exact-PDF digests plus a combined manifest; protects different targets without pretending equivalence | Approved target boundaries and supported claims; comparison below |
| DR-04 O/S | Exact archival snapshot schemas and separate operational projection | Full captured settings/document; preserve V1/untagged-V1/V2/V3; do not relabel demo data | Field/type/optional/null inventories and mode rules; independent operational projection approval later |
| DR-05 O | Schema/profile registry, identifiers, version negotiation and migration | Separate evidence, snapshot, codec, manifest, asset, party/policy and verifier versions; unknown profile rejects | Registry with immutable definitions, reader dispatch and explicit change policy |
| DR-06 O | Historical absent/null/own-undefined behavior | Preserve absence vs null; recommend rejecting own-undefined at the first snapshot-adapter boundary until an archive exception is explicitly approved | Owner selects archive policy and vectors; never drop undefined or modify a stored snapshot silently |
| DR-07 O/S | Agency/contract/reference canonicalization and identity namespace | Exact existing IDs in historical material; scoped agency+contract comparisons; no hashing-layer case folding | Explicit new-ID/import policy, nil/variant/case rules and mismatch tests; authenticated ownership remains separate |
| DR-08 O | Field-level Number/bigint types, ranges and decimal import | Keep bigint money exact and distinguish strings; specify types of every revision, length, coordinate and counter | Exact schemas and bounded numeric import rules; byte-length type chosen, not coerced ad hoc |
| DR-09 O | Binary64 vs decimal/fixed-point coordinate representation and negative zero | Prefer proposed finite binary64 bits for historical Numbers; preserve -0; no rounding of marker coordinates | Bit/endian examples, edge vectors and explicit Number validation; any fixed-point schema would be a separate projection |
| DR-10 O | Unicode normalization, original text and forbidden-text policy | Preserve source scalar sequences; no NFC/NFKC, shaping, trimming or diacritic removal during hashing | Approved no-normalization profile and separate pre-finalization input/display policy; FR/AR vectors |
| DR-11 O | Key ordering and array ordering | Proposed Unicode-scalar key comparison; preserve all array order | Exact comparator definition, supplementary/numeric-key/prefix cases; no locale/UTF-16 default substitution |
| DR-12 O | Typed grammar, UTF-8, escapes, inverse parser and canonical-byte admission | Prefer proposed tagged nodes, compact UTF-8, exact control escapes, no BOM/newline; strict re-encoding equality for alleged canonical bytes | Full grammar/arity/error rules, valid-scalar policy and cross-language byte vectors |
| DR-13 O/S | Historical date text vs new operational timestamp types | Keep rental/licence/date strings exact; do not normalize offsets/precision or infer time | Archive vectors; future UTC/precision/leap-second/source decisions under a separate time profile |
| DR-14 O | Native-value input vs raw/wire import; object ownership and duplicate keys | First implementation accepts only explicitly validated synthetic data; raw importer is separately gated | Approved accepted input domain, lossless bigint/Number transport and capture/detachment boundary; never ordinary last-key-wins parsing as a security boundary |
| DR-15 O | Complete bounded preflight validation of historical snapshots | Require a reviewed schema adapter before claiming snapshot compatibility; existing presentation dispatch is insufficient | All fields including rental amounts/dates, inspections/settings/version presence validated without conversion; corrupt input rejects |
| DR-16 O/S | Algorithm, implementation provenance and crypto-agility | Candidate `sha-256` and 32-byte output; use reviewed existing primitive later, no custom cryptographic algorithm | Algorithm/profile approval, pinned implementation/provenance, independent known-answer results and downgrade/retirement policy |
| DR-17 O | Exact framing magic, tags, terminator, lengths and domains | Proposed fixed magic + NUL + U32BE tag length + tag + U64BE payload length + full payload | Exact bytes/length semantics, overflow behavior, registry and frame vectors; no implicit raw-hash fallback |
| DR-18 O/S | Framed PDF digest vs ordinary file checksum vs signature/provider hashes | Keep them explicitly distinct if proposed framing is approved; do not rename a raw checksum as the framed artifact digest | Owner/architect/security select the boundary; record interoperability cost and any separately typed raw checksum |
| DR-19 O | Strict digest-profile validation vs existing permissive evidence descriptor syntax | Add a separately scoped future approved-profile check rather than silently tighten evidence V1 | Compatibility plan for algorithm/domain/encoding/length checks; actual payload incompatibility reviewed before any version change |
| DR-20 O | Exact manifest field names/types, source-tag metadata and byte lengths | Approve a complete immutable schema, including finalization revision and all render/context bindings | Exact optional/null rules, integer/length types, profile identity and full-manifest vectors; current group table is not sufficient |
| DR-21 O/S | Renderer/assets/font/template coverage and asset-manifest schema | Bind retained renderer/build, all five template IDs, CSS/diagram/font/image bytes, locale/timezone/print configuration | Exact asset inventory schema, roles/order/transform rules, font versions and retained-byte provenance; no live asset lookup |
| DR-22 O/S | Transitive digest graph and potential manifest↔party-plan cycles | Recommend acyclic core manifests/plans, followed by separate manifest-bound attachments | Complete dependency DAG and topological computation/verification order; exclude all direct/transitive self-reference explicitly |
| DR-23 O/S | Document revision vs settings revision vs finalization revision vs live CAS/attempt | Keep all concepts separate; immutable manifest includes frozen finalization revision only | Exact mapping to current evidence `aggregateRevision`, future eligibility and supersession; no “make all revisions equal” shortcut |
| DR-24 O/S | Party-plan exact schema, ordering, required signers and authority bindings | Retain proposed agency person first/customer second for the bounded plan; secondary-driver data alone adds no signer | Approved plan and digest boundary; substitutions/additional parties need explicit policy/schema review |
| DR-25 O | Total resource limits and fault budget | Concrete reject-before-work caps for bytes, depth, nodes, strings/digits, arrays, assets and PDF streams | Numeric limit table, units and cap−1/cap/cap+1 cases; framing maxima are not a safe application budget |
| DR-26 O/S | Digest-result vocabulary, deterministic error precedence and trust non-escalation | A separate integrity-only result, with unverified trust and false Signed eligibility; ambiguous/missing inputs reject | Exact return contract and separation from existing resolver statuses/error union; no success-to-Signed mapping |
| DR-27 O | Vector corpus, independent oracle and approval criteria | Promote the 49 rows into exact byte-level cases, expanded for missing boundaries | Approved corpus, independent provenance, discrepancies resolved without changing expectations to match implementation |

### Operational trust and external-operation decisions

These are blockers for real signing. They are not requirements to fabricate operational capabilities inside an offline codec.

| ID / class | Decision requiring closure | Recommended direction / rationale | Required closure evidence |
| --- | --- | --- | --- |
| DR-28 S | Trusted expected values, current agency/revision context and package authority | Protected authoritative references, distinct from attacker-supplied bytes/digests | Authenticated provenance/access model, tenant/subject/capability checks and stale-context rejection |
| DR-29 S/L | Customer/agency-person proofing and authentication assurance | Link/OTP/contact possession alone does not supply the missing identity/authority requirements | Approved proofing/authentication/recovery profiles and negative cases; no dashboard attestation shortcut |
| DR-30 S | Session limits, invitation TTL, reauthentication, challenge freshness and revocation | Review proposed 15m/8h agency, 10m/30m signer, 5m critical-action values; they are not approved defaults | Exact server-time/session/revocation/recovery policies, capture-vs-revocation race rules and unknown-order quarantine |
| DR-31 S/L | Owner/Staff/service capabilities and representative authority | Explicit capability and scoped membership checks; operator and actual signer are separate | Authorization matrix, mandate/authority history, platform-vs-agency separation and expiry/revocation evidence |
| DR-32 S/L | Consent/intent wording, purposes, challenges and affirmative action | Separate consent, signature intent and method capture, all package/party/attempt-bound | Approved FR/AR texts, purpose-specific one-use challenge and replay/withdrawal policies; legal/privacy review separately |
| DR-33 S/L | Signature method, direct/providerless option, trust material and key custody | No method inferred from current nullable provider metadata; all core evidence remains mandatory | Approved signature/verification profile, key/certificate/device custody and revocation/availability policy |
| DR-34 S/L | Trusted time, precision, authority, ordering and retained validation material | Bound independent trusted-time proof, not local/browser/PDF/provider JSON dates | Approved anchors/profile, time-source and precision semantics, verification/revalidation and unavailable-proof handling |
| DR-35 S | Internal verifier identity, decision authenticity/freshness and later compromise | Verifier cannot self-authorize lifecycle commits; append new dispositions and suspend reliance | Authenticated service decision format, complete checks, separation of duties and post-acceptance incident policy |
| DR-36 S/L | Provider selection/account/environment, callback authentication and retrieval | Provider-neutral boundary, pinned configured profiles/keys, raw-message authentication before deduplication | Capability/privacy/export assessment, key rotation/freshness/replay rules, size limits and allowlisted retrieval; no arbitrary callback URLs |
| DR-37 S | Idempotency, operation IDs, outbox/inbox, unknown outcomes and reconciliation | Preserve original scoped intent/key; no automatic ambiguous write retry; local fences outrank late stale observations | Consistent receipt/outbox/inbox design, fixed fingerprints/domains, causal ordering, cancellation/expiry/reconciliation policies and fault matrix |
| DR-38 S/L | Durable audit/state/evidence consistency, integrity anchors and recovery | Append-only scoped writer and consistent commit; independent anchor control; corrections by reference | Existing audit-envelope conformance, concurrency/recovery tests, access separation, retention/hold/disposal and key-loss policy |
| DR-39 S/L | Authoritative artifact freeze, PDF validation/completeness and signed update profile | Retain exact base/intermediate/final bytes; hash is not a content/safety validator | Controlled render/capture ownership, FR/AR/all-template content review, no clipping, allowed PDF updates and ByteRange/signature validation |
| DR-40 S/L | Personal-data handling, hosting/transfers, exports and retention | Minimum necessary protected evidence; no secrets/raw identity material in general logs | Approved legal/privacy schedules, hosting/access/key/export/disposal rules and incident responsibilities |
| DR-41 S/L | Activation governance, incident ownership and architecture decision authority | Explicit separate approvals; no proof-by-completed-offline-tests | Named accountable reviewers, all architecture G0–G6 gates, security/recovery drills and authorized release decision; not part of this task |

### Delegable implementation preferences

| ID / class | Preference | Boundary |
| --- | --- | --- |
| DR-42 P | Module/file placement, internal helper names and fixture directory layout | May be delegated; cannot change domain IDs, grammar, source fields or public compatibility |
| DR-43 P | Local test-runner organization and presentation of diagnostics | Existing toolchain is a reasonable default; fixed machine-readable outcomes/precedence and privacy constraints still need approval |
| DR-44 P/O | Buffering vs streaming and internal traversal strategy | Preference only if approved byte output, declared length validation, snapshot stability and numeric resource caps are identical; otherwise return to DR-14/25 |

An algorithm/library, normalization rule, missing-field default, field omission, frame delimiter, domain string, ordering rule or error-to-success mapping is **not** a harmless preference. Byte-affecting choices become compatibility/security decisions even when they look like formatting.

## 2. Binding alternatives and recommended technical direction

| Option | Benefits | Costs / missing guarantees | Review recommendation |
| --- | --- | --- | --- |
| Snapshot only | Covers exact source fields/settings, bigint and historical formats; reproducible independently of browser | No evidence of actual PDF bytes, layout, omitted labels/conditions, shaping or reviewed display | Suitable as one integrity component; not the sole complete signing package |
| PDF only | Identifies retained file bytes for export and later byte comparison | Re-renders can differ; extraction cannot reconstruct exact source semantics; source-data and agency/revision binding remain separate | Suitable as one artifact component; not a replacement for immutable source snapshot/context |
| Combined manifest + both content digests | Binds complementary targets, immutable revision, renderer/assets and plans without overwriting either representation | Needs exact schemas, safe acyclic digest graph, retained bytes and content-completeness validation; still no authentication/consent/legal conclusion | **Recommended for owner review**, not approved or legally authoritative |

The technical recommendation is to retain the original source snapshot, exact PDF and immutable manifest as separate objects. A future authoritative renderer must show that the PDF corresponds completely to the snapshot; matching independently self-supplied hashes cannot prove that correspondence. The current manual print action cannot supply that artifact-capture boundary.

Raw file checksum vs framed artifact digest is a real interoperability choice. The proposed `cp.pdf.exact-bytes.draft1` hashes a length-framed, domain-tagged input, so ordinary SHA-256(PDF bytes) and provider signature/ByteRange hashes are different computations. Approving the framed choice favors explicit domain separation but requires custom profile-aware verification/export metadata. Approving a raw file digest with context/domain protection in the manifest favors external checksum interoperability but would change the draft profile. **Neither choice is silently made here.** Separate descriptors are required if both are retained; never compare them as one value.

## 3. Canonicalization assessment

| Topic | Assessment and recommendation | Unresolved issue before implementation |
| --- | --- | --- |
| Typed tagged JSON | Reasonable lossless candidate for bigint/Number/string distinction and explicit undefined. Standard JSON alone cannot carry the current bigint snapshot directly | Complete grammar, exact source schemas, inverse-parser behavior and transport types; do not claim compliance with an external canonical-JSON standard |
| Object ordering | Scalar-value ordering is explicit and implementable; numeric-looking keys and supplementary scalars need vectors | Cross-language comparator, duplicate decoded keys, allowed key names and prefix behavior |
| Numbers | Binary64 bits preserve current finite fractional coordinates and negative zero; bigint decimal preserves prices without floating conversion | Exact field types/ranges; canonical bigint lexical form, full bit-level edges, type of manifest byte lengths and bounded digit count |
| Unicode/FR/AR | Preserve scalar sequences without normalization, shaping or diacritic loss; aligns with the architecture's historical-preservation requirement | Approve profile and separate dangerous-text/input/display policy; canonical equivalence and visual similarity intentionally do not imply hash equivalence |
| Serialization | Compact UTF-8, explicit escapes and no BOM/final newline can define one output | Strict byte/admission grammar including U+2028/U+2029, slash/HTML characters, invalid UTF-8/surrogates and alternate escapes; never embed directly as executable HTML |
| Null/absence/undefined | Preserve all accepted source distinctions; reject rather than silently drop unsupported own-undefined values | Own-undefined V1 archive policy; current TypeScript type and runtime reader differ, discussed below |
| Timestamps | Preserve rental/date source strings exactly. Timezone/precision normalization would rewrite historical data | Future operational instant grammar, source/precision/leap-second rules, original source retention; no local-clock fallback or signing-time inference |
| Versions | Codec/domain/manifest/source/evidence versions must be separate; no inference from a V1 label | Approved registry/migration/retirement rules; source V1 readability is not a full trusted importer |
| Domain framing | Proposed framing is unambiguous only when exact bytes, lengths, tag registry and limits are frozen | Independent frame vectors, byte-length type/overflow rules, framed-vs-raw decision and no fallback |
| Reproducibility | Same validated typed snapshot can have deterministic canonical bytes. Exact retained PDF bytes can be rechecked | Do not require a re-render to reproduce PDF bytes; renderer/version labels alone cannot attest provenance |

**Digest graph blocker:** the proposed binding manifest includes `partyPlanDigest`, while the evidence proposal's required-party binding includes `manifestDigest`. If the hashed party plan includes that root digest, this is a circular dependency. Excluding only the manifest's own digest does not solve transitive cycles. This is an unresolved schema ambiguity, not proof the current resolver has such a cycle—it computes no hashes.

Recommended resolution for review: an immutable **core party plan** excludes the root manifest digest; compute its digest before the manifest; a separate later attachment binds that plan/party instance to the computed manifest and attempt. Apply the same acyclic rule to asset/policy manifests and their references. Owners must approve exact schemas and a complete dependency graph; do not implement this recommendation as an undocumented exclusion. Command request fingerprints, audit chains and signature evidence also need their own separately scoped schemas/domains rather than reuse a snapshot domain by convenience.

## 4. Document ↔ TypeScript compatibility findings

These findings separate missing operational capability from an implementation defect. No current offline defect requiring code edits was established by this read-only review.

| ID | Source / current behavior | Conflict or gap | Required explicit decision |
| --- | --- | --- | --- |
| CF-01 | `SigningEvidenceDigest` accepts opaque algorithm/domain labels, hex or base64, short/uppercase hex; compares complete strings | Draft SHA-256/lowercase-64-hex/approved-domain rules are **stricter profile semantics**, not current V1 behavior | Add a separately approved profile-validation boundary later; do not silently tighten generic V1 or treat its syntax as cryptographic verification |
| CF-02 | Current evidence `baseArtifactDigest` is an opaque claim; proposed PDF domain is framed | Existing arbitrary fixtures/ordinary checksums have no guaranteed framed meaning | Freeze the meaning by profile and approved vectors; old synthetic values remain unverified rather than retroactively becoming real hashes |
| CF-03 | Evidence V1 strict objects have no full manifest, `byteLength`, source-tag-presence, asset inventory or canonicalization-profile fields | Proposal is not an implementable extension by simply inserting keys; decoder would reject unknown keys | Approve an independently versioned sidecar/package schema or explicit payload change. A new evidence version is not automatically necessary if V1 stays unchanged, and is not authorized here |
| CF-04 | `SigningEvidenceBinding.aggregateRevision` is checked against the supplied current binding and audit before/after claims; it is copied across fixture bindings | Draft immutable manifest must retain finalization revision while live aggregate revision changes | Separate fields and validated relationship. Do not replace live CAS with finalization revision or mutate the frozen manifest to satisfy current checks |
| CF-05 | Snapshot V1 type has `schemaVersion?: 1`; web TypeScript enables `exactOptionalPropertyTypes`; runtime version reader can dispatch a value of undefined | An own-undefined tag is not a permitted typed V1 write under that setting, although the reader does not distinguish it from absence | Explicit archive rejection or approved importer representation; codec may preserve only approved inputs. Do not widen writes or omit an existing property implicitly |
| CF-06 | Snapshot money is bigint, coordinates are finite Numbers; evidence fixtures carry only digest claims | Ordinary JSON fixture round-tripping of evidence descriptors does not validate full-snapshot bigint/negative-zero fidelity | Separate source-value/typed transport fixtures and strict adapters; never use the evidence JSON round-trip as canonicalization evidence |
| CF-07 | Presentation version dispatch validates selected historical shapes, with strict V3 inspection checks; it is not a complete snapshot validator | Draft expects full validated canonical input | Approve complete field coverage, bounds and legacy corruption handling without changing historical data |
| CF-08 | Typed references have manifest scope and per-party IDs; resolver checks supplied descriptor consistency, not raw content, identity or time | Matching labels cannot validate manifest/policy/party/evidence content or close predicate S | Typed retained raw-record schemas, authenticated resolution and independent verification remain separate gates |
| CF-09 | Resolver can return `resolved-unverified` for `verified`, `rejected`, `quarantined` or `invalidated` **claims**; trust assessment always denies | Future consumer could misread “resolved” as admissible evidence | Keep descriptor-resolution status separate from integrity and trust policy; add no promotion path through it |
| CF-10 | Proposed digest result codes differ from existing decoder/validator/resolver error unions | They are a proposed new interface, not aliases already available | Approve result/version/error precedence and compatibility adapter; no catch-all that converts rejection or unknown to success |
| CF-11 | Current inspection/settings integer zero cases exist; evidence aggregate revisions require positive safe integers | Generic normalization of all “revision/number” fields could reject valid settings revision 0 or conflate unrelated fields | Field-specific schema/range decisions, never one shared guessed constraint for every Number |
| CF-12 | `ContractPdfExport` calls print without retaining bytes; demo model/lifecycle have unsigned placeholders, `signingEvidence: null` and Signed rejection | Current renderer/export/simulation are not operational package creation or evidence acceptance | Separate artifact/projection/auth architecture. No flag removal, fabricated artifact identity or reuse of simulation evidence |

Additional direct constraint: the core party-plan/manifest schemas must resolve the DR-22 cycle before they are projected into any new typed record. The current `requiredParties` tuple does not itself contain a root-manifest digest, so the proposed acyclic core is feasible but not already approved.

## 5. Review of all 49 candidate rows

The matrix covers important distinctions, but it is **49 grouped scenario rows, not 49 complete independent known-answer tests**. It provides no computed digest corpus, complete framed preimages or retained PDF fixtures. Some rows combine multiple cases and different component responsibilities.

| Rows (49 total) | Assessment | What must be added before approval |
| --- | --- | --- |
| K01–K05 (5) | Good field-order, duplicate decoded keys, scalar ordering and array-order scenarios | Exact byte outputs; numeric-looking keys (`2`/`10`), empty/prefix keys where grammar permits, tag-looking user arrays/strings, nested objects; importer duplicate detection distinct from value encoding |
| U01–U11 (11) | Covers French/Arabic composition, combining order, presentation forms, joins/bidi, whitespace, escapes and scalar validity | Each example's explicit scalar list/UTF-8 bytes; separate invalid UTF-8 classes, lone surrogates, literal U+2028/U+2029, slash/HTML/control endpoints, embedded U+FEFF vs file BOM; distinguish codec preservation from input-policy rejection |
| V01–V05 (5) | Correctly distinguishes historical tags and unknown profile behavior | Owner choice for own undefined; exact complete V1 tagged/untagged/V2/V3 snapshots; forbidden undefined/null at required fields; sparse vs explicit undefined arrays; native-value fixtures that do not lose bigint |
| N01–N07 (7) | Covers bigint precision, type distinction, -0, fractional coordinates and invalid numbers | Binary64 subnormal/minimum/maximum finite, adjacent values/exponent boundaries, endian negatives; bigint sign/zero/digit caps, safe-integer edges and schema-specific 0/negative rules; no rounding-based oracle |
| T01–T03 (3) | Appropriate lossless source-string expectations | Empty/absent/null eligibility by actual schema; unsupported or ambiguous new timestamp profiles; preserve originals. Trusted-time validation cases belong to a later time-verifier corpus |
| R01–R05 (5) | Separates content, context, render version and live revision | Complete manifests/typed lengths, all five template IDs/assets and source-tag metadata; context/attempt/tenant tampering; transitive cycles and cross-profile substitution. Live-CAS tests are not static hash known answers |
| P01–P06 (6) | Correct exact-byte boundary and changed-byte/update concerns | Exact retained synthetic bytes and lengths; separate arbitrary byte hashing from safe/valid PDF assertions. P03 needs actual frozen artifacts later; P05 needs a permitted-update verifier; P06 cannot detect legal/content authorization from hashing alone |
| D01–D05 (5) | Useful domain/profile/mismatch/self-reference scenarios | Exact magic/NUL/tag/length bytes; missing/changed/truncated prefixes, wrong endianness/length/overflow, empty payload, unknown/non-ASCII tags, raw-vs-framed checksum mismatch, descriptor byte length/canonical hex and independent primitive/hash known answers |
| A01–A02 (2) | Essential ambiguity and no-trust-escalation scenarios | Candidate permutations and duplicate conflicts, protected-vs-self-supplied expected values, no actual Signed mutation. Source authenticity/consent/time/audit are dependency tests, not hash outputs |

**Responsibility split required:** expand rows into explicit codec, framing/digest, context-binding, parser/schema, artifact-content and trust-policy cases. For example, a valid shorter PDF is not automatically a syntax error; comparison with the protected full-artifact identity may be a digest/binding mismatch. The same buffer with a self-supplied matching digest is not an authenticated expected value. P05/P06/A02 must not be used to claim a digest implementation verifies signatures, permitted PDF updates or consent.

### Proposed vector approval process

1. Owner/architect approves the component scope and unresolved DR decisions that affect its outputs; security reviewer checks trust boundary/resource limits. Record accepted and rejected alternatives without changing ADR-001 automatically.
2. Publish a corpus manifest with stable case IDs, exact source schema/type, scalar lists for relevant text, complete input bytes/value transport, expected canonical bytes/length, exact framed preimage, expected descriptor **or fixed rejection**, component responsibility, required limits/profiles and rationale. No real personal data, trusted timestamps or signature evidence.
3. Resolve full manifest/party/assets digest graph first. Hand-check small scalar/length examples; use separately sourced primitive known-answer cases. For full vectors, use independently written encoders/frame assemblers or a genuinely separate reviewed reference method—not the implementation under test or a wrapper around its helpers. Two executions of the same code are not independent verification.
4. Later, only under separate authorization, independently recompute/compare complete byte/preimage/digest outputs with recorded tool/version provenance. Do not fabricate these outputs now. Two libraries using the same incorrectly assembled frame do not validate framing, so verify layers independently.
5. Investigate every discrepancy against the approved grammar/source schema. Never regenerate expected outputs from the implementation just to make tests pass. A specification change reopens its decision and vector approvals; retain previous corpus/version and compatibility notes.
6. Named owner/architect and independent reviewer record corpus disposition, exact reviewed revision, unresolved exceptions and scope. This review proposes those roles; it supplies no names, approval records or timestamps. Require zero unresolved discrepancies/waivers for byte-identity acceptance.
7. Freeze the approved corpus as read-only test inputs in a separately authorized implementation milestone. Keep current evidence V1/resolver regression expectations unless an explicit compatibility decision changes them. No approval is inferred from this document or passing historical suites.

The corpus may be approved in independently testable component subsets, **only if an explicit scope decision reconciles that subset with canonicalization gates C0–C7**. This is a proposed staging option, not permission to skip the existing draft's manifest/vector prerequisites.

## 6. Exact acceptance criteria for a future offline digest milestone

All criteria below are proposed acceptance requirements, not results achieved by this review. Concrete limits/schema choices must be filled in by approved decisions; implementers may not supply missing values silently.

| ID | Required observable acceptance |
| --- | --- |
| AC-01 Authorization/profile | Written scoped approval identifies source/codec/digest/domain/manifest versions, component boundaries, all applicable DR decisions and explicit prohibited capabilities. No inferred ADR acceptance |
| AC-02 Full source fidelity | Approved full synthetic V1 tagged/untagged/V2/V3 adapters preserve every included field, bigint, nullable/absent distinctions, original FR/AR text, arrays, flags/placeholders and settings; no historical writes/upgrades |
| AC-03 Exact bytes | Every approved valid vector yields exactly its expected canonical bytes and framed preimage, including lengths; different insertion order yields the same approved bytes, while meaningful changes retain distinctions |
| AC-04 Strict inverse/import | If an inverse/raw importer is in scope, duplicate keys, noncanonical tags/arity/order/escapes/BOM/trailing content, invalid UTF-8/surrogates and numeric precision loss reject under approved rules. Otherwise that importer is absent and not claimed as supported |
| AC-05 Exact cryptographic outputs | Approved primitive known answers and independent full-preimage vectors match every output byte. Candidate profile enforces its exact algorithm/domain/encoding/length, rejects unknown/downgraded alternatives and never substitutes raw for framed hashes |
| AC-06 Exact artifact boundary | Supplied byte buffers are hashed completely with declared/actual length validation; one-byte prefix/suffix/metadata changes cause the approved expected-input mismatch behavior. No re-render, PDF text extraction, truncation or normalization is used to repair identity |
| AC-07 Manifest graph and context | Complete approved acyclic graph, exact manifest types and exclusion rules verified; agency/contract/document/finalization/render/assets/party/policy substitutions fail binding checks. Live revision/attempt changes never silently rewrite a frozen manifest |
| AC-08 Fail-closed ambiguity | Every approved malformed/missing/duplicate/conflicting/stale/wrong-domain/cross-agency case yields its fixed rejection; candidate order never changes the outcome or selects a foreign fallback |
| AC-09 Bounds | Every configured byte/depth/node/string/digit/array/asset cap is tested at cap−1, cap and cap+1; arithmetic/frame overflow rejects without huge allocation or partially accepted output. Approved limits and test harness behavior are explicit |
| AC-10 Determinism/immutability | Repeated/permuted-object-key runs match; arrays keep approved order; frozen input mutation attempts fail; no retained mutable alias or use of live settings, local clock, random values, implicit locale/timezone/default profile |
| AC-11 No effects/trust | Pure offline component has no provider/network/storage/database dependency or injected effect callback; results remain integrity-only/unverified and cannot activate Signed. Even a matching digest with synthetic verified/provider-completed claims cannot produce signing evidence |
| AC-12 Compatibility/regression | Existing evidence syntax, generic digest claims, resolver statuses, lifecycle Signed rejection, historical snapshot reads and PDF/rendering behavior remain unchanged unless a separately approved interface change explicitly requires otherwise. Run focused vectors, full rental regression, TypeScript, targeted lint and whitespace checks in that implementation task |
| AC-13 Independent review/handoff | Exact files/profiles/corpus/limits reviewed; zero unexplained disagreements; report what was checked and what remains unsupported. No claim of verified identities, legal validity, durable audit or actual generated PDF completeness from digest tests |

For a component subset (for example encoder-only), owners must explicitly mark which ACs are satisfied by that component and which capabilities are **not implemented**; no overall package/digest GO follows from partial checks. Unapproved omissions are not acceptance waivers.

## 7. Dependencies beyond integrity

| Dependency | Why a codec/digest cannot close it | Required future evidence |
| --- | --- | --- |
| Authentication/agency authority | Caller-supplied agency, signer and expected hashes can all be consistently false | Current authenticated subjects/capabilities, representative authority, proofing, session/recovery/revocation and scoped protected package authority |
| Durable audit/commands | A hash and an in-memory immutable object do not supply consistent state/audit commits, idempotency or recovery | Existing audit-envelope implementation, append-only authorization/integrity anchors, atomicity/CAS/receipts, recovery and disposal dispositions |
| Trusted time | Encoding an instant, PDF date or receipt does not prove trusted capture time/order | Approved bound time proof, trusted anchors/precision, validated signature/time relationship and handling of unavailable or uncertain revocation/capture order |
| External/direct signature verification | Provider completion, authenticated delivery or matching file bytes are different from a valid person's signature/intent | Approved method/profile, identity/consent/intent/challenge binding, independently verified signature/certificate/revocation/material, ordered permitted artifact updates and authenticated verifier decision |
| Artifact provenance/content | Correct hashes can identify an incorrect/truncated/malicious PDF and a dishonest renderer claim | Approved exact-byte freeze, safe isolated content checks, complete FR/AR/template/font/diagram/footer/conditions verification and retained provenance |
| Legal/privacy and operational release | Technical integrity cannot select lawful method, authority or retention or adjudicate validity | Separate qualified review, use-case/data/hosting/retention decisions and all G0–G6 activation gates; no conclusions supplied here |

Future Signed acceptance still requires **all** architecture predicate-S conditions, not a new digest-match shortcut. Request creation, printing/downloading, file retention or a successfully resolved fixture collection cannot supply missing identity, consent, signature or audit evidence.

## 8. Blocking owner questions and decision capture

These are decision-package questions, not an interactive permission request or authorization to proceed. No answer is recorded or presumed.

| Question | Owner decision needed | Recommendation to consider |
| --- | --- | --- |
| Q1 — scope | Approve a synthetic-only component sequence or a different explicit scope? Who may approve technical profiles separately from ADR-001? | Keep operational authority/signing outside every offline step; name accountable roles before approval |
| Q2 — targets/authority | Approve combined technical binding? Which legal-authority question remains deferred and who owns it? | Retain all targets; no legal-authority claim from this technical decision |
| Q3 — codec | Approve the exact typed grammar, scalar ordering, no-normalization/escaping and finite binary64/-0 behavior, or choose a specified alternative? | Proposed lossless candidate is reasonable; require all byte/edge vectors first |
| Q4 — legacy input | Reject own-undefined V1 input for now or approve an explicit archival representation/import exception? Is raw import excluded or separately specified? | Reject ambiguous/unapproved inputs without rewriting archives; preserve current read behavior |
| Q5 — digest identity | Approve proposed SHA-256 framing and domains, or raw artifact checksums with manifest domain protection? Which identifiers and retirement rules apply? | Prefer clear separated profiles; record raw/framed/provider interoperability before selecting |
| Q6 — manifest graph | Approve exact types/byte lengths and acyclic core plan/assets/policy graph, including separate finalization/live revisions? | No implementation until schemas/DAG are complete; separate later manifest-bound attachments |
| Q7 — limits | What are the concrete numeric budgets for every input class and error/recovery policy? | Explicit scoped cap table with boundary tests; no implementer-guessed defaults |
| Q8 — compatibility | Sidecar/package records with unchanged evidence V1, or an explicitly approved incompatible schema change? What are result/error semantics? | Preserve V1 and use separately reviewed integrity interfaces unless demonstrated incompatibility requires otherwise |
| Q9 — vectors | Who independently approves exact bytes/preimages/digests, corpus versions and discrepancy resolution? | Named owner/architect plus independent reviewer; no self-generated oracle |
| Q10 — operational gates | Who owns proofing/auth, consent/party policy, time/verifier/provider selection, durable audit and privacy/legal decisions? | Defer implementation until each scope is separately approved; no defaults inherited from the proposal |

A later approval record should reference DR/Q/AC IDs, exact document/profile/corpus revisions, selected option, rejected alternatives, accepted scope/risks, accountable human reviewers and unresolved exclusions. This review creates **no populated approval record**, signature, consent, actor identity or trusted timestamp. Approval of an offline profile must explicitly say it does not accept ADR-001 or authorize real signing/production unless a separately authorized future process does so.

## 9. Minimal independently testable offline roadmap

Each step needs a separate task/authorization; no step is started here. No milestone may collect real signatures, access a provider/database, change lifecycle behavior or promote a synthetic result to trust.

| Step | Bounded output | Entry/exit gate |
| --- | --- | --- |
| M0 — decision closure, documentation | Resolve applicable DR decisions, schemas/DAG/limits and corpus approval process; explicitly reconcile staged scope with C0–C7 | Owner decisions captured; unresolved byte/security choices remain NO-GO |
| M1 — approved vectors, no runtime integration | Exact synthetic typed inputs/canonical bytes/frame bytes and independently checked known answers | Approved profile/schemas; zero unresolved oracle discrepancies; no code-under-test as its own oracle |
| M2 — pure codec | Encoder and, only if approved, inverse parser over approved synthetic inputs | AC byte/fidelity/strictness/bounds/determinism checks; no hashing, storage, snapshot mutation or evidence trust interface |
| M3 — pure framing/digest | Approved existing cryptographic primitive over explicit bounded byte buffers and framed inputs | Independent primitive/frame known answers; exact descriptors/errors; never Signed or a “verified signature” result |
| M4 — snapshot/manifest fixture binding | Approved full historical adapters and acyclic combined fixture packages with retained synthetic artifact bytes | All applicable ACs, source/tag/agency/revision/render/assets substitutions and graph rejection; no actual renderer/provider service |
| M5 — compatibility acceptance | Independently review outputs and existing decoder/resolver/lifecycle/PDF regression preservation | Full applicable AC set and concrete results; only scoped offline integrity readiness may be reported |

M1's independent vector work itself requires separate authorization; it is not a hashing exercise performed by this review. A later authoritative render/freeze or provider sandbox proposal is a new architecture milestone, not an implicit continuation of M5.

## 10. GO / NO-GO

| Scope | Assessment |
| --- | --- |
| Owner/architect/security review of this decision package | **GO** — recommendations/questions and acceptance requirements are documented |
| Canonicalization/digest implementation now | **NO-GO** — applicable DR-01/03–27 scope/target/byte/schema/graph/profile/limits/oracle decisions require explicit closure |
| Treating the 49 candidate rows as approved/passing digest vectors | **NO-GO** — no complete independently checked known-answer corpus |
| Authentication, durable evidence/audit, trusted time, provider/signature integration | **NO-GO** — operational security/legal dependencies remain unresolved and outside this task |
| Signed activation / real signing / Production | **NO-GO** — unchanged; no ADR acceptance, release or trust transition |

Review validation is documentation-only: source comparisons and traceability were read, the register was checked against the proposals/current contracts, and whitespace checks cover the new review document. No runtime suite/build/PDF generation or cryptographic verification is claimed. Existing test reports remain prior evidence. Exactly one new file is delivered: `docs/rental-contracts-signature-architecture-decision-review-v1.md`.
