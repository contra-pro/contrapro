# Offline Contract Presentation V2

Production Migration / Deployment remains **NO-GO**. This implements only the authorized breaking presentation-model change and directly dependent offline callers. No SQL, RPC argument, pricing, schema, authentication, agency settings storage or lifecycle transition changed.

## Files changed

- `packages/application/src/rentals/contract-settings.ts`: explicit V1/V2 types, version/driver/vehicle shape dispatch, V2-only snapshot creation.
- `apps/web/src/rentals/contract-document.tsx`: version-aware shared renderer for all five styles, explicit V2 French/Arabic labels and missing-value placeholders, explicit V1 legacy representation.
- `apps/web/preview/rental-create/studio-preview.tsx`: synthetic V2 fixture and current write model. No photographed personal information used.
- `apps/web/src/rentals/contract-document.test.tsx`: V2 field, bilingual, V1 read/immutability/version and V2 snapshot regressions.
- `apps/web/src/rentals/contract-settings.test.ts`: existing snapshot fixtures updated to V2.
- This document. Earlier evidence/review reports remain unchanged historical records.

Caller inventory: `ContractDocument`, `ContractSettingsStudio` props, `snapshotDemoContract`, the Studio example/document list and the two test files. Studio settings props already use the current `ContractPresentation` type, so require no source edit. Historical document lists use the read union. Repository-wide TS/TSX search found no other presentation consumers.

## Current write model

`ContractPresentationV2` has mandatory `schemaVersion: 2`. `ContractPresentation` aliases V2 for current callers.

| Category | Fields |
| --- | --- |
| Driver | `fullName: string`, `cin: string|null`, `passportNumber: string|null`, `drivingLicenseNumber: string|null`, `city: string|null`, `nationality: string|null` |
| Retained driver information | `licenceDates: string|null`, `address: string|null` retain the earlier auxiliary display semantics; no date parsing or persistence claim |
| Vehicle | `make: string|null`, `model: string|null`, `registrationNumber: string|null`; retained `vin: string|null` |
| Driver association | Required `primaryDriver`; optional `secondaryDriver` expressed as `null` |

Nullable slots explicitly represent missing information. No fallback from CIN to passport, make to model, agency address to driver city, or one driver to the other exists. Empty/whitespace text is displayed as “Non renseigné”; no invented value is stored. Absent secondary drivers retain the six labeled empty fields. V2 cannot contain the legacy combined keys in its driver/vehicle shape.

Identity and vehicle facts remain presentation data only. Their simultaneous presence does not establish that both CIN/passport documents are stored by the existing client schema. A future real projection must use actual available records and leave absent facts null.

The two independent identity slots, make/model/registration and driver labels appear in Classic Professional, Luxury Premium, Modern Minimal, Auto Rental Detailed and Bilingual FR/AR. Bilingual labels use separate French text and Arabic `bdi` elements with `lang`/`dir`. No stylesheet or visual-style selection changed. Other document sections retain their previous partial bilingual behavior.

## Historical read compatibility

`ContractPresentationV1` retains the exact old fields (`name`, `identity`, `licence`, `licenceDates`, `address`; `registration`, `makeModel`, `vin`). Original untagged V1 documents remain valid; explicit `schemaVersion: 1` is also recognized. The old snapshot envelope remains unchanged.

`ReadableContractPresentation` and `DocumentSnapshot` are V1/V2 read unions. `contractPresentationVersion` checks the supported version and exact driver/vehicle key sets and value types. Unknown versions, mixed schemas and V2-tagged V1 data are rejected rather than guessed. This is a version/field-shape guard, **not** a new complete untrusted-document decoder for rental, inspection, settings or signature data.

V1 rendering shows an “Archive V1” notice and the original combined identity/make-model strings, visibly marked as unseparated. It does not add CIN/passport/city/nationality values, split strings, mutate the document, add a version property, rewrite snapshots or change saved settings. Original issued numbers are displayed as supplied; none are generated. The legacy representation is deliberately explicit rather than a claim of byte-identical historical page rendering.

`snapshotDemoContract` only accepts V2, checks the V2 shape at runtime, retains agency binding and unsigned/non-numbered creation rules, clones the data and recursively freezes the result. Returned type is `DocumentSnapshotV2`. Later caller mutation or agency setting changes cannot modify that in-memory snapshot. This does not implement durable historical storage, cryptographic integrity or actual finalization.

## Verification

- `npm run test --workspace=@contratpro/web -- src/rentals`: **516 tests PASS, 12 files**. The two directly affected test files contain 41 tests after this change. Coverage includes all five V2 renderers, separate values and nulls, secondary driver, bilingual labels, V1 rendering in all styles, untouched untagged V1 payloads, unsupported/mixed version rejection, preserved historical number, V2-only frozen snapshots and agency isolation. Fixtures are explicitly synthetic.
- `npx --no-install tsc --project apps/web/tsconfig.json --noEmit --incremental false`: PASS.
- Targeted ESLint on the five changed TS/TSX files with `--max-warnings=0`: PASS. The pre-existing Next pages-location informational message remains.
- Isolated Vite build of `studio.html`: PASS, output only under `C:/Users/lenovo/AppData/Local/Temp/contratpro-presentation-v2-1795174379941/dist`. Build driver: sibling `build.mjs`, invoking installed Vite with the existing isolated config and explicit Studio input. No deployment occurred. Bundler notices concern the existing `use client` directive in the browser-only preview and already static/dynamic imports; no source scope expansion was made to silence them.
- Chrome 158: all five styles checked at 320 and 1440px, plus initial Studio widths 320/375/768/1024/1440. No horizontal overflow or runtime exceptions. Screenshots spot-reviewed for Detailed/Bilingual desktop and Classic/Modern mobile. Two creations reuse the saved settings in one session; Agency B receives no fallback. No Fetch/XHR business requests. Existing blocked Vite WebSocket and favicon 404 remain preview-only console noise.
- Browser artifact directory: `C:/Users/lenovo/AppData/Local/Temp/contratpro-rental-browser-qa/run-1795174401673/`, including `v2-{classic,luxury,modern,detailed,bilingual}-{320,1440}.png` and `results.json`. This is not new Production evidence or a complete print/a11y certification.
- Whitespace checked on changed files and with `git diff --check`. The guarded SQL draft remains unchanged: SHA-256 `3c27bc2a11de4d13a8003b35aa16d5d733eaeaa3be86557167a6fb2967214b79`.

## Remaining fidelity gaps and next decision

Unchanged: missing overhead inspection view and distinct orientation drawings, no graphical fuel gauge, free-text mileage/allowance/duration, unsigned placeholder-only signature areas, incomplete approved conditions, unstructured legal footer, incomplete bilingual body and heuristic page splitting. None is solved by adding typed driver/vehicle fields.

**GO for proposing the next bounded offline correction**: the five-view inspection illustration and fuel presentation, with synthetic data only. Actual implementation requires its own decision; no inspection persistence or signing workflow is implied. Production remains **NO-GO**.
