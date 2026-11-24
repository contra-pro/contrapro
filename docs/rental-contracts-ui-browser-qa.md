# Rental Creation UI — real-browser QA

**Verdict: GO for continued local/offline MVP development. Production Migration /
Deployment remains NO-GO.** No P0/P1 functional or accessibility defect was confirmed.
Two P2 development-console issues remain; no product code was changed because this
task authorizes fixes only for confirmed P0/P1 findings.

## Browser, isolation and artifacts

Tested installed **Chrome 158.0.8127.36**, headless, using its DevTools protocol and
Node's existing WebSocket runtime. No package/browser download or installation was
needed. Each browser session used a fresh temporary profile, not the user's Chrome
profile, cookies, sessions or other tabs. Background browser networking was disabled;
page requests outside the loopback preview were blocked by the QA harness.

The documented Vite preview was already listening at http://127.0.0.1:4179 when QA
started. Its process command line matched this repository's isolated preview config,
so it was reused instead of starting a duplicate. It was stopped after QA and port
4179 was checked to have no listener. No Next.js/Supabase page or API was opened.

The browser-tab tool was unavailable. Native Chrome accessibility inspection worked
partially, but screenshot capture timed out and clicks lacked geometry. These were
tool limitations, not UI defects. The isolated headless fallback provided actual
browser rendering, screenshots, input events, measurements and runtime diagnostics.

Final complete artifacts:

`C:/Users/lenovo/AppData/Local/Temp/contratpro-rental-browser-qa/run-1795167217242/`

- results.json: measured viewport/control/contrast/keyboard/network and retry facts.
- 13 PNG screenshots listed below.
- A fresh anonymous Chrome profile, retained with local QA artifacts; not a user
  authentication profile and not a deployment artifact.

Temporary QA driver:
`C:/Users/lenovo/AppData/Local/Temp/contratpro-rental-browser-qa/qa.mjs`.
Earlier diagnostic runs remain in the same temporary parent directory. The first
run stopped because the automation's Enter event lacked its text payload. Correcting
the driver, without changing application code, allowed keyboard submission to pass.
The next complete run passed; a final run added contrast/client-width measurements.
Ephemeral Vite URL query values were redacted from generated console diagnostics.

## Viewport and visual coverage

All tests used CSS viewport height 1000px, device scale 1, desktop Chrome responsive
emulation; this is not physical iOS/Android or touch-gesture verification. Screenshots
capture full document height. Classic scrollbars account for the 15px difference
between innerWidth and clientWidth; scrollWidth equals clientWidth in every case.

| Width | clientWidth / scrollWidth | Overlapping controls | Visual result |
|---|---|---|---|
| 320 | 305 / 305 | 0 | Single column, readable wrapped labels/notices, full-width action |
| 375 | 360 / 360 | 0 | Single column; required errors and focused calendar icon readable |
| 768 | 753 / 753 | 0 | Two-field choice/price rows, three-field dates, summary below |
| 1024 | 1009 / 1009 | 0 | Two-column form/summary without overlap |
| 1440 | 1425 / 1425 | 0 | Desktop form/summary aligned; populated amounts clear |

Screenshots in the final artifact directory:

- initial-320.png, initial-375.png, initial-768.png, initial-1024.png, initial-1440.png
- filled-320.png, filled-1440.png
- required-errors-375.png, native-date-focus-375.png
- loading-320.png, uncertain-320.png, success-320.png, conflict-320.png

Representative [desktop](C:/Users/lenovo/AppData/Local/Temp/contratpro-rental-browser-qa/run-1795167217242/filled-1440.png),
[mobile](C:/Users/lenovo/AppData/Local/Temp/contratpro-rental-browser-qa/run-1795167217242/filled-320.png),
[validation](C:/Users/lenovo/AppData/Local/Temp/contratpro-rental-browser-qa/run-1795167217242/required-errors-375.png),
[uncertain](C:/Users/lenovo/AppData/Local/Temp/contratpro-rental-browser-qa/run-1795167217242/uncertain-320.png).

## Functional and accessibility observations

| Check | Observed evidence |
|---|---|
| French labels and choices | Every input/select has an associated label at every width; injected client/vehicle selections updated the real React form |
| Keyboard navigation | 18 Tab stops traversed scenario, native selects, native date segments/pickers, times, offsets, amounts and submit; Enter triggered form validation and later submissions |
| Visible focus | Author controls showed solid focus outlines; the native calendar-picker subcontrol used its own visible black focus ring (parent outline:none is not a missing-focus defect) |
| Required validation | Empty keyboard submission marked client, vehicle, start/end date and rate invalid; all five described-by references resolved to rendered errors; focus moved to the alert summary |
| Screen-reader structure | Browser accessibility tree exposed named native controls, alert/status roles; live message text and focused summary were present. Actual NVDA/JAWS/VoiceOver speech was not tested |
| Touch dimensions | Measured author inputs/selects/buttons were at least 44px high at every width; smallest author-control width was 136px. Browser-owned date subcontrols were not treated as custom targets |
| Contrast | 40 enabled text/control samples in the initial browser state met their text thresholds; minimum measured ratio 5.46:1. This is sampled computed-color evidence, not full WCAG certification or all-state/placeholder contrast coverage |
| Price and precision | 24h + 1 microsecond at 123,45 MAD/day displayed 2 days and 246,90 MAD; time field retained 09:00:00.000001; separate deposit displayed 500,00 MAD |
| Loading | aria-busy true; fieldset and submit disabled; pending feedback visible |
| Duplicate submissions | Two extra submit events during the pending attempt left the actual transport-call count at one |
| Uncertain/retry | First fake attempt lost its response; form locked; only an explicit retry sent another call; observed body and creation key matched exactly |
| Success | Validated fake receipt rendered the explicit no-contract-stored notice; no issued number or signature was shown |
| Conflict | New-demo-draft flow plus conflict scenario displayed the fixed conflict notice without an automatic retry |
| Reduced motion | No CSS animations were active and no animated spinner was present. A separate reduced-motion media emulation was not performed |
| Runtime/network | Zero Runtime.exceptionThrown events. 22 page resources: 1 document, 19 scripts/styles-as-modules, 1 inline data image, 1 favicon request. All HTTP resources were loopback; zero external page requests, Fetch/XHR business calls or Supabase calls |

Form values were prepared through real browser native value setters and input/change
events, as ordinary browser automation does. Tab navigation and Enter submissions
used native browser keyboard events. A complete human keyboard-only date/text-entry
session and native popup interaction on physical mobile devices remain unverified.

Retry identity was observed via a temporary DevTools breakpoint at the preview's
fake transport entry, reading only synthetic body/key scope and immediately resuming.
The report stores comparison booleans, not raw keys/bodies. The source/transport was
not rewritten. Three observed calls corresponded to uncertain attempt, explicit
successful retry, then explicit new draft/conflict attempt; no additional call was
observed. Debugger pauses add timing overhead, so this is not a performance benchmark.

## Findings ranked by severity

### P0 / P1

None confirmed. No code fix, redesign, permissions change or security relaxation
was made. The review does not establish absence of defects outside this coverage.

### P2 — Vite development WebSocket conflicts with preview CSP

- Reproduce: start the documented Vite dev preview, open it in a fresh browser, inspect
  Console. Vite's client attempts a local WebSocket and connect-src:none blocks it.
- Evidence: fresh-profile Log.entryAdded policy error; zero JavaScript exceptions;
  all required form interactions continued to work.
- Relevant source: `apps/web/preview/rental-create/index.html:7` (connect-src:none),
  `apps/web/preview/rental-create/vite.config.mts` (development preview).
- Impact: console noise / development connection unavailable; not data leakage or
  a broken creation workflow. Do not loosen the business-network restriction merely
  to silence it. A separately scoped preview-serving adjustment can remove noise.

### P2 — missing favicon request returns 404

- Reproduce: open the preview in a fresh browser and inspect Network/Console.
- Evidence: /favicon.ico requested once with 404; no UI/runtime failure.
- Relevant source: `apps/web/preview/rental-create/index.html` has no icon declaration
  and the isolated preview root contains no favicon.
- Impact: cosmetic development-console error only. Left unchanged under P0/P1-only
  correction scope.

Therefore the strict "zero browser console errors" check is **not passed**, despite
zero JavaScript exceptions and successful interaction checks. These are not hidden
or reclassified as passing runtime diagnostics.

## Tests, changes and cleanup

Executed `npm run test --workspace=@contratpro/web -- src/rentals/rental-create-form.test.tsx`:
**20/20 passed**. These supplement the browser run; they are not its visual evidence.
No product source was edited, so TypeScript/lint/build were not repeated solely for
this documentation change. Whitespace validation was run for the new report.

Only new repository file: **docs/rental-contracts-ui-browser-qa.md**. Existing reports,
fixtures, application code and migration drafts are unchanged. QA driver/profiles,
results and screenshots were generated only under the named local temporary folder.
All isolated headless sessions were closed. The verified Vite preview process was
stopped and port 4179 had no listener afterward. SQL draft SHA-256 remains
3c27bc2a11de4d13a8003b35aa16d5d733eaeaa3be86557167a6fb2967214b79.

Remaining UX coverage: Firefox/WebKit, real mobile/touch/date pickers, screen-reader
speech, zoom/high-contrast modes and complete all-state contrast. No authentication,
database transaction, real idempotency or persistence is proven by this demonstration.

**GO for the next local/offline MVP slice**, retaining these limits and the two P2
findings. Any production integration remains separately blocked; no SQL, database
connection, real API route, Supabase call, commit, push or deployment occurred.
