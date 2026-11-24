# Vehicle Inspection Presentation V1 — offline

Production Migration / Deployment remains **NO-GO**. This is presentation only: no inspection persistence, lifecycle mutation, signature, acknowledgment, upload, API, SQL or database integration.

## Model

`packages/application/src/rentals/inspection-presentation.ts` defines `VehicleInspections` with independent nullable `departure` and `return` slots. Each supplied inspection contains:

- Matching `stage: "departure" | "return"`.
- `provenance: "demonstration" | "recorded"`. Recorded means observations supplied as recorded, **not** verified origin, saved data, completion, consent or authenticated evidence. The entire document remains an offline demonstration.
- `fuelLevel: 0 | 1 | 2 | 3 | 4 | null`: explicit quarter-tank scale; 0 is empty, 4 is full, null is unknown.
- `mileageKm: number | null`: nonnegative safe integer, preserving exact integer kilometres. No mileage is inferred from a vehicle record or rental text.
- `notes: string | null`: optional content represented by null, bounded to 2,000 characters for presentation.
- Up to 50 damage markers per stage, each with unique bounded ID, `view: top | front | rear | left | right`, `category: scratch | dent | other`, and finite `x/y` percentages in [0,100]. Coordinates refer to the fixed diagram canvas, not photographs or mechanically precise body panels.

The runtime guard rejects wrong stage slots, unknown enums, malformed/extra fields, unsafe/fractional mileage, duplicate markers, out-of-bounds coordinates, getters and sparse/extended arrays. Validation errors are fixed messages without reflected input. These are presentation constraints, not new database/business limits.

Missing inspection slots show “Inspection non renseignée” independently. Missing fuel does not become zero; an empty marker list explicitly does not prove absence of damage. No completion or customer acknowledgment is fabricated.

## Diagrams and rendering

`vehicle-inspection.tsx` renders five named SVG views per supplied stage, including an overhead body/windows/wheels outline, distinct headlight/grille front and taillight rear outlines, and mirrored side profiles. They are original schematic illustrations, not copied reference photographs or evidence-grade vehicle-specific drawings.

Markers retain their recorded canvas coordinates, use numbered black-on-white symbols with a text legend, and remain visible at coordinate boundaries through five units of SVG padding. Categories and view names have French/Arabic labels. Fuel uses separate stage captions, a numeric fraction and monochrome filled/empty quarter cells, so printing does not depend on color/background fills. Notes are React-escaped text.

All five styles use the same inspection component and retain their existing contract layouts, agency settings and branding colors. V3 places departure and return on separate inspection sheets after the main contract sheet. Unsigned signature placeholders remain unchanged on the main sheet; their placement is not a signing or legal workflow. Settings, prices, contract numbers and RPC arguments are unchanged.

## Snapshot compatibility

- **V1** keeps original untagged/explicit-1 payloads, combined identity/make-model strings and old inspection data.
- **V2** keeps separate driver/vehicle fields and the original unscoped fuel/notes/four-view inspection structure.
- **V3** explicitly introduces the two-stage inspection structure. `ContractPresentation` now aliases `ContractPresentationV3`; new `snapshotDemoContract` calls accept V3 only and clone/deep-freeze the payload and settings.

`ReadableContractPresentation` and `DocumentSnapshot` include all three versions. `DocumentSnapshotV2` continues to reference the actual V2 type, never the changing current-write alias. Historical payloads are not converted, tagged, rewritten or mutated. Legacy inspection rendering explicitly states that stage/provenance are undetermined. No departure/return value is inferred from V1/V2 fuel or notes. Existing issued numbers remain supplied historical values, not newly assigned numbers.

V3 adds strict inspection validation to the existing driver/vehicle version guard. It does not turn that guard into a complete untrusted document/settings/signature decoder. The eventual real authenticated adapter and persistence boundary remain unimplemented.

## Preview

```powershell
npx --no-install vite --config apps/web/preview/rental-create/vite.config.mts
```

Open `http://127.0.0.1:4179/studio.html`. The **Inspection fictive** selector supplies injected synthetic fixtures: both departure and return, departure only, or neither. These selections do not record an inspection. Default examples show different departure/return fuel, mileage and markers with conspicuous fictional-data notices. Nothing from the real reference's personal details, registration, signature or stamp is reused.

The original image `docs/references/rental-contract-original.jpg` and the reference-fidelity review establish the functional five-view/fuel requirements, not real values or legal requirements. Exact diagram tracing or single-page reproduction is not claimed.

## Files

Created:

- `packages/application/src/rentals/inspection-presentation.ts`
- `apps/web/src/rentals/vehicle-inspection.tsx`
- `apps/web/src/rentals/vehicle-inspection.module.css`
- `apps/web/src/rentals/vehicle-inspection.test.tsx`
- This report.

Modified:

- `packages/application/src/rentals/contract-settings.ts`
- `apps/web/src/rentals/contract-document.tsx`
- `apps/web/src/rentals/contract-studio.module.css`
- `apps/web/preview/rental-create/studio-preview.tsx`
- `apps/web/src/rentals/contract-document.test.tsx`
- `apps/web/src/rentals/contract-settings.test.ts`

Existing historical review reports, SQL drafts, rental create/domain/RPC code and unrelated components remain unchanged.

## Verification

- `npm run test --workspace=@contratpro/web -- src/rentals`: **559 tests PASS, 13 files**.
- Targeted `src/rentals/vehicle-inspection.test.tsx`: **43 tests PASS**, rerun after strengthening frozen V2 snapshot and marker-copy assertions. Includes all five templates, all views, boundaries, categories, stage separation, every fuel value/unknown, missing data, invalid/forged values, recorded-versus-demonstration wording, bilingual text, escaped notes, V2 historical snapshot integrity, V3 deep freezing and agency mismatch. Existing V1 compatibility regressions remain passing.
- `npx --no-install tsc --project apps/web/tsconfig.json --noEmit --incremental false`: PASS after the final preview update.
- Targeted ESLint on all eight changed/new TS/TSX files with `--max-warnings=0`: PASS. Existing Next pages-location informational message remains.
- Isolated installed-Vite build of `studio.html`: PASS. Artifacts and reproducible build driver are under `C:/Users/lenovo/AppData/Local/Temp/contratpro-inspection-v1-1795175031077/` (`build.mjs`, `dist/`). Existing bundler notices concern the browser-only `use client` directive and static/dynamic imports; no new dependency or deployment.
- Chrome 158 via isolated loopback-only preview: all five templates at **320 and 1440px**, plus initial studio at 320/375/768/1024/1440. No horizontal overflow or runtime exceptions. Two fake creations reuse saved agency settings, and Agency B receives no fallback.
- Print-media check: departure stage content width approximately **718.1px / 190mm**, five visible diagrams, editor hidden, no horizontal overflow. A4 page size and 10mm margins are declared; the studio controls are hidden for print. Diagram groups avoid page splitting and use monochrome markers/fuel indicators. Print emulation is not proof of PDF pagination for every possible 50-marker/long-notes input or a certified export implementation.
- Latest screenshots and browser report: `C:/Users/lenovo/AppData/Local/Temp/contratpro-rental-browser-qa/run-1795175233526/`, including `v3-{classic,luxury,modern,detailed,bilingual}-{320,1440}.png`, `inspection-print-layout.png` and `results.json`. Earlier `run-1795175058021/` captures departure-only preview; its print and Detailed mobile screenshots were visually spot-reviewed. No Fetch/XHR business requests. Existing CSP-blocked Vite socket and favicon 404 remain preview-only console noise.
- Whitespace checks run on changed/new files and `git diff --check`. Guarded SQL SHA-256 remains `3c27bc2a11de4d13a8003b35aa16d5d733eaeaa3be86557167a6fb2967214b79`.

## Remaining gaps / next decision

No authoritative inspection recorder, actor/time evidence, photographs, vehicle-specific diagrams, customer acceptance, durable snapshots, signing, handover/return transition or availability rule was added. Rental mileage/allowance text still has its earlier semantics; it is not silently replaced with an inspection reading. Full bilingual content, structured legal footer, approved conditions and comprehensive PDF/long-content pagination remain separate work.

**GO for the next separately authorized offline correction**, preferably structured agency footer/approved acknowledgment placeholders without actual signing. Production Migration / Deployment remains **NO-GO**.
