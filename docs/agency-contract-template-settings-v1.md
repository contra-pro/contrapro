# Agency Contract Settings V1 — offline demonstration

Production Migration / Deployment: **NO-GO**. No SQL, network adapter, public route, authentication integration, legal signing or durable persistence was added.

## Functional reference and field inventory

The referenced image was not available in the conversation or inspected attachments. This implementation uses the user's eleven enumerated requirements as its functional reference. Visual fidelity to the actual image is **NOT VERIFIED**; the image or its local path is still needed. No claim is made about exact original labels, dimensions or legal wording.

| Reference field/category | Existing application evidence | Offline presentation | Future work |
| --- | --- | --- | --- |
| Agency identity, logo, company/contact | `packages/application/src/agency-management.ts`: name, ICE, IF, RC, address, city, phone, email | Agency-scoped settings add template, logo, colors, conditions, footer | Authenticated agency-settings persistence, asset lifecycle |
| Contract identity/number | Rental create receipt; `tenancy.rental_contracts` and detail RPC in guarded SQL draft | Draft number absent; renderer can show an externally supplied number | Bind issued number to verified lifecycle; never generate one in UI |
| Primary and optional secondary driver | `packages/application/src/clients.ts`: names, nationality, identity type/number, licence number/issue/expiry, contact/address | Separate typed driver presentation, optional secondary driver | Rental-driver associations; any additional birth/identity issuance details need their own domain requirements |
| Vehicle identification | `packages/application/src/vehicles.ts`: registration, make/model, year, mileage | Separate vehicle presentation; explicit unsupported VIN placeholder | VIN/category and richer vehicle projection if required |
| Rental dates/duration/pricing | Existing timestamp, pricing, create-input and RPC encoder components | Actual validated canonical UTC start/end, exact bigint charges/deposit on fake creation | Named-zone document formatting and complete actual lifecycle integration |
| Pickup and return locations | Not part of existing rental-create RPC | Clearly fictitious presentation fields | Separate rental-detail domain extension |
| Mileage and daily allowance | Vehicle mileage exists; rental allowance does not | Fictitious counter/allowance | Handover/return readings and allowance domain |
| Condition diagrams and fuel | No inspection model | Four illustrative diagrams, injected damage marks, fuel enum and notes | Actual inspection records, photographs, damage history, evidence validation |
| Customer and agency signatures | No actual signing evidence | Unsigned areas only; `not-signed` literal types | Signer identity/consent, signing events, integrity and retention design |
| General conditions | No existing saved contract wording | Agency-owned reusable conditions | Approved French/Arabic legal content and versioning |
| Footer/legal information | Existing company fiscal/contact fields | Configurable agency footer | Legal review and final document layout |

None of these additional demonstration fields were added to the rental-create SQL/RPC payload.

## Contracts and separation

`packages/application/src/rentals/contract-settings.ts` defines:

- `ContractSettings`: exact agency ID, revision, template, bounded PNG logo, two hex colors, agency profile, conditions and footer.
- `ContractSettingsRepository`: injected async `get(agencyId)` and compare-revision `save(value, expectedRevision)`. No default repository.
- `SimulatedContext`: explicit simulation marker, agency and Owner/Staff role. The fake application boundary accepts edits only for the matching simulated Owner. This is **not authentication or actual authorization**.
- `ContractPresentation`: separate driver, vehicle, rental, inspection and unsigned-signature categories. Unsupported facts remain labeled demonstration data.
- `snapshotDemoContract`: reads the matching agency's saved settings, clones and recursively freezes both settings and presentation. Missing/foreign configuration fails closed. Demo snapshots refuse issued contract numbers and contain no actual finalization/signing event.

The in-memory repository is instance-local, clones reads/writes, increments revisions and rejects stale writes. No localStorage, cookies or remote storage. All settings and snapshots disappear on reload/restart. Agency IDs use canonical UUID text; no cross-agency fallback exists. Repository methods are not themselves an authentication boundary.

New agencies receive an **unsaved** Classic Professional configuration for their own injected company profile. An Owner must explicitly save it before fake rental creation is available. Existing rental creation retains only business fields; it contains no template/logo selection. The studio creates two or more drafts using the existing domain pipeline and automatically captures the current saved agency configuration.

Historical behavior is demonstrated through frozen in-memory snapshots. Actual lifecycle finalization must eventually capture settings and document data atomically with an authorized lifecycle transition, document version, integrity evidence and retention rules. This demo does not implement that transaction or claim persistence.

## Five templates

Classic uses a traditional two-column document. Luxury uses a dark brand header and centered title. Modern uses a brand rail and asymmetric sections. Auto Rental Detailed uses boxed form cells and inspection diagrams. Bilingual uses French/Arabic headings with explicit Arabic language/direction markup. **All five retain all essential sections**; conditions are on following sheets.

Arabic headings do not translate user-entered company information or conditions. Complete bilingual legal content remains future work. Illustrative views are not engineering-accurate vehicle outlines and cannot establish damage evidence.

Desktop sheets use A4 width/minimum height. Mobile reflows rather than shrinking unreadable text. Conditions are split into bounded text chunks, not a production print-pagination algorithm. PDF generation, long-content pagination, typography/font embedding and print certification remain unimplemented.

## Logo and input limits

PNG data URLs only, at most 200 KiB decoded and dimensions 1–2048 pixels. Signature, IHDR, chunk lengths, IDAT/IEND and animation marker screening reject external URLs, SVG, HTML and malformed envelopes. This is not a full PNG CRC/codec validation or security certification; a real asset pipeline needs decoding/re-encoding, metadata handling and storage controls. Colors are six-digit hex. Conditions are nonempty and at most 8,000 characters; footer at most 500. Agency profile uses the existing validator. Errors are fixed messages without supplied values.

## Preview

From the repository root:

```powershell
npx --no-install vite --config apps/web/preview/rental-create/vite.config.mts
```

Open `http://127.0.0.1:4179/studio.html`.

1. Select Agency A / simulated Owner. Choose one of five templates and configure branding/company/conditions. Save once.
2. Open **Créer une location**. Complete the existing rental form. Its pricing and canonical timestamps use the existing validated pipeline.
3. Submit, then choose **Nouveau brouillon de démonstration**, and submit another rental. Both automatically inherit saved settings.
4. Open **Documents simulés**. Change settings, save and create another draft: earlier document snapshots retain their settings revision.
5. Switch to B: no A branding/settings/documents appear. Creation is blocked until B is configured. Switch to Staff: settings are read-only, saved settings can still be reused.

The related read-only rental detail preview is at `/details.html`; its exact SQL-derived projection and limitations are documented in `rental-contracts-offline-details.md`.

## Verification

- `npm run test --workspace=@contratpro/web -- src/rentals`: **502 tests PASS**, 12 files. Includes 18 settings tests, 9 document/studio tests and 45 new detail tests, plus existing rental tests.
- `npx --no-install tsc --project apps/web/tsconfig.json --noEmit --incremental false`: PASS.
- Targeted ESLint on all new TS/TSX files: PASS, zero warnings. Existing Next pages-location informational message remains. Inline image rule is explicitly disabled only for the offline document renderer's bounded PNG, without a Next image server.
- Chrome 158 via isolated headless CDP: studio widths 320, 375, 768, 1024, 1440; details 320/1440. No horizontal overflow, controls labeled, zero runtime exceptions. Saved settings and two successive creations verified in the same running session; B has no fallback. Desktop and mobile screenshots visually inspected. No Fetch/XHR business requests; only local preview assets. No DB/API client exists in this slice.
- Screenshots and full browser results: `C:/Users/lenovo/AppData/Local/Temp/contratpro-rental-browser-qa/run-1795168729200/` (`template-classic.png`, `template-luxury.png`, `template-modern.png`, `template-detailed.png`, `template-bilingual.png`, `studio-320.png`, `saved-document.png`, `details-320.png`, `results.json`).
- Existing preview-only console noise: CSP rejects Vite development WebSocket, favicon 404. These do not open business/network integrations. This is not a complete assistive-technology or accessibility certification.

## Exact new files for this slice

- `packages/application/src/rentals/contract-settings.ts`
- `packages/application/src/rentals/contract-settings-memory.ts`
- `apps/web/src/rentals/contract-settings-studio.tsx`
- `apps/web/src/rentals/contract-document.tsx`
- `apps/web/src/rentals/contract-studio.module.css`
- `apps/web/src/rentals/contract-settings.test.ts`
- `apps/web/src/rentals/contract-document.test.tsx`
- `apps/web/preview/rental-create/studio.html`
- `apps/web/preview/rental-create/studio-preview.tsx`
- This report.

The immediately preceding rental-details work was also completed/verified in this session: `packages/application/src/rentals/detail.ts`, `apps/web/src/rentals/detail-time.ts`, `rental-details.tsx`, `rental-details.module.css`, `detail.test.tsx`, `apps/web/preview/rental-create/details.html`, `detail-preview.tsx`, and `docs/rental-contracts-offline-details.md`.

No existing rental-create domain, form, SQL draft, migrations, flags, audit evidence or unrelated screens were edited. Next safe task: review the actual reference image, then agree the document presentation schema and lifecycle snapshot contract before any persistent adapter. Production remains **NO-GO**.
