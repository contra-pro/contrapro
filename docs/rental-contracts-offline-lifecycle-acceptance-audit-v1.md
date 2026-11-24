# Offline lifecycle acceptance and audit V1

**Bounded offline acceptance: PASS. No confirmed implementation defect or blocking issue was found within the documented offline boundary. GO for design-only future signing architecture. Real signing and Production remain NO-GO.**

This is a fresh, agent-run acceptance review of the current working tree, not a separate human/security certification. Reviewed HEAD is `fffcc8d96dbe9be95e93b8c0d9eed3c2ea8acf42`, but the rental module is untracked and earlier unrelated edits are present, so HEAD alone does not identify the reviewed implementation. [Before/after source hashes](evidence/lifecycle-acceptance-audit-v1/production-source-comparison.json) identify eight reviewed core implementation files and confirm they were unchanged by this audit.

## Phase 1 — read-only findings before test changes

Read the lifecycle report, model and tests, Studio integration, PDF export, V1/V2/V3 snapshot guards/rendering and existing browser evidence. Checked the working tree before editing. Reviewed correctness, error paths, isolation, immutable values, dependency boundaries and the distinction between simulation and signing evidence.

No implementation fix or refactor was warranted by the read-only review. The missing acceptance coverage was:

1. The complete source/target transition matrix, including same-state pending requests.
2. Repeated finalization/pending requests with both stale and current revisions.
3. Same rental UUID in two agencies, rather than only access to an absent foreign record.
4. Invalid revision values and preservation of the exact record on rejection.
5. Nested marker-array mutation/deletion attempts against the finalized snapshot.
6. Repeated printing in each later state and actual `beforeprint`/`afterprint` event isolation.
7. Stale-view UI conflict feedback, plus fresh keyboard/browser acceptance at both widths.

These were coverage gaps, not evidence that the implementation was defective. They were identified before changing tests. Broader input decoding, authenticated actor identity, durable event storage and real-provider verification were already outside the offline scope; they remain gates for future work rather than newly introduced regressions.

## Acceptance matrix

| ID | Requirement / invariant | Evidence | Result |
| --- | --- | --- | --- |
| A1 | Draft → Finalized captures the reviewed document/settings and increments revision once | Application tests, explicit keyboard save/finalize, frozen snapshot checks | PASS |
| A2 | Finalized → Signing pending records only intent and preserves the exact snapshot | Transition matrix, repeat tests, browser text/state equality | PASS |
| A3 | Signed is rejected from every reachable state | Full matrix; disabled UI button; no Signed record type or evidence-accepting function | PASS |
| A4 | Agency isolation has no fallback, including same UUID in two agencies | Scoped get/list/edit/transition tests and Agency B browser switch | PASS |
| A5 | Stale/invalid revisions cannot overwrite records | Seven revision cases for both writes; duplicate tests; stale UI/browser fixture | PASS |
| A6 | Finalized snapshot cannot be changed through retained references or returned lists | Deep freeze, `Reflect.set`, deletion, array push and detached final snapshot tests | PASS |
| A7 | Repeated finalization/pending actions do not duplicate transitions | Stale requests return conflict; current-revision repeats return invalid-transition; disabled-click tests/browser checks | PASS |
| A8 | Repeated printing cannot change state, revision, evidence or snapshot | Ten unit print calls with print events; three keyboard print dispatches per browser export | PASS |
| A9 | V1/V2/V3 remain readable without rewriting history | Existing five-template/untagged-V1 regressions and lifecycle UI historical fixtures | PASS, read compatibility only |
| A10 | No consent, signing instant or evidence is fabricated | Evidence remains null; signatures remain not-signed; no clock/network use in transition tests | PASS |
| A11 | Keyboard and error feedback work at 320px/1440px | Native Tab/Enter checks, visible focus, controlled stale-view browser fixture | PASS |
| A12 | All standard templates remain one A4 page, with full long-content overflow | Actual Chrome PDFs and independently reopened page/font/content checks | PASS |
| A13 | Future audit-event contract covers required identity/action/time/state/revision/evidence/idempotency fields | Separate design document, no implementation or emitted events | DESIGN COMPLETE; runtime intentionally absent |

The full transition matrix at the current revision is:

| Source | Draft target | Finalized target | Pending target | Signed target |
| --- | --- | --- | --- | --- |
| Draft | Reject | Accept | Reject | Reject |
| Finalized | Reject | Reject | Accept | Reject |
| Signing pending | Reject | Reject | Reject | Reject |

Stale expected revisions are rejected before any transition is applied. Rejection codes may therefore be `conflict` rather than a target-specific rejection; either way the record remains unchanged.

## Phase 2 — test-only changes and results

Only these existing test files changed:

- `apps/web/src/rentals/contract-lifecycle.test.ts`: **22 additional cases**, covering the matrix, repeats, seven invalid/stale revisions, identical cross-agency UUIDs and nested immutability.
- `apps/web/src/rentals/contract-lifecycle-demo.test.tsx`: **3 additional cases**, covering ten print calls/events, repeated disabled actions and stale-view feedback without overwrite/retry.

Existing tests were retained. No application model, component, Studio integration, snapshot model or print CSS was changed. Added the present report, the future event-design document and evidence artifacts only.

- Targeted lifecycle suites: **43 tests PASS** (34 application + 9 UI).
- Full rental suite: `npm run test --workspace=@contratpro/web -- src/rentals` — **652 PASS, 18 files**.
- TypeScript: `npx --no-install tsc --project apps/web/tsconfig.json --noEmit --incremental false` — PASS.
- Targeted ESLint for both modified tests using the existing explicit web config, `--max-warnings=0` — PASS; existing Next pages-directory informational notice remains.
- `git diff --check` plus explicit UTF-8/trailing-whitespace checks for modified/new text files — PASS. Explicit checks cover currently untracked files.
- Isolated Studio preview build — PASS. Browser-only directive/static-dynamic import notices remain; output is temporary, with no deployment or production application run.

One test initially attempted a statically readonly array's `push` method. The adversarial mutation check was expressed through `Array.prototype.push.call` instead, preserving its runtime TypeError assertion. Final TypeScript and the complete test suite pass.

### Check that tests detect a real guard regression

Removed the Finalized-source precondition for the pending transition **in a temporary module copy outside the repository** and redirected only that experiment's test resolver to it. The mutant was caught by **four failing tests**, including the new skip/repeat matrix cases. The reviewed source file was never edited. [Mutation-check evidence](evidence/lifecycle-acceptance-audit-v1/mutation-check.json) records this deliberate experiment; it is not a finding against the real implementation.

## Phase 3 — browser acceptance

Fresh isolated Chrome, local preview only, synthetic data:

- **320px and 1440px:** all five finalized template views fit horizontally. Pending views were also captured at 320px. No runtime exceptions or lifecycle/export Fetch/XHR business requests occurred in the successful run. Local preview scripts/assets still load from loopback; this is not a claim of zero browser asset loading.
- **Keyboard:** starting from the primary-driver field, Tab visits pickup, return, enabled Finalize and the future-requirements summary. Disabled Save/Pending/Signed controls are skipped in a clean draft; focus has a visible solid outline. Native text insertion followed by Tab/Enter saves dirty data. Finalization and pending activation were exercised with Enter at 320px.
- **Repeated actions:** repeated native DOM clicks on disabled lifecycle buttons leave pending state unchanged. Unit tests separately exercise repeated requests that reach the state machine, including stale and fresh-revision attempts.
- **Repeated printing:** Enter requests printing three times per export, including at 320px and 1440px. State and full sheet text remain unchanged on every dispatch. Standard, pending, historical and long-content exports remain unsigned. No download-success message is shown.
- **Error feedback:** a temporary browser-mounted instance of the unchanged component/service deliberately retains draft revision 1 while its isolated service record advances to revision 2. Repeated Enter finalization attempts at both widths show the conflict alert, preserve revision 2 and invoke no successful-change callback. This is a controlled stale-props acceptance fixture, not a claim of distributed/multi-user concurrency support.
- **Isolation/history:** Agency B exposes no Agency A sheet/action. Updating agency settings later does not replace a prior snapshot's content.

The headless print boundary is instrumented to count requests and avoid an interactive save dialog. Actual PDFs are generated with Chrome `Page.printToPDF` from the same rendered document and print CSS, then reopened independently. Neither instrumentation nor PDF generation writes lifecycle/audit/signing records.

A preliminary test-harness import probe used the optimized module's wrong export shape; that helper-only issue was corrected without application changes. The final successful browser run is [results.json](evidence/lifecycle-acceptance-audit-v1/results.json). The earlier harness probe remains separately identified in evidence and is not a product defect.

### Actual print results

| Template / case | Actual A4 pages |
| --- | ---: |
| Classic Professional | **1** |
| Luxury Premium | **1** |
| Modern Minimal | **1** |
| Auto Rental Detailed | **1** |
| Bilingual FR/AR | **1** |
| Classic pending / Bilingual pending / historical Classic | **1 each** |
| Long-conditions snapshot | **4** |

All reopened pages measure approximately 209.889 × 297.011mm (normal Chrome A4 rounding); minimum text is 10pt. No blank pages, replacement glyphs or text bounds outside page edges were found. All 180 long-condition lines are present; the screen preview reports overflow. Signature placeholders and legal footer remain visible. Bilingual page imagery was visually reviewed for Arabic shaping and content fit.

Evidence: [PDF checks](evidence/lifecycle-acceptance-audit-v1/pdf-checks.json), [keyboard desktop](evidence/lifecycle-acceptance-audit-v1/draft-keyboard-1440.png), [keyboard mobile](evidence/lifecycle-acceptance-audit-v1/draft-keyboard-320.png), [stale feedback mobile](evidence/lifecycle-acceptance-audit-v1/stale-feedback-320.png), [stale feedback desktop](evidence/lifecycle-acceptance-audit-v1/stale-feedback-1440.png), [pending mobile](evidence/lifecycle-acceptance-audit-v1/bilingual-pending-320.png), [Bilingual A4](evidence/lifecycle-acceptance-audit-v1/bilingual-page-1.png).

The evidence directory also contains the exact browser/PDF verification helpers and a [file manifest](evidence/lifecycle-acceptance-audit-v1/manifest.json). These are test artifacts, not an audit-event producer.

## Phase 4 — future audit design

[Future audit-event contract V1](rental-contracts-future-audit-event-contract-v1.md) defines actor/agency/contract identities, action semantics, timestamp provenance, observed/requested/applied state distinction, expected and actual revisions, evidence/snapshot references and idempotency keys/fingerprints.

It distinguishes recording time from verified signing time and print intent from successful file save. It addresses immutable evidence binding, V1/V2/V3 canonical snapshot encoding, bigint/text preservation, rejected/uncertain outcomes, replay handling and authoritative append-only integrity. **No example events, timestamps, actor identities or signing evidence were populated, and no logger or integration was implemented.**

## Blocking issues and decision

**No unresolved blocker for the bounded offline lifecycle acceptance.** These limitations still block operational signing:

1. Current contexts are simulations, not authenticated actor identities/agency memberships.
2. Records are in memory; no authoritative durable audit writer, consistent state/event commit or recovery protocol exists.
3. No verified signer identity, consent binding, source-verified signing instant, provider verification, signed-artifact integrity or evidence-acceptance boundary exists.
4. No authoritative idempotency/replay/reconciliation design has been implemented across a real external side effect. Current revision checks intentionally reject duplicates rather than providing production command receipts.
5. Historical readability is not an importer, migration or proof of historical lifecycle events. Printing is manual and cannot prove a file was saved.

These are explicit boundary limitations, not silently fixed or reclassified as current signing evidence. No SQL execution, database/Supabase connection, migration, public API route, commit, push or deployment occurred; unrelated work was not reset or overwritten.

**GO for design-only future signing architecture and review of the proposed audit contract. NO-GO for implementing/enabling real signing from this acceptance result. Production remains NO-GO.**
