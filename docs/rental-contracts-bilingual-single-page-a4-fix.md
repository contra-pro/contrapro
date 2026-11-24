# Bilingual FR/AR single-page A4 fix

**GO for offline PDF preparation using the verified standard synthetic fixtures. Production remains NO-GO.**

All five standard fixtures now print on exactly one A4 page. Bilingual changed from two pages to one. Long content remains complete and may require additional pages; its overflow warning remains active.

## Diagnosis before editing

Read the single-page V1 report, current document and pagination renderers, all contract CSS modules, existing single-page/inspection/legal tests and Chrome/PDF evidence. Inspected git status first. The existing untracked rental module and unrelated modified agency files were preserved. A fresh isolated Chrome run reproduced the baseline before any product edit.

CSS A4 is 210 × 297mm with 10mm margins: **190 × 277mm** printable area. Chrome measured the available height at **1046.921875px**. Bilingual content was **1168.234375px**, an excess of **121.3125px / 32.10mm**.

| Section | Before height (px) | After height (px) |
| --- | ---: | ---: |
| Agency header | 70.265625 | 70.265625 |
| Main contract title, excluding margins | 20.531250 | 20.531250 |
| Driver/vehicle/rental grid | 317.218750 | 266.812500 |
| Departure/return inspections | 305.015625 | 299.375000 |
| Configured conditions section | 35.953125 | 30.312500 |
| Signature section, including disclaimer | 245.953125 | 220.390625 |
| Legal footer, excluding outer margin | 113.828125 | 105.468750 |
| Whole document, including all text and spacing | **1168.234375** | **1042.468750** |

The watermark and contract-number lines each remained 14.65625px. Section heights exclude outer margins, so the table's component rows should not be summed as the whole-document height.

Root cause: **paired French/Arabic inline labels cause additional wrapping, amplified by repeated heading margins, grid gaps and signature/footer padding**. There were 37 wrapped measured paragraphs/headings/terms/captions before and 25 after. The longer secondary-driver missing-value labels were especially sensitive to column width. Both signature boxes were 198.21875px high before, with every identity/status/date/acceptance paragraph wrapping to two lines. Their reserved signature areas remain present with their existing 9mm minimum height.

The sheet font was already **10pt Arial, 1.1 line height** (13.3333px / 14.6667px). Every Arabic `bdi` retained computed `direction: rtl` and bidi isolation. No mandatory page breaks existed; signature boxes use `break-inside: avoid`, inspection headings avoid breaks after them, and diagram/fuel groups avoid internal breaks. Those rules were not changed. The overflow was not caused by a forced extra sheet or a fixed document height.

Pre-edit, temporary browser-only CSS experiments showed that removing decorative spacing recovered about 90px, while a wider second grid column saved another text line. No text, translations or font-size changes were needed.

## Exact files changed

Product/test changes:

- `apps/web/src/rentals/contract-studio.module.css`: six rules scoped exclusively to `.bilingual`.
- `apps/web/src/rentals/contract-legal.test.tsx`: three V1/V2/V3 bilingual content/RTL/snapshot regressions.

Deliverables created:

- This report, `docs/rental-contracts-bilingual-single-page-a4-fix.md`.
- Evidence under `docs/evidence/bilingual-a4-fix/`, with every artifact listed in [manifest.json](evidence/bilingual-a4-fix/manifest.json).

No renderer markup, snapshot/model data, translations, configured conditions, other template rules or pagination warning logic changed. No SQL, Supabase operation, database connection, migration, public API route, commit, push or deployment occurred. Existing historical reports and evidence remain unchanged.

## Bounded correction

The bilingual rules remove heading block margins and decorative heading padding, reduce direct-section margins, change the main grid to **46% / remaining width** with a 1mm column gap, reduce signature-box padding to .5mm and reserved-slot margins to .5mm, and remove footer top padding while matching its line-height to the document's existing 1.1. Mobile still uses the existing single-column reflow; the hidden A4 measurement copy uses the same corrected print layout.

The final content height is **1042.46875px**, recovering **125.765625px** and leaving **4.453125px / 1.18mm** of measured headroom. No font-size declaration, clipping, hidden content, fixed content height, scale transform, truncation, French/Arabic text or break rule was introduced or changed.

## Before/after actual A4 page counts

These are actual Chrome print-engine PDFs reopened independently with PyMuPDF, not estimates from DOM height. Settings: CSS A4 size, 10mm margins, print backgrounds enabled, browser headers/footers disabled.

| Template | Before | After |
| --- | ---: | ---: |
| Classic Professional | 1 | **1** |
| Luxury Premium | 1 | **1** |
| Modern Minimal | 1 | **1** |
| Auto Rental Detailed | 1 | **1** |
| Bilingual FR/AR | 2 | **1** |
| Bilingual, long-conditions stress fixture | 4 | **4** |

Standard fixture scope is unchanged: two supplied synthetic inspection stages, three damage markers, one missing secondary driver, no uploaded logo, existing short demonstration conditions/footer. Counts do not promise one page for arbitrary agency content.

## Verification results

- Targeted bilingual tests across contract document, legal, inspection and pagination files: **9 passed**, 89 unrelated tests skipped by the bilingual name filter. The three new tests preserve all original French leaf text, exact configured FR/AR conditions, both signature parties, one footer, Arabic `lang`/`dir` and V1/V2/V3 input equality after rendering.
- Full rental suite: `npm run test --workspace=@contratpro/web -- src/rentals` — **591 passed in 15 files**. Includes historical immutable snapshot and agency isolation coverage, inspection markers and overflow remeasurement.
- TypeScript: `npx --no-install tsc --project apps/web/tsconfig.json --noEmit --incremental false` — PASS.
- Targeted ESLint on the changed TSX test file, `--max-warnings=0` — PASS.
- `git diff --check` and explicit UTF-8/trailing-whitespace checks on the two changed files — PASS. Explicit checks cover these currently untracked rental files.
- Isolated Vite Studio preview build — PASS. Existing directive/static-dynamic import notices remain. Build output only under the temporary preview directory; no production build/deployment or database-backed run.
- Isolated Chrome at **320px and 1440px**, all five templates — PASS. Document scroll widths do not exceed viewport widths; no runtime exceptions or business Fetch/XHR requests. Existing preview WebSocket/favicon noise remains unrelated.
- All five standard PDFs reopened, rendered and visually inspected: Arabic glyph shaping and RTL runs preserved, no visible overlap/clipping, both signatures and full legal footer visible, five diagrams per supplied inspection stage and all damage markers visible. No replacement glyphs were extracted. Minimum extracted PDF text size is **10.0pt** for every standard and stress PDF.
- Before/after browser captures for Classic, Luxury, Modern and Detailed are **byte-for-byte identical** at 320px, 1440px and print media. Their measured heights also remain identical.
- Before/after bilingual text sequences and all **92 Arabic runs** match exactly, in order; all remain RTL. Standard conditions text matches before and after.
- Long-conditions fixture: all **5,940 characters** preserved in the DOM and all **180 lines** found in the four-page PDF. The preview reports **overflow / NEEDS REVISION**, and both signatures/footer remain visible after the conditions. No configured text is shortened to fit.

Machine evidence: [before browser measurements](evidence/bilingual-a4-fix/before/results.json), [after browser measurements](evidence/bilingual-a4-fix/after/results.json), [PDF page/font/content checks](evidence/bilingual-a4-fix/pdf-checks.json), [text and screenshot comparisons](evidence/bilingual-a4-fix/comparisons.json).

## Screenshots and decision

- [Bilingual before, A4 page 1](evidence/bilingual-a4-fix/before/bilingual-page-1.png) and [page 2](evidence/bilingual-a4-fix/before/bilingual-page-2.png).
- [Bilingual after, single A4 page](evidence/bilingual-a4-fix/after/bilingual-page-1.png).
- [Bilingual mobile](evidence/bilingual-a4-fix/after/bilingual-320.png) and [desktop](evidence/bilingual-a4-fix/after/bilingual-1440.png).
- Other reopened A4 page images: [Classic](evidence/bilingual-a4-fix/after/classic-page-1.png), [Luxury](evidence/bilingual-a4-fix/after/luxury-page-1.png), [Modern](evidence/bilingual-a4-fix/after/modern-page-1.png), [Detailed](evidence/bilingual-a4-fix/after/detailed-page-1.png).
- [Long-conditions overflow warning](evidence/bilingual-a4-fix/after/long-conditions-warning.png) and [final stress-PDF page with signatures/footer](evidence/bilingual-a4-fix/after/long-conditions-page-4.png).

**All acceptance criteria pass for the standard fixtures. GO for the next offline PDF preparation stage. Production remains NO-GO.** The bilingual standard has only about 1.18mm spare height, so longer fields, additional drivers/markers, logo variants, different fonts or printer settings must still pass preflight and actual pagination. No legal validity, real signing, consent, inspection evidence or production readiness is established.
