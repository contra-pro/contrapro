# B1 — Internal electronic signature completion

Owner decision, 2026-11-27: the selected initial MVP uses ContratPro's internal **simple electronic signature**. SAFY, DamaneSign and other external providers are optional deferred extensions. They are not mandatory implementation work for this selected scope. Higher-assurance sessions must never fall back to this mechanism. Existing provider interfaces and empty production provider registry remain unchanged and disabled.

This is a local implementation checkpoint, not legal approval or complete MVP production readiness.

## Existing implementation reused

The existing signing repository/gateway, immutable issued contract versions, private storage, agency signer selection/authority, FR/AR consent, eight-digit separate code, invitation lifecycle, PDF renderer, hash-chained evidence, durable finalization, A3 reminders/reconciliation, encrypted delivery jobs, revocable downloads, archive and same-row Sheets synchronization remain the foundation. No replacement module or external provider was introduced.

## Completed gaps

- Optional mouse/touch/stylus drawing accompanies the mandatory typed signer name. Typed-only signing remains a complete keyboard alternative. A localized notice explains that drawing is a visual representation, not independent identity proof or cryptographic signing. Changing drawing selection clears consent.
- Drawing is bounded normalized vector data: version `drawn-v1`, at most 20 strokes, 160 points per stroke and 1,000 total points, integer coordinates 0–1,000, actual movement required. No SVG markup, remote image, arbitrary data URL, pressure, IP or device collection is added. Oversized/malformed data is rejected rather than silently accepted.
- The canonical capture includes drawing and its exact notice. Existing capture-text SHA-256, immutable signing receipt/event and finalization bind the representation to the same authoritative event, signer, document version and consent. `method: typed` remains the historical mechanism: a typed-name signature with an optional visual drawing, not a new assurance category.
- PDF signature zones render the typed name and optional vector appearance. The final derivative appends an execution page containing rental/signing references, captured contract version, original hash, authoritative signing timestamps converted to UTC, agency-first sequence and representation types. Original contract pages, clauses, template and branding layout are not reflowed. Final bytes receive the existing SHA-256 and private immutable storage handling. Historical completed documents are not regenerated.
- New UI captures bind `executionRecordVersion: b1-v1` into their hash. Finalization uses this recorded version to select the appended execution page. Old pending captures without that marker retain the original renderer, so a previously staged final checksum remains reproducible. Their original evidence still supplies authoritative signing dates; no historical signature is rewritten merely to add a page.
- New draft 0028 validates capture and representation at the database command boundary, preserving the existing authorization, locking, receipts, RLS and transition implementation. No remote application.

## Complete workflow

1. Create/confirm a rental, select its authorized agency signer and issue the exact immutable PDF using existing document controls.
2. The selected authenticated agency signer with `contracts.sign` reviews the original hash, types their name, optionally draws, confirms identity/authority and consents. Owner status alone is insufficient.
3. Only after agency signing, generate a cryptographically derived invitation. Token/code are scoped to the request and session; only hashes are stored in invitation records. Replacement revokes the old invitation and verification.
4. Prepare email invitation or manual WhatsApp material through the existing delivery module. Code and link are separate artifacts/channels. Manual sharing is reported activity, never confirmed delivery. No real email/SMS was sent in this batch.
5. The client opens a fragment token held in page memory, receives generic information until verification, enters the separate code, then reviews the preserved agency-signed revision and its hash.
6. The client enters the captured matching name, optionally draws and explicitly consents. The database checks challenge, expiry, attempts, replay, document checksum, version and agency-first state atomically.
7. Durable finalization preserves both captures, verifies source/intermediate hashes and font identity, generates/stages/stores the final derivative, and completes against its checksum. Failed or uncertain completion retains recoverable state and reads before recording failure.
8. Existing archives, authorized agency access, client invitation access and expiring/revocable final delivery grants expose the final document. Evidence export stays agency-authorized. Existing delivery recovery/reminders and Sheets row identity/status sync are preserved.

## Evidence and security boundaries

Authoritative records include agency/rental/session identifiers, immutable artifact/version and checksum, actual canonical agency actor/membership, captured client identity, representation, versioned consent/text, verification method/result, server signing time, ordered transitions, invitation/delivery references, final checksum and audit history. JSON capture and hash-chain integrity are checked by existing evidence export; downloaded PDF bytes are checked against stored checksums.

Agency verification is the authenticated account plus current designated signer authority. Client verification is invitation plus separately delivered code and self-declared matching name. Neither drawing, name, token/code possession nor a document hash independently establishes legal identity. Hash chains are not absolute tamper-proofing or certified time. No certificate-based PDF signature, qualified/certified status, automatic handwritten equivalence or guaranteed Moroccan enforceability is claimed.

## Modified files

- `apps/web/src/signing/model.ts`, `representation.ts`, `drawing-pad.tsx`, `workspace.tsx`, `workspace.module.css`, `pdf.ts`, `service.ts`.
- Signing tests: `representation.test.ts`, `capture-interaction.test.tsx`, `service.test.ts`.
- `supabase/migration-drafts/20261127002800_internal_signature_representation.sql`.
- Database tests: `internal-signature.test.ts`, `contract-documents.test.ts`, `a1-workflows.test.ts`.
- `scripts/v41-integration/b1-verify.mjs`, this report, manual guide, MVP trackers, signing readiness/ADR and production readiness notes.

The worktree contains earlier implementation batches; its entire diff is not a B1 change list.

## Verification and limitations

Final source checks: web TypeScript, database TypeScript, zero-warning ESLint in both workspaces and isolated production build pass. The database suite passes **741 tests / 30 files**; operational suite passes **8 tests**. Whitespace checks pass. Owner `.next` hashes matched the pre-build snapshot and the review session manager reported stopped. B1 launched no temporary review server.

One parallel full-web run passed 2,000 tests but exceeded the existing 20-second limit in the exhaustive Unicode scalar test while SQL/build checks were competing for resources. The Unicode test and its timeout were not modified. A standalone full-web rerun is recorded below. Earlier new-code failures (JSX syntax, exact optional types and SQL CASE parsing) were corrected before these final checks; the new disposable database test uses the existing database-suite 120-second allowance for PGlite startup.

**Final standalone full web: 2,001 tests / 116 files passed in 66.52 seconds**, including the unchanged exhaustive Unicode test and the legacy finalization regression. No source change followed this run. The earlier focused signing/delivery suite passed 63 tests before the final additional legacy-renderer case; all those cases and the added case are included in the successful full run. Existing React title-child warnings occur in rendering fixtures; this is not browser-console acceptance.

Evidence logs are under `.verification/b1/`. Local tests exercise real disposable PGlite SQL, injected transports/storage and FR/AR components; they do not establish native multi-session PostgreSQL concurrency, managed Supabase/Storage behavior, real delivery, Arabic font licensing/layout acceptance, legal qualification or authenticated browser acceptance. Existing external-provider unit fixtures test future boundaries only and do not activate a provider.

Draft 0028 is guarded by an unconditional exception and ends in rollback. Disposable tests remove the guard only in memory. No credentials, real environment files, live provider, feature gate activation, migration application, installation, commit, push or deployment. Build uses the existing isolated private output directory to avoid owner review artifacts.

Remaining launch requirements: approved Moroccan legal qualification and contract/consent wording; privacy/retention policy covering drawn representations and evidence; reviewed migration rollout/native role and concurrency acceptance; authenticated whole-journey mobile/desktop FR/AR accessibility and document checks; managed storage/worker/restore and actual authorized delivery acceptance; all other retained MVP blockers. A6 remains open. See [manual acceptance](internal-signature-manual-acceptance.md).
