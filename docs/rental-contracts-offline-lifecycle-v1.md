# Offline contract lifecycle V1

**Offline simulation implemented and verified. Future real signing integration: NO-GO. Production remains NO-GO.**

The offline Studio now creates a lifecycle draft as part of the existing simulated rental-creation flow. The documents view offers explicit, revision-checked actions for **Draft → Finalized → Signing pending**. No operation can produce **Signed**.

## Exact files changed

- `packages/application/src/rentals/contract-lifecycle.ts` — new isolated in-memory state machine, immutable records, agency/revision checks and future evidence requirements.
- `apps/web/src/rentals/contract-lifecycle.test.ts` — new application-state tests.
- `apps/web/src/rentals/contract-lifecycle-demo.tsx` — new lifecycle demonstration/editor and existing PDF integration.
- `apps/web/src/rentals/contract-lifecycle-demo.test.tsx` — new UI, print-isolation and compatibility tests.
- `apps/web/preview/rental-create/studio-preview.tsx` — creation captures a lifecycle draft instead of immediately treating the document as finalized; documents tab displays and updates lifecycle records.
- `apps/web/src/rentals/contract-studio.module.css` — lifecycle control layout and print exclusion. Contract/A4 typography and template styles remain unchanged.
- This report, `docs/rental-contracts-offline-lifecycle-v1.md`.

New browser/PDF artifacts are listed in [the evidence manifest](evidence/offline-lifecycle-v1/manifest.json). Earlier evidence remains unchanged.

Read the offline PDF report, presentation/snapshot models, Studio/export implementation, rental creation application service and historical compatibility tests. Inspected git status before editing. Existing unrelated agency changes and untracked work were preserved. No SQL, database connection, Supabase operation, migration, public API route, commit, push or deployment occurred.

## State machine

| State | Allowed operation | Result / invariants |
| --- | --- | --- |
| Draft | Save draft edits | New revision, same agency/rental and inherited settings; previous revision unchanged |
| Draft | Finalize simulation | Deep-frozen document/settings snapshot, separate simulation ID, production number still null |
| Finalized | Set signing pending | Intent only; exact same snapshot reference, no request sent |
| Signing pending | Read / print | Remains pending and unsigned; no further lifecycle transition available |
| Signed | Reserved vocabulary only | No offline record variant or successful transition; requests rejected as `signed-unavailable` |

All skipped, backward or repeated transitions are rejected. Writes require the current expected revision; stale or duplicate actions return `conflict` without retries. Finalized/pending edits return `immutable` with a current revision. A stale edit is rejected as a conflict before any mutation. Unknown states do not acquire an inferred meaning.

The creation application service and its receipt remain unchanged: the receipt still says `brouillon`, with no production number. The preview's injected local adapter now creates a lifecycle draft in a separate in-memory service. This is not a production rental-state transition or database write.

### Draft and finalization semantics

Drafts automatically inherit **saved agency settings at draft creation**. Their displayed settings revision is explicit. Later agency-setting changes do not silently replace the draft's reviewed configuration; a new draft inherits the new saved revision. Finalization captures exactly the draft document/settings shown for review.

Draft records are immutable values too: editing is an explicit service operation that returns a new revision, rather than mutating a shared object. The UI exposes three bounded demonstration fields: primary-driver name, pickup location and return location. All other existing contract fields remain readable in the preview. Unsaved input changes disable finalization until saved.

Finalization clones the reviewed draft content into a recursively frozen `DocumentSnapshot`, removes the editable draft slot and assigns `SIM-{agency UUID}-{rental UUID}` as a **simulation-only metadata identifier**. The contract's `number` remains null. The simulation identifier appears in the lifecycle UI, not as a production number on the contract. No finalization/signing timestamp is generated.

Agency/rental binding cannot be edited. Creation captures caller data/context before the asynchronous settings read; caller mutation during that read cannot substitute another document or agency. Concurrent duplicate creation is checked again after the read and never overwrites an existing entry.

### Pending and future evidence

`signingEvidence` is always null. Snapshot signature values remain exactly `customer: not-signed` and `agency: not-signed`. Signing pending preserves the finalized snapshot object and records only the state change representing intent. There is no signature adapter, email, provider call, consent record, signing timestamp or transmission.

The disabled Signed action and exported future-requirements list specify prerequisites, without implementing evidence acceptance:

- Verified signer identity and explicit consent bound to the exact document for each party.
- Document digest/version, signed-artifact integrity and a verifiable audit trail.
- Events and signing instants from an authenticated, verified source, never the local clock.
- An authenticated agency boundary, replay protection and explicit treatment of uncertain outcomes.

These are future engineering prerequisites, not a claim of legal sufficiency. Providing a string or locally fabricated object does not enable a Signed transition; there is no such accepting function in this phase.

## Isolation, compatibility and printing

The service requires an explicit simulation context and scopes create/get/list/edit/transition operations by agency. Both existing owner/staff simulation roles are accepted, consistent with the previous offline rental flow; this is not production authorization. Settings are loaded through the existing agency-bound loader. Missing settings, substituted agency settings and incompatible presentation data are rejected without fallback. The memory service exposes only frozen records and lists.

Current writes remain **V3 only** and require demonstration data, a null production number and exactly the two unsigned signature slots. Additional signing metadata, signed flags and historical-version writes are rejected. V1/V2/V3 snapshot/read types and renderers remain unchanged; supplied historical snapshots remain readable without conversion or inferred lifecycle history. The UI compatibility tests use explicitly constructed synthetic lifecycle envelopes for historical snapshots. No importer, history backfill or lifecycle assignment to arbitrary old snapshots was implemented.

Drafts show an editable simulation preview. Finalized/pending records use the existing **Imprimer / Enregistrer en PDF** component with the captured snapshot. That component has no lifecycle callback. Printing cannot finalize, request signatures, fabricate consent or mark a record Signed. Lifecycle controls are excluded from print using the same screen-control approach as the existing Studio. Contract content, all templates, A4 rules and the overflow warning are preserved.

## Verification

- New application tests: **12 passed**. Covers allowed/rejected/stale/repeated transitions, frozen finalization, immutable later states, agency isolation, absence of clock/network evidence, one-attempt repository failures, signing-metadata rejection, V3-only writes, caller/context mutation during settings loading and concurrent duplicate creation.
- New UI tests: **6 passed**. Covers state/action availability, disabled Signed, explicit dirty-draft save, disabled finalized fields, no cross-agency disclosure, V1/V2/V3 readability and printing in finalized/pending states without lifecycle mutation or network calls.
- Full rental suite: `npm run test --workspace=@contratpro/web -- src/rentals` — **627 passed, 18 files**. Existing immutable historical snapshots, agency settings, document and PDF regressions remain passing.
- TypeScript: `npx --no-install tsc --project apps/web/tsconfig.json --noEmit --incremental false` — PASS.
- Targeted ESLint: five new/changed TS/TSX files with the explicit existing `apps/web/eslint.config.mjs`, `--max-warnings=0` — PASS. Existing Next pages-directory informational notice remains. The first invocation without an explicit config did not resolve the workspace config; the explicit-config run passed.
- `git diff --check` and explicit UTF-8/trailing-whitespace checks on the six product/test files — PASS. Explicit checks cover currently untracked rental files.
- Isolated Vite Studio preview build — PASS. Existing browser-only directive/static-dynamic import notices remain; output stays in the temporary preview build directory. No production deployment/build or database-backed application run.

Both new test files were introduced and run before their corresponding implementation modules existed, then verified passing with the implementation.

## Browser and PDF evidence

An isolated Chrome run used the real Studio workflow for all five templates: save settings, simulate rental creation, select draft, finalize explicitly, print, then enter signing pending. The first draft was edited and explicitly saved before finalization.

- Draft screen: finalization enabled, pending/Signed disabled, no snapshot-PDF action; dirty edits block finalization.
- Finalized screen: fields and repeat-finalization disabled, pending enabled, Signed disabled; simulation identifier visible and production number unassigned.
- Pending screen: all transitions disabled, explicit “Aucune demande de signature envoyée,” unchanged unsigned snapshot.
- All five finalized views checked at **320px and 1440px** without horizontal overflow or runtime exceptions. Draft screenshots were captured at both widths.
- Printing in finalized and pending states preserved both sheet text and lifecycle state. Classic/Bilingual pending exports were also generated. Agency B exposed neither Agency A's sheet nor its action. Updating agency settings later left an earlier snapshot unchanged.
- No business Fetch/XHR requests occurred during the browser run. No retries, clock-based signing evidence or real signature request occurred.

Actual Chrome-generated PDFs reopened independently: **one A4 page for each of Classic, Luxury, Modern, Detailed and Bilingual**. Classic/Bilingual pending copies and the historical Classic re-export are also one page. Minimum text size remains **10pt**, both signature placeholders and legal footer are present, and there are no blank pages or text bounds outside the page. The long-conditions snapshot remains complete across **four A4 pages**, with all **180 lines / 5,940 characters** preserved and the preview's overflow warning active.

Evidence: [browser results](evidence/offline-lifecycle-v1/results.json), [PDF checks](evidence/offline-lifecycle-v1/pdf-checks.json), [draft desktop](evidence/offline-lifecycle-v1/draft-1440.png), [draft mobile](evidence/offline-lifecycle-v1/draft-320.png), [finalized view](evidence/offline-lifecycle-v1/classic-1440.png), [signing pending](evidence/offline-lifecycle-v1/classic-pending.png), [Bilingual pending](evidence/offline-lifecycle-v1/bilingual-pending.png), [Bilingual A4 page](evidence/offline-lifecycle-v1/bilingual-page-1.png).

## Limitations and decision

State and settings are local memory only and disappear on reload. Expected revisions protect this in-memory instance, not distributed transactions or production concurrency. The service accepts trusted offline presentation objects, not arbitrary untrusted document imports. This phase edits only three demonstration fields and cannot return a finalized record to draft.

Finalization here means a frozen simulation document, not legal execution. The UI state and simulation identifier are metadata outside the verified printed contract; printed signature placeholders continue to say unsigned and the production number remains unassigned. Browser printing remains manual, and the application cannot confirm a successful file save. Longer content can require more pages.

**GO for further offline lifecycle acceptance testing. NO-GO for enabling future real signing integration until the authenticated evidence boundary, verification, consent, replay/uncertainty handling and signed-artifact/audit requirements are implemented and separately verified. Production remains NO-GO.**
