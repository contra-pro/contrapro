# Single-page A4 contract layout V1

Verdict: **NEEDS REVISION. NO-GO for PDF generation preparation across all five templates. Production remains NO-GO.**

The offline layout correction is implemented. Four templates print on one A4 page with the existing synthetic Studio fixture; Bilingual FR/AR prints on two. No conditions or fields were removed to obtain these results.

## Scope and inspected baseline

Read the reference-fidelity, presentation V2 and inspection V1 reports, the supplied reference image, document/inspection/legal renderers and styles, existing contract tests and preview harness. Inspected git status before editing. The experimental single-page patch was absent: conditions were divided into 1,800-character chunks, inspections forced separate sheets and the legal footer repeated.

The rental directories were already untracked and unrelated agency files already modified. No reset, clean, commit, push, deployment, SQL, database connection, Supabase operation, migration or public API change occurred. Existing agency changes were left intact. No business Fetch/XHR request occurred in browser verification.

## Exact product/test files changed in this session

All paths below are relative to the repository root.

- `apps/web/src/rentals/contract-document.tsx`
- `apps/web/src/rentals/contract-studio.module.css`
- `apps/web/src/rentals/vehicle-inspection.tsx`
- `apps/web/src/rentals/vehicle-inspection.module.css`
- `apps/web/src/rentals/vehicle-inspection.test.tsx`
- `apps/web/src/rentals/contract-legal.module.css`
- `apps/web/src/rentals/contract-document.test.tsx`
- `apps/web/src/rentals/contract-legal.test.tsx`
- `apps/web/src/rentals/contract-pagination.tsx` (new)
- `apps/web/src/rentals/contract-pagination.test.tsx` (new)

Also created this report and the artifacts enumerated in [the evidence manifest](evidence/single-page-a4-v1/manifest.json). `contract-legal.tsx`, agency settings, snapshot/domain/application models and the preview source were inspected but not changed.

## Layout strategy

One `data-contract-sheet` article contains the agency header/logo, contract title/number, both drivers, vehicle/rental/pricing fields, inline inspections, complete conditions, both unsigned signature placeholders and one structured legal footer. There are no character chunks or mandatory page breaks. V1/V2 keep their historical four-view, unscoped inspection representation without invented V3 data. V3 retains all five views for each supplied stage, fuel, mileage, full damage legends and notes.

A4 uses 10mm margins and a 190mm-wide document. Compact spacing and two-column groups replace separate pages. Classic rules, Luxury dark header, Modern brand rail/asymmetric grid, Detailed boxed grid and Bilingual paired labels/right-aligned header remain distinct. On mobile, fields, inspections, signatures and footer reflow. Text stays at 10pt or above in the verified PDFs. Diagram markers have larger numbers and additional SVG boundary padding.

`ContractPagination` measures an inert, temporary off-screen copy using the printed width and typography, against the 190 × 277mm printable area. It rechecks after edits, resize, fonts and image loads, and removes the copy immediately. Until measured it reports unverified; overflow shows an explicit **NEEDS REVISION** alert and never reports a single-page-ready document. A fitting measurement still requests confirmation in print preview. This does not implement or certify a PDF exporter.

Content has no fixed-height clipping, line clamp, ellipsis, font scaling or content-hiding rule. Overflow naturally continues onto later printed pages. Only Studio controls and the pagination UI are excluded from printing. Configured conditions/footer and all contract sections remain printable.

## Verification

- Rental suite: `npm run test --workspace=@contratpro/web -- src/rentals` — **588 passed, 15 files**.
- TypeScript: `npx --no-install tsc --project apps/web/tsconfig.json --noEmit --incremental false` — PASS.
- Targeted ESLint: the seven changed/new TSX source/test files, `--max-warnings=0` — PASS.
- Whitespace: `git diff --check` and explicit UTF-8/trailing-whitespace checks on all ten changed rental files — PASS. The explicit check matters because the rental directory is untracked.
- Isolated Vite Studio preview build — PASS, output under `C:/Users/lenovo/AppData/Local/Temp/contratpro-a4-v1/dist`. Notices concern browser-only `use client` directives and existing static/dynamic imports. No production build/deploy or database-backed application run was used.
- Chrome headless, isolated profile and loopback-only preview: all five templates at **320px and 1440px**. No horizontal overflow, runtime exception or business Fetch/XHR request. The preview still reports its existing blocked Vite WebSocket/favicon noise.
- Print-media DOM checks: ten SVG views for the two supplied inspections, one legal footer, no hidden document descendants, 190mm document width. Screenshots and print-media screenshots saved for every template.
- Actual Chrome `Page.printToPDF`: A4 CSS page size, print backgrounds enabled, browser headers/footers disabled. PDFs reopened and rendered with PyMuPDF 1.26.7 installed only in a temporary tooling directory. All five templates' actual page images were visually inspected, including both bilingual pages. Extracted PDF text spans have minimum font size **10.0pt**.

Tests cover one-sheet structure, all five templates, V1/V2/V3 immutable historical compatibility, separate and missing drivers, agency isolation, complete long conditions, signature/footer placement, all inspection views, boundary markers, fuel, invalid data and overflow status/remeasurement/cleanup. Existing branding/settings/snapshot regressions remain passing.

## Actual printed page counts

These counts apply to the existing synthetic Studio fixture: both inspection stages supplied, three total damage markers, no uploaded logo, one missing secondary driver, and the existing short demonstration conditions/footer. They are not a guarantee for arbitrary agency content.

| Template | Actual A4 pages | Result |
| --- | ---: | --- |
| Classic Professional | 1 | Fits tested fixture |
| Luxury Premium | 1 | Fits tested fixture |
| Modern Minimal | 1 | Fits tested fixture |
| Auto Rental Detailed | 1 | Fits tested fixture |
| Bilingual FR/AR | 2 | **NEEDS REVISION** |

Machine evidence: [page counts](evidence/single-page-a4-v1/page-counts.json), [PDF text/font checks](evidence/single-page-a4-v1/pdf-content-checks.json), [browser results](evidence/single-page-a4-v1/results.json).

The final stress fixture supplies 180 synthetic condition lines, **5,940 characters**. All 5,940 remain in the DOM, all **180 lines** are found in the printed PDF, overflow is explicitly reported and the result is **4 A4 pages**. No legal wording was invented or substituted into saved agency conditions. This stress fixture exists only in the browser test session.

## Screenshots and remaining limitations

Representative screenshots: [Classic desktop](evidence/single-page-a4-v1/classic-1440.png), [Bilingual mobile](evidence/single-page-a4-v1/bilingual-320.png), [Detailed A4 page](evidence/single-page-a4-v1/detailed-page-1.png), [Bilingual page 2](evidence/single-page-a4-v1/bilingual-page-2.png), [overflow warning](evidence/single-page-a4-v1/long-conditions-warning.png). Every template has desktop, mobile, print-media and actual rendered PDF page images in the evidence directory.

Bilingual's final disclaimer/legal footer flows to page two. It needs further layout work before the five-template single-page target is met. Longer approved conditions, long driver/company fields, many damage markers, both fully populated drivers and uploaded logo variants can also exceed one page. Those combinations are preserved but not all exhaustively printed. The measurement is a layout preflight, not a substitute for actual print pagination with chosen printer settings. No physical printer dialog was used; actual page counts come from Chrome's print engine and independently reopened PDFs.

No approved legal content, real signature, consent, inspection evidence, durable persistence, production authorization or legal validity is established. The emitted PDFs are local QA artifacts only. **Overall: NEEDS REVISION; PDF generation preparation NO-GO; Production NO-GO.**
