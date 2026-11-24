# Offline contract PDF generation V1

**GO for further offline export acceptance testing. Production remains NO-GO.**

The offline Studio now offers **Imprimer / Enregistrer en PDF** for the selected immutable document snapshot. It reuses `ContractDocument` and the verified A4 browser print CSS. It does not silently download a PDF or claim that a file was saved.

## Files changed

- `apps/web/src/rentals/contract-pdf-export.tsx` — new snapshot-bound preview and browser print action.
- `apps/web/src/rentals/contract-pdf-export.test.tsx` — new export tests.
- `apps/web/preview/rental-create/studio-preview.tsx` — documents tab uses the new action, passes the selected snapshot and current agency, and groups document-selection UI into the existing print-hidden toolbar.
- `apps/web/src/rentals/contract-studio.module.css` — one new selector constrains the document selector on narrow screens. No contract/print-layout rule changed.
- This report, `docs/rental-contracts-offline-pdf-generation-v1.md`.

Evidence files created under `docs/evidence/offline-pdf-v1/` are enumerated in [manifest.json](evidence/offline-pdf-v1/manifest.json). Earlier reports/evidence remain unchanged.

Read the bilingual correction and original single-page reports, presentation/snapshot models, Studio preview, current print styles and earlier Chrome/PDF verification scripts. Inspected git status before editing. Unrelated agency edits and the existing untracked rental module were preserved. No SQL, database access, Supabase operation, migration, public API route, commit, push or deployment occurred.

## Export approach and use

1. In the offline Studio, save the selected agency's settings.
2. Create a simulated rental using the existing creation form. This captures saved settings in a frozen, in-memory snapshot.
3. Open **Documents simulés**, select the document, then choose **Imprimer / Enregistrer en PDF**.
4. In the browser dialog choose PDF, A4, 100% scale, backgrounds enabled, and browser headers/footers disabled. Inspect pagination before saving.

The action accepts only a snapshot and the selected agency ID, never a separate live-settings object. Both snapshot agency IDs must match the selected agency; settings and presentation version must pass their existing guards. Missing, incompatible, unsupported or non-demonstration snapshots expose neither printable content nor the action. Current settings changes cannot replace captured historical branding, template, conditions or footer.

There is no independent PDF renderer, canvas conversion, hidden iframe, backend, file upload, server call or PDF dependency in the product. The action synchronously calls `window.print()` for the currently rendered snapshot. Studio and export controls are hidden by the existing print toolbar rule; all document content remains in the same `ContractDocument` tree. The documents tab renders one selected snapshot at a time.

The action waits for loading fonts and missing/broken logos by reporting a retry message instead of printing incomplete content. Missing browser support and print exceptions produce fixed, truthful errors. A returned print call reports only **Demande d’impression transmise au navigateur. Aucun téléchargement confirmé.** Cancellation/no-op is never reported as a downloaded file. No signing, consent, numbering or snapshot mutation is triggered.

The pre-existing pagination warning remains visible in the screen preview. Long content can be printed on multiple pages; there is no clipping or shrinking to force one page.

## Tests and build

- New export tests: **18 tests**, including all five templates with V1/V2/V3 documents, exact preview/export sheet equivalence, saved snapshot independence from later live settings changes, selected/settings/document agency mismatches, missing snapshots, invalid settings/external logo URLs, unsupported versions, browser print/no-op/error/unavailable behavior, no false download-success message, no network, no mutation, full long FR/AR conditions, diagrams/markers/signatures/footer, font readiness and logo readiness/failure.
- Full rental suite: `npm run test --workspace=@contratpro/web -- src/rentals` — **609 passed, 16 files**.
- TypeScript: `npx --no-install tsc --project apps/web/tsconfig.json --noEmit --incremental false` — PASS.
- Targeted ESLint on the two new TSX files and changed preview entry, `--max-warnings=0` — PASS.
- `git diff --check` plus explicit UTF-8/trailing-whitespace checks on all four product/test files — PASS. Explicit checks include the untracked rental files.
- Isolated Vite Studio build — PASS, artifacts only under the existing temporary preview build directory. Notices concern browser-only `use client` directives and existing static/dynamic imports. No production build or deployment.

The new test file was run before implementation and failed because the export module did not yet exist. After implementation and additional guards/readiness cases, the complete suite passed. A fixture-only V1/V2 secondary-driver type error discovered by TypeScript was corrected, followed by passing TypeScript and full-suite runs.

## Chrome workflow verification

An isolated Chrome session exercised the actual offline Studio flow for each template: choose template, save settings, create a simulated rental, select its snapshot, invoke the print action, and generate the PDF with Chrome's print engine.

- All five export views checked at **320px and 1440px**: no horizontal overflow or runtime exceptions.
- Each print action preserved sheet text and requested printing exactly once. The browser boundary was instrumented in the headless interaction test; PDF bytes were then produced by real `Page.printToPDF`, not a product download helper.
- Printed DOM for every standard snapshot: **one sheet, ten SVG diagrams, three damage markers, two signature placeholders, one legal footer**, no hidden document descendants. Export controls were hidden.
- No business Fetch/XHR requests in the entire creation/export session; no export network service was used. Existing preview-only WebSocket/favicon noise is unrelated.
- Switching to Agency B exposed neither Agency A's sheet nor its print action.
- After saving different agency branding and conditions, printing the first snapshot retained exactly its original sheet text and original template. The regenerated historical Classic PDF remained one page.
- Conditions stress case: save **5,940 characters / 180 lines**, capture a new snapshot, select and print it. The preview reported **overflow / NEEDS REVISION**. All characters remained in the DOM and all 180 lines were extracted from the PDF.

Machine evidence: [browser workflow results](evidence/offline-pdf-v1/results.json) and [reopened PDF checks](evidence/offline-pdf-v1/pdf-checks.json).

## Actual generated PDFs

These standard snapshots use the existing synthetic drivers/vehicle/inspection example and rental dates/prices entered through the existing form. No uploaded logo is present in this standard fixture. Conditions/footer are the existing short demonstration values.

| Template / case | Actual A4 pages |
| --- | ---: |
| Classic Professional | **1** |
| Luxury Premium | **1** |
| Modern Minimal | **1** |
| Auto Rental Detailed | **1** |
| Bilingual FR/AR | **1** |
| Historical Classic after settings update | **1** |
| Bilingual long conditions | **4** |

Chrome's generated page dimensions are approximately **209.889 × 297.011mm** (A4 with normal PDF unit rounding). Every page was checked against A4 within 0.5mm. Minimum extracted text size is **10.0pt**. There are no unexpected blank pages, replacement glyphs or text bounds outside page boundaries.

All five PDFs were reopened in **Chrome's native PDF viewer** and visually inspected, in addition to independent PyMuPDF reopening/rendering. Arabic glyph shaping and RTL remain readable. Both signature placeholders, full conditions, agency legal footer, all inspection views and damage markers are visible without clipping or overlap. Long-content signatures and footer remain after the complete conditions.

Chrome PDF viewer screenshots: [Classic](evidence/offline-pdf-v1/chrome-pdf-viewer/classic.png), [Luxury](evidence/offline-pdf-v1/chrome-pdf-viewer/luxury.png), [Modern](evidence/offline-pdf-v1/chrome-pdf-viewer/modern.png), [Detailed](evidence/offline-pdf-v1/chrome-pdf-viewer/detailed.png), [Bilingual](evidence/offline-pdf-v1/chrome-pdf-viewer/bilingual.png).

Additional evidence: [export action on desktop](evidence/offline-pdf-v1/bilingual-1440.png), [mobile](evidence/offline-pdf-v1/bilingual-320.png), [Bilingual rendered A4 page](evidence/offline-pdf-v1/bilingual-page-1.png), [long-content warning](evidence/offline-pdf-v1/long-conditions-warning.png), [long-content final page](evidence/offline-pdf-v1/long-conditions-page-4.png).

## Known limitations and next milestone

This is **manual browser print-to-PDF**, not a silent file download. The user chooses destination, filename and print settings; the application cannot attest whether printing was cancelled or a file was saved. The interactive operating-system save dialog was not automated. Headless tests instrument print dispatch and validate actual Chrome PDF rendering independently.

One page is verified for these standard fixtures, not every possible condition/driver/agency/marker/logo combination. Bilingual retains approximately 1.18mm of headroom with the current standard content. User fonts, printer settings and longer data can alter pagination; the warning and actual print preview remain necessary. Uploaded logo readiness is covered by unit tests, not a complete browser matrix of image variants.

V1/V2 retain historical field/inspection semantics and are tested against their unchanged document renderer; new snapshots remain V3. The supplied snapshot is trusted, in-memory application data; the new component is not a general decoder for arbitrary imported documents. Agency checks are offline simulation guards, not production authentication. Memory snapshots disappear on reload. No durable PDF archive, cryptographic integrity, actual signatures, consent, verified inspections or legal validity was added.

**GO for the next offline milestone: manual export acceptance testing and any separately scoped offline refinements. Production remains NO-GO.**
