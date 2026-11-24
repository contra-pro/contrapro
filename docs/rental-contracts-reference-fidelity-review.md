# Rental contract reference fidelity review

Review date: 2026-11-20. Verdict: **NEEDS REVISION — partial functional fidelity across all five templates. Production remains NO-GO.**

Only this report was created. No product code, fixtures, settings, SQL, migrations or existing evidence were changed. No database connection or SQL execution occurred. No new browser session or tests were run for this review.

## Evidence and method

The original image is now present: [`references/rental-contract-original.jpg`](references/rental-contract-original.jpg), SHA-256 `84a6d8a58d6039eee6e151ab30be123c6417c821646ccc882a10338f7bed84ce`. It was visually inspected at its original 862 × 1453 resolution. Labels and structure below come from that image, not a generic contract. Personal names, identity/licence numbers, registration, contact values, signatures and stamp contents are deliberately not transcribed or reused as fixtures.

Implementation inspected:

- [`contract-settings.ts`](../packages/application/src/rentals/contract-settings.ts): settings at lines 3–8; driver and document models at lines 68–75; demo snapshot boundary at lines 83–87.
- [`contract-document.tsx`](../apps/web/src/rentals/contract-document.tsx): shared renderer, lines 7–32.
- [`contract-studio.module.css`](../apps/web/src/rentals/contract-studio.module.css): common document layout, lines 11–28; five style behavior through lines 29–41. Classic uses the base styles.
- [`clients.ts`](../packages/application/src/clients.ts): client fields and identity type at lines 6–9.
- [`vehicle-draft.ts`](../packages/application/src/vehicle-draft.ts): separate make/model and mileage at lines 4–9.
- [`agency-management.ts`](../packages/application/src/agency-management.ts): agency profile fields at lines 1–4.
- [`contract-document.test.tsx`](../apps/web/src/rentals/contract-document.test.tsx): current shared-section assertions, including an expectation of exactly four diagrams.

All five previously captured desktop previews were inspected alongside current JSX/CSS: `C:/Users/lenovo/AppData/Local/Temp/contratpro-rental-browser-qa/run-1795168729200/template-{classic,luxury,modern,detailed,bilingual}.png`. These are existing artifacts, not a fresh browser validation. Source and screenshots show the same common field structure. Logo rendering is supported by source but those screenshots have no uploaded logo; its visual fit is not established by these screenshots.

## Exact visible inventory and present/missing matrix

Status means representation in the current document model/renderer, not real persistence or proof of the underlying fact. “Partial” includes collapsed fields or presentation-only free text. Each repeated driver row applies separately to **both** drivers.

| Image section / exact visible label or element | Current representation | Status | Correct data category |
| --- | --- | --- | --- |
| Header: agency name | `settings.company.name`, printed | Present | Agency settings/profile |
| Header: `CAR RENTAL PREMIUM` tagline | No dedicated tagline; footer is not an equivalent header field | Missing | Agency branding settings |
| Header: telephone icon and number | `company.phone`, text | Present; icon difference cosmetic | Agency profile |
| Header: e-mail icon and address | `company.email`, text | Present; icon difference cosmetic | Agency profile |
| Header: logo, large on right | Optional PNG `settings.logo`, fixed 64 × 64 containment at header start | Partial visual fidelity; logo slot exists | Agency branding settings |
| Header: `N°-…` contract identifier | `document.number`, or explicit unnumbered draft text | Present in renderer; no issued-number demo lifecycle | Rental identity/lifecycle |
| Title: `CONTRAT DE LOCATION` | `Contrat de location` | Present | Document presentation |
| `INFORMATIONS DU LOCATAIRE` | Two driver section headings without this umbrella heading | Partial grouping only | Document presentation |
| `1er CONDUCTEUR :` | Required `primaryDriver` | Present as Conducteur principal | Client/driver record and rental-driver association |
| `2e CONDUCTEUR :` | Nullable `secondaryDriver`; omitted details replaced by one optional message | Partial: slot exists, empty field grid disappears | Client/driver record and rental-driver association |
| Both drivers: `NOM COMPLET :` | `DemoDriver.name` rendered as unlabeled bold text | Partial: value slot exists, explicit label absent | Client record |
| Both drivers: `CIN :` | Generic `identity` text only | Missing distinct field/label | Client identity projection |
| Both drivers: `PASSPORT :` | Same generic `identity` text only | Missing distinct field/label | Client identity projection |
| Both drivers: `N° PERMIS DE CONDUIRE :` | `licence`, printed as Permis, plus free-text `licenceDates` | Present number slot; less explicit label | Client driving-licence record |
| Both drivers: `VILLE :` | No driver city; `address` is not a city field | Missing | Client record |
| Both drivers: `NATIONALITE :` | No nationality in `DemoDriver` | Missing | Client record |
| `VÉHICULE & CONVENTIONS DE LOCATION` | Separate Véhicule / Période et lieux / Location sections | Present functionally, different grouping | Vehicle and rental projections |
| `MARQUE :` | Combined `vehicle.makeModel`, no make label | Partial / lossy structure | Vehicle record |
| `MODELE :` | Same combined `makeModel`, no model label | Partial / lossy structure | Vehicle record |
| `IMMATRICULATION :` | `vehicle.registration` | Present | Vehicle record |
| `DATE DEPART :` | `rental.start` string | Present as Départ; no typed document timestamp | Rental period |
| `DATE RETOUR :` | `rental.end` string | Present as Retour; no typed document timestamp | Rental period |
| `NBR JOURS :` | `rental.duration` string | Partial: duration text rather than structured day count | Rental pricing/period projection |
| `LIEU DE DÉPART :` | `rental.pickup` | Present as Prise en charge; fixture only | Rental pickup details |
| `LIEU DE RETOUR :` | `rental.returnLocation` | Present as Restitution; fixture only | Rental return details |
| `KM DEPART :` | `rental.mileage` string, labeled Compteur | Partial: not explicitly a departure inspection reading | Departure inspection/handover record |
| `KM autorisé :` with daily distance unit in value | `rental.allowance` string, Forfait journalier | Partial: unstructured value/unit | Rental-specific allowance, possibly initialized from agency policy |
| Condition area: left and right side vehicle illustrations | Four named views include gauche/droite, but share one generic body path | Partial: orientation labels do not supply distinct usable surfaces | Inspection document diagram assets + inspection marks |
| Condition area: overhead vehicle illustration | No overhead view in `damage.view` union or renderer | Missing | Inspection diagram assets + inspection marks |
| Condition area: front and rear vehicle illustrations | avant/arrière slots, nearly identical generic silhouettes | Partial | Inspection diagram assets + inspection marks |
| Fuel graphic: pump icon, gauge, `1/1`, `1/2`, `0/1`, intermediate ticks | Five-state fuel enum rendered as text only | Partial: value category exists; gauge missing | Inspection fuel reading + presentation |
| `SIGNATURE DU LOCATAIRE` | Signature client box; literal unsigned state | Present placeholder only | Signature record/evidence |
| Agency signature heading (contains a printed agency name) | Generic Signature agence, not agency-branded caption | Partial | Caption from agency settings; event from signature record |
| Both boxes: `Précédée de "Lu et Approuvé"` | No acknowledgment label/state | Missing | Approved document wording + eventual signer acknowledgment evidence |
| Signature area: stamp/signature graphic and date under agency box | No image, signer, signing date, stamp or signing event | Missing intentionally in offline MVP | Signature record, not a reusable pre-signed agency logo |
| `CONDITIONS GÉNÉRALES :` plus paragraph | Saved `settings.conditions`, moved to following sheet(s) | Present container; current generic demo wording not reference-equivalent | Agency document settings, versioned into document snapshot |
| Footer: agency name | Free-text footer only on first sheet; structured company name in header | Partial footer composition | Agency profile/settings |
| Footer: `Adresse:`, city/country, `GSM :`, `E-mail :`, `RC :`, `ICE :` | Structured address/city/phone/email/RC/ICE available and printed in header; footer itself arbitrary text; no country field | Partial: data mostly exists, placement/structured footer incomplete | Agency profile and document presentation |

The image has no explicit rental rate, rental total, deposit, VIN, driver address, licence validity dates, return odometer or return fuel field. Existing extra fields need not be removed; they are application additions, not evidence of reference fidelity. In particular, do not remove the separate security-deposit display merely because this image does not show it. Do not invent date-of-birth or other unseen fields as reference requirements.

## Reference anomalies and interpretation limits

- The client signature box contains a visible `#VALEUR!` spreadsheet-style error. This is a source defect, **not** a field to reproduce. The agency signature heading, header/footer branding and a company mention in the conditions are not fully consistent. Future documents must use their own agency's configured identity, not copy those mismatches.
- Vehicle make/model values in the image are not a reliable specification of how those fields should be populated. Preserve their labels and use correctly typed vehicle data; do not infer mappings from those filled examples.
- The visible conditions paragraph discusses acknowledgment, vehicle return condition, full-to-full fuel, timely return, damage/theft charges, speed rules and starts a geographic restriction. Its final phrase ends at `Interdiction de quitter le` without a visible continuation. The full legal wording cannot be recovered from this image. Do not complete it from assumptions or certify it as legally adequate.
- The gauge is visible, but an unambiguous selected fuel level is not established by the image. No actual fuel value is inferred or copied.
- A drawn stamp/signature in a photograph does not establish signer authority, signing time, consent, integrity or legal validity. Neither it nor personal information was copied into demo data.
- The image is a single portrait page, not proof of exact A4 physical dimensions or a certified print layout. The current preview is a multi-sheet A4-style layout, not a reproduction of that pagination.

## Comparison of all five styles

All five styles use the same renderer and data model. Consequently, every missing field above affects all five; CSS changes cannot recover missing typed information.

| Template | Existing visual identity to preserve | Fidelity assessment |
| --- | --- | --- |
| Classic Professional | Traditional two-column sections, fine rules, restrained brand header | Broad categories present; driver fields are abbreviated, vehicle data merged, inspection incomplete, conditions moved off first sheet |
| Luxury Premium | Dark agency band, accent rule, centered spaced title | Same functional gaps; dark treatment is an intentional style, not a defect requiring reference-color imitation |
| Modern Minimal | Brand rail, asymmetric sections, lighter heading treatment | Same functional gaps; preserve sparse style while adding explicit labels/values |
| Auto Rental Detailed | Boxed vehicle/rental grid, bordered diagram area | Closest in form-like density, but **not yet functionally faithful**: reference uses two full-width six-field driver blocks, separate make/model cells, five recognizable vehicle views, gauge, acknowledgment captions and more complete signature/footer composition |
| Bilingual FR/AR | Right-aligned agency header, paired French/Arabic section headings | Same field gaps; body labels, view names and conditions remain French unless content is supplied otherwise. Mixed-direction heading punctuation/spacing is crowded in the screenshot. This is partial bilingual presentation, not a fully bilingual contract |

The detailed style does not currently receive a special reference-oriented content structure; it mostly adds borders to the common grid. Preserve each style while correcting the shared semantic model and applying a denser arrangement only where the detailed design calls for it. No redesign has been implemented.

## Prioritized findings and minimal proposed changes

Priorities below concern reference fidelity; they are not a new Production release approval.

| Priority | Finding / evidence | Minimal next implementation, subject to a separate decision |
| --- | --- | --- |
| P1 | Driver identity is collapsed and city/nationality absent (`contract-settings.ts:68`, `contract-document.tsx:11`) | Expand the presentation driver projection to explicit name, CIN/passport slots, licence number, city and nationality. Existing client fields already supply identity type/number, city and nationality; render an explicit empty alternate identity slot. If both documents must be stored simultaneously, that is a separate client-domain decision, not an assumed schema change. Keep secondary driver nullable but retain labeled empty slots in the detailed document |
| P1 | Vehicle make/model collapsed (`contract-settings.ts:72`, renderer line 21) | Project existing vehicle make and model separately; retain registration. No new vehicle database fields required for these visible requirements |
| P1 | Inspection not faithful (`contract-settings.ts:74`, renderer line 26) | Add top-view identity and genuinely distinct side/front/rear/top illustrative outlines. Bind damage marks to those stable views. Add an accessible fuel gauge driven by the existing enum, with text fallback. Do not trace/copy the real customer's marks or imply a performed inspection |
| P1 | Departure mileage, allowance and day count are free text (`contract-settings.ts:73`) | Define a typed document projection with explicit units and departure-reading semantics; reuse validated pricing day count and timestamp instants. Keep unsupported values synthetic until separate rental/inspection models are approved; never infer handover mileage from current vehicle mileage |
| P1 before real documents | Signature boxes omit acknowledgment/date/evidence and conditions are only demonstration text (renderer lines 27–30) | For offline fidelity, add approved acknowledgment captions and explicit empty date/signature placeholders. Actual signing, evidence and finalization require separate lifecycle design and authorization. Obtain complete approved conditions; never copy the source error, inconsistent agency names or truncated clause |
| P2 | Agency footer/brand composition incomplete (renderer lines 15,28,30) | Reuse structured company fields to compose the legal footer; consider optional tagline/country only after confirming need. Allow an aspect-aware logo region without changing agency-level ownership of branding. Never place signature/stamp assets in logo settings |
| P2 | Bilingual body is not fully bilingual; mixed-direction heading separators crowded | Translate fixed labels and isolate French/Arabic text runs while preserving bilingual style. Approved bilingual condition content remains a distinct content/legal task |
| P2 | Conditions pagination is fixed character chunking (renderer line 12), not layout measurement | Before PDF/export, validate actual page breaks, long conditions, long driver/company fields, logo aspect ratios and all five styles. No need to force all templates into an identical one-page design |

Recommended **first implementation decision**: authorize only the explicit driver and vehicle presentation projection correction, shared rendering labels, synthetic fixtures and focused tests. This reuses existing client/vehicle facts, fixes the largest missing semantic sections, preserves all five styles and requires no rental-create RPC/schema change. Inspection assets and signing design should remain separately scoped tasks.

## Proposed verification after a separate implementation decision

The current test named “retains essential reference fields” checks broad headings and a few values, not the actual image inventory. Its four-SVG assertion currently encodes the inspection omission. Existing passing tests must not be presented as reference completeness evidence.

Future focused checks should assert both drivers' full label sets, explicit CIN/passport absence semantics, city/nationality, separate make/model, five stable inspection views, text-equivalent fuel level, departure mileage/unit, independent allowance, acknowledgment placeholders and structured agency footer. Check each of the five templates, including empty secondary driver, long fields, mixed Arabic/French content and logo aspect ratios. Add mobile and print-page screenshots. Keep real identity values and the photographed signature/stamp out of tests, snapshots and fixtures.

## Architecture boundaries and final decision

Agency branding/company/conditions stay in agency settings; client identity/licence facts stay in client records and rental-driver associations; vehicle make/model/registration stay in vehicle records; dates/locations/day count/allowance stay in rental records; observed odometer/fuel/damage belong to dated inspection records; actual acknowledgment/signing events belong to signature records. Document presentation combines projections and preserves a versioned immutable snapshot at the eventual authorized finalization boundary. In-memory demo snapshots are not that persistent transaction.

No authorization, tenant-isolation, persistence or legal guarantees can be inferred from this image or renderer. Existing agency isolation and unsigned demo labels should be preserved. The five visual styles can remain; none currently meets full reference fidelity. **Production remains NO-GO.**
