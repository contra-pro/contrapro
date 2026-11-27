# A6 professional FR/AR interface — local verification checkpoint

**Latest follow-up:** the missing operational dashboard projection and presentation
are now implemented. See “Remaining-implementation follow-up” below and the
[manual review guide](a6-manual-visual-review.md). Earlier gap lists and counts
describe the earlier checkpoint, not the latest source. Full A6 exit remains open.

2026-11-26 UTC. **A6 exit criteria are not yet satisfied.** This report records
the existing uncommitted A6 presentation work and the narrowly scoped verification
follow-up. It does not certify every journey, visual fidelity, WCAG compliance,
production readiness or completion of the MVP. Earlier A1–A5 changes were preserved.
No commit, push, deployment, migration application or integration activation occurred.

## Direction and reusable components

The working direction preserves ContratPro and its existing C mark, navy/blue
palette and light theme. System typography (Segoe UI/Tahoma/Arial), readable
secondary text, restrained borders, 44px controls, logical spacing, responsive
forms and reduced motion are specified in [the design system](design-system.md).
This is an implementation direction, not final brand approval. No dependency was
installed and no external component demonstration was copied. Frontend-design and
lean-ctx guidance were read; 21st tools were available but not needed for these
verification corrections. Web-design-guidelines was inspected, but a fresh
guidelines-based review was not performed.

Reusable source in `apps/web/src/components/`: `ui.tsx` (status, empty, loading,
error, form section and pagination), `confirm-action.tsx` (native dialog),
`unsaved-changes.tsx`, `language-switch.tsx`, `area-shell.tsx`,
`agency-navigation.tsx`, `navigation-model.ts` and `rental-dashboard.tsx`.
Module CSS reuses the global tokens. These primitives are not proof that every
existing destructive control has been converted or every interaction accepted.

## Journey/source inventory and exact limits

All paths below have `/{locale}` prefixes with `fr` and `ar`. This is a focused
source/route inventory, not a record of browser traversal.

| Journey | Existing source / route | Evidence and limits |
| --- | --- | --- |
| Authentication | `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/auth/continue`; `components/auth-{form,view}.tsx`, `auth/*` | FR/AR auth, validation and security regressions exist. Real confirmation/SMTP/session acceptance not performed. Disabled external auth remains disabled. |
| Onboarding / invitation | `/app/onboarding`, `/app/select`, `/app/team/accept`; agency components and `operations/invitation.tsx` | Existing provisioning, verified-email and invitation rules retained. Not a composed browser account-to-agency acceptance. |
| Shell | `area-shell.tsx`, `agency-workspace.tsx`, `agency-navigation.tsx`, `/api/navigation` | Sidebar, mobile disclosure, language switch, sign-out, agency context where supplied. Fail-closed module gates. Account dropdown and agency context across every workspace are not verified complete. No platform link added to agency navigation. |
| Operational overview | `/app`; `rental-dashboard.tsx`, `rentals/data.ts`, `server/dashboard-time.ts` | Existing authorized list, at most 20 records; scoped counts disclose their limited denominator. Draft, active and departure/return indicators and deep links. No fake finances. Signature/delivery/sync/billing summaries are not implemented in this overview. |
| Clients / drivers | `/app/clients`, `/new`, `/[clientId]`; client components and existing handlers | Search, pagination, create/edit/archive and identity minimization use existing authority. Visual and mobile acceptance pending. |
| Vehicles | `/app/vehicles`, `/new`, `/[vehicleId]`; vehicle components | Existing search, forms, history and archive rules; no new availability guarantee. |
| Contract creation / lifecycle | `/app/rentals`, `/new`, `/[rentalId]`; `rentals/workspace.tsx`, `operations/rental.tsx` | Section-based workflow, draft/preview/confirmation/issuance distinctions, ledger and lifecycle paths. Existing server validation, revisions and successful-create Sheets event unchanged by this follow-up. Full composed fixture journey is not verified. |
| Templates / PDF | `/app/templates`; `documents/{workspace,clause-workspace,draft-workspace}.tsx`, `field-labels.ts` | Existing versioned templates, mapping, clauses, custom fields and stale preview recovery. Mapping-label regression covers authoritative fields in both languages. Appendix clauses and supported renderer limits retained; no arbitrary PDF editing or DOCX fidelity claim. |
| Agency signing | Rental detail; `signing/workspace.tsx` | Existing agency-first typed capture and version binding. Provider-dependent assurance remains unavailable. Browser acceptance pending. |
| Mobile client signing | `/sign`; `ClientSigning`, signing CSS | Verification, consent, typed name, expiring invitation, PDF download fallback, progress and final states exist. 320/375px layout and keyboard behavior not observed. |
| Delivery / recovery | `/app/deliveries`, rental panels; `delivery/*workspace.tsx` | Existing distinct uncertain/delivery states, reminders and manual sharing. No real messages sent; copied/opened links are not delivery proof. |
| Archive | `/app/archive`; `rentals/archive-workspace.tsx` | Existing authorized bounded search/filter/paging and historical references. Non-destructive archive retained. |
| Sheets | `/app/sheets`; `sheets/{workspace,creation-workspace}.tsx` | One-way destination/recovery UI, same-row and uncertain append protections retained. No Google account connected; disabled gates stay closed. |
| Agency / team / billing | `/app/profile`, `/settings`, `/branding`, `/team`, `/billing`; agency components, `operations/*`, `billing/*workspace.tsx` | Existing owner/signer/entitlement rules and manual/internal billing history. No invented catalog, prices or working checkout. Reusable locations remain absent from the documented A1 model. |
| Platform operations | `/platform`; `billing/platform.tsx`, `maintenance/workspace.tsx`, maintenance handler | Existing separate platform identity/MFA/audit authority. No operational actions invoked. Raw storage/task/outcome labels still need product-copy review. |

## Localization, responsive and accessibility evidence

Existing dictionaries and per-module FR/AR copy, locale root language/direction,
logical CSS, `bdi`/LTR data isolation and exact-money/date presentation are retained.
No stored legal text or accounting value was translated or mutated. Coverage of
all raw operational states, custom labels and error/recovery paths is not proven.

The CSS contains one-column breakpoints, bounded table scroll regions, visible
focus, reduced-motion overrides, native modal focus behavior, labels and status
announcements. These are implementation evidence only. No automated axe browser
run, keyboard/assistive-technology review, measured contrast audit or full WCAG
2.2 AA acceptance was completed in this session.

`scripts/ui-review/{serve.mjs,fixture.tsx,next-stubs.tsx}` provides a loopback-only
synthetic component review with a 320/375/768/1024/1440/1920 matrix. These widths
are configured, **not observed passing measurements**. The fixture adapter is not
the Next server, managed Auth or a real API. Not every route/state/action is modeled;
the provider fixture branches cannot establish production integrations.

## Verification isolation and artifacts

The initial `verify` result was recovered before rerunning anything. TypeScript
passed in both workspaces, then lint rejected `Date.now()` in the dashboard render.
The correction obtains a request-scoped observation time through
`server/dashboard-time.ts`. No lint rule or existing test was removed or weakened.
The follow-up runs only lint, web/database tests, operational tests and build.

The first resumed web run exposed six failures and one suite import error:
onboarding navigation was restored, the server-only import was mocked in the
server-render test, explicit optional Magic Link coverage was retained with an
additional default-disabled regression, and vehicle-route assertions now verify
that vehicle authority does not reveal a client navigation link before fresh
navigation permissions arrive. No production feature flag was enabled.

Files changed by this verification follow-up (in addition to the pre-existing
uncommitted A6 work): `server/dashboard-time.ts`, `app/[locale]/app/page.tsx`,
`components/agency-navigation.tsx`, `components/sign-in-view.tsx`,
`components/{a6-verification.test.tsx,sign-in-view.test.ts,vehicles.test.ts,
agency-access-view.test.ts}`, `scripts/ui-review/{isolate.cjs,verify.mjs}`,
this report, `docs/design-system.md` and the four requested tracking documents.
Source paths without another prefix in this paragraph are under `apps/web/src/`.

`scripts/ui-review/verify.mjs` invokes only allowlisted local npm stages with
`isolate.cjs` inherited by subprocesses. The preload excludes dotenv file reads,
clears application/provider environment variables, disables telemetry and rejects
external socket destinations. It does not change lean-ctx or PowerShell policies.
No real `.env.local` source was intentionally loaded. This is a verification
safeguard, not a replacement production security boundary.

Local ignored artifacts under `.verification/a6/`:

- `verify.log`: recovered first attempt, TypeScript PASS / lint failure.
- `test.log`: first resumed web failure diagnostics and passing database suite.
- `lint.log`, `test-web.log`, `test-operations.log`, `build.log`: final resumed
  stage logs, written after each stage finishes; see final results below.
- `fixture.js`, `fixture.css`, `sample.pdf`: synthetic review build, not production
  bundle measurements or representative contract rendering.
- `screenshots/`: **no screenshots captured**. No screenshot paths can be supplied.

The browser host was unavailable. Computer Use subsequently stopped the review
because it could not determine Chrome's current URL confidently enough to enforce
its policy. No alternate automation bypass was attempted. The user identified and
stopped the temporary port-3316 server; it was not restarted in this follow-up.

No before/after performance baseline, production bundle delta or Web Vitals were
measured. Existing server/client boundaries and bounded queries remain in use;
there is no claimed measured performance improvement.

## Remaining A6 work and exit decision

1. Complete the authorized operational dashboard beyond rental-list summaries.
2. Validate role-aware navigation projection and its existing guarded, unapplied
   0026 draft against actual permission semantics; its presence is not acceptance
   or permission to deploy. This follow-up did not create or apply that draft.
3. Close whole-journey FR/AR copy/state coverage, including raw operational labels.
4. Execute complete deterministic account-to-contract-to-signing-to-delivery/
   archive/Sheets fixtures and subscription/platform recovery paths.
5. Restore an authorized browser surface; collect responsive, overflow, keyboard,
   reduced-motion, console and automated accessibility evidence and FR/AR mobile/
   desktop screenshots. Review mobile table alternatives and consequential dialogs.

**Local A6 exit: not satisfied.** Passing regression suites, when recorded, cannot
close the missing whole-journey and visual evidence or missing overview behavior.
Stop after this A6 checkpoint; no provider selection or deployment is authorized.

## Preserved blockers

Concrete signature-provider transport, independent trust/identity/certificate
verification, hosted signing and raw evidence handling remain unfinished code.
Concrete payment-provider transport, merchant verification, checkout/refunds/
cancellation/recurrence remain unfinished code, not configuration-only tasks.
Commercial catalog decisions, signature/fiscal legal review, Resend SMTP domain
verification, Google OAuth configuration, Arabic font and visual fidelity, native
DOCX conversion, native PostgreSQL concurrency, migration compatibility, managed
Auth/Storage, container/worker acceptance, backup restoration, independent hosting
provisioning and cross-tenant/full live browser acceptance remain open. No earlier
A1–A5 or production-readiness blocker is waived by A6 presentation work.

## Final resumed automated results

| Check | Final result | Evidence |
| --- | --- | --- |
| Workspace TypeScript | PASS, recovered before rerun | `verify.log`; final build also finished TypeScript successfully after corrections |
| Workspace lint | PASS, zero warnings | `lint.log` |
| Web regressions | PASS, 1,924 tests / 104 files | `test-web.log`; includes nine A6 boundary tests and two default-disabled auth tests |
| Database regressions | PASS, 737 tests / 28 files | `test.log`; disposable PGlite only, not rerun after presentation-only corrections |
| Operational tests | PASS, 8 tests | `test-operations.log`; offline tooling tests, no live workers/backups |
| Production build | PASS | `build.log`; optimized build, TypeScript, static generation and route manifest; no dotenv environments listed |
| Whitespace / script syntax | PASS | `git diff --check`, `node --check` on the two verification scripts |
| Review-server shutdown | Port 3316 not listening | User stopped the server; local `Get-NetTCPConnection` check returned no listener; no restart |
| Browser / screenshots / axe | BLOCKED / not executed | Computer Use URL-confidence restriction; screenshots directory remains empty |

The successful stages were resumed individually after recovering the initial log;
there was no final monolithic `npm run verify` rerun. The final resumed command
`node scripts/ui-review/verify.mjs lint test:web test:operations build` exited 0.
These checks do not substitute for the missing A6 journeys or visual acceptance.

## Remaining-implementation follow-up — 2026-11-26 UTC

### Implemented since the prior checkpoint

- `components/operational-{model,dashboard}.ts*` and
  `server/operational-dashboard.ts`: separate authorized operational feeds for
  active rentals, pickups/returns due before the exclusive 24-hour cutoff (including
  overdue items), drafts, latest contract modifications, agency signature/invitation
  actions, pending client signatures, pending/reconciliation finalization,
  failed/bounced/uncertain delivery and pending/processing/failed/paused/uncertain
  Sheets work. References link to existing contract pages and module workspaces.
- Observation time still comes from the corrected server clock. One timestamp is
  passed to all projections and displayed in UTC; no local-calendar-day assumption.
  “Recent activity” means contract modifications, not an invented audit feed.
- Every list is limited to 20 with deterministic ordering. Displayed counts are
  **counts of returned rows**, never whole-agency totals. No unbounded count or
  per-contract signature-query fan-out; at most four read RPCs. Different lists
  may overlap and must not be summed into business metrics. Expired signing
  sessions are excluded without mutating expiration or evidence on dashboard read.
- Per-module ready/error/restricted/unavailable states keep genuine zero results
  separate from failed or disabled integrations. The server revalidates canonical
  identity and selected agency before querying. A module failure cannot turn
  another module's data into fabricated zeroes or reveal raw diagnostics.
- The **existing guarded 0026 draft** was extended with the minimal read projection
  because the old signing list is unbounded and can expire sessions on read.
  Rental membership, signing designation/capability, delivery capability and
  Sheets view/manage checks remain authoritative. Only rental ID/reference/state/
  relevant timestamp are returned; no personal identity, document key, evidence,
  provider ID, payload or token. Sheets needs a new SELECT-only scoped policy on
  three job columns for the existing non-bypass writer role. No new draft number,
  data migration or deployment was created; 0026 is still guarded and unapplied.
- Navigation now recognizes Sheets manage authority and requires canonical owner
  role plus agency.manage for team/branding, matching A1. Existing onboarding and
  password-first authentication fixes remain in place.
- `maintenance/labels.ts` and the existing restricted workspace localize storage,
  schedule, incident, consumer and outcome labels. Unknown enum values receive
  an actionable generic description rather than a raw machine key. Key IDs remain
  isolated identifiers, not translated key material.

### Verification and manual review support

`server/operational-dashboard.test.tsx` covers disabled gates/no client creation,
foreign selected agency/canonical mismatch/denied access before querying, four
bounded allowlisted RPCs with identical agency/time, independent module errors,
malformed/oversized responses, FR/AR state labels and error redaction.
The existing composed `a1-workflows.test.ts` now exercises 0026 plus the dashboard:
cross-agency and role denial, minimal outputs, category bounds, exclusive 24-hour
pickup boundary and exclusion of a cancelled rental. It runs in disposable PGlite,
not a managed/native database. The first strengthened boundary assertion used an
already-cancelled fixture; it was corrected to the confirmed fixture while retaining
an explicit cancelled-contract exclusion assertion. No production rule was changed
to accommodate the test.

`scripts/ui-review/manual.mjs` creates a minimal inherited environment and starts
only the synthetic loopback server when the owner invokes it. `--build-only`
compiled the final fixtures and generated a populated Latin preview through the
real renderer **without starting a listener**. Direct unsafe server invocation is
refused. Added screens cover onboarding, invitations, detail/edit forms, populated
preview controls and agency signing. Vehicle fixture fields now match the actual
record schema; unknown status does not imply availability.

The [manual review guide](a6-manual-visual-review.md) gives exact PowerShell start,
shutdown, PID checks and port cleanup; available selectors/URLs, identities,
FR/AR/RTL/viewport/keyboard/reduced-motion/error checks, screenshot names and separate
visual/functional/accessibility gates. No automated browser interaction was retried,
no server was left running and no screenshot was fabricated.

### Remaining code and acceptance distinction

The previously identified missing **product dashboard projection/presentation and
navigation permission corrections are complete locally**. This does not prove the
full A6 implementation exit: the review fixture is intentionally a component
transport harness, not a complete persistent application simulation. Auth/session
creation, cross-screen persistence, arbitrary template uploads, historical evidence,
preview regeneration from edited fields and populated billing histories are not
fully emulated there. These fixture/verification gaps are recorded as such, not
reclassified as completed browser acceptance. Existing service/component and SQL
regressions cover their production boundaries separately. No new unrelated feature
is proposed to replace the application architecture.

Manual visual, responsive and accessibility review remains pending because the
Computer Use prerequisite is unresolved. Whole-journey acceptance must cover every
route in the guide and return discovered code defects to A6. No complete WCAG,
Arabic PDF fidelity, private-download, live tenant/MFA/provider or end-to-end browser
acceptance is inferred from the fixture build. **Full A6 exit remains unsatisfied;
whole-journey implementation completeness independently of visual acceptance is
not asserted from these partial fixture capabilities.** All earlier A3/A4/A5 and
commercial/legal/configuration/live/native blockers remain open.

### Latest targeted verification

| Check executed in this follow-up | Result / evidence |
| --- | --- |
| TypeScript, both workspaces | PASS, `.verification/a6/typecheck.log`; final build also type-checked final application source |
| Lint, both workspaces | PASS, zero warnings, `.verification/a6/lint.log` |
| Full web suite | PASS, **1,933 tests / 105 files**, `.verification/a6/test-web.log` |
| Composed A1–A6 SQL scenario | PASS, **1 extended integration test**, `.verification/a6/test-a6-sql.log`; final strengthened time/cancelled/role assertions included |
| Production build | PASS, `.verification/a6/build.log`; no framework environment-file list |
| Manual fixture build | PASS, `node scripts/ui-review/manual.mjs --build-only`; actual renderer produced synthetic populated `sample.pdf`; no listener started |
| Whitespace and launcher/server syntax | PASS, `git diff --check`, `node --check` on the launcher/server |
| Browser/axe/screenshots | Not run; safety stop respected; manual review pending |

The new server test file contains nine focused cases. Earlier **737 database /
8 operational tests** remain historical passing evidence for unaffected suites;
they were not rerun as complete suites in this follow-up. The composed SQL case
was rerun because guarded 0026 changed. Initial failed boundary-fixture and lint
attempts were corrected; the final stage logs above hold the successful reruns.

Additional source files modified/created in this follow-up:
`apps/web/src/{components/operational-model.ts,components/operational-dashboard.tsx,
server/operational-dashboard.ts,server/operational-dashboard.test.tsx,
app/[locale]/app/page.tsx,app/globals.css,maintenance/labels.ts,maintenance/workspace.tsx}`;
the existing guarded `supabase/migration-drafts/20261126002600_navigation_capabilities.sql`;
`packages/infrastructure/database/tests/a1-workflows.test.ts`;
`scripts/ui-review/{manual.mjs,serve.mjs,fixture.tsx,verify.mjs}`;
this report, the manual review guide and all four tracking documents.

The prior review server stayed stopped. Port 3316 had no listening connection when
checked; every fixture invocation in this follow-up used `--build-only` and exited.
No external provider, worker, real credential, environment file, migration apply,
feature activation, security-policy modification, commit, push or deployment was
performed. The owner can now start and stop the manual harness using the guide.


## V4.1 main-application integration — 2026-11-26

Owner-authorized batches I1–I7 are integrated locally: original Dusk landing and clearly simulated marketing demonstrations; real authentication and capability-aware Light Violet shell; actual agency switching/theme/language/search/notifications; six bounded operational KPIs, daily priorities before five visualizations and recent contracts/activity in a responsive 65/35 grid. Existing client/vehicle/rental, complete Studio, signing/delivery/archive, team/branding/Sheets/billing/platform screens share the approved tokens and shell while retaining authoritative handlers and gates. Rental filters/search/sort explicitly apply to the current server page. Agency/canonical-user changes replace client shell state.

See [integration report](v4.1-integration-report.md), [file manifest](v4.1-integration-files.json) and [manual acceptance](v4.1-manual-acceptance.md) for exact routes, verification evidence and limitations. No dependency installation, new migration draft, migration application, feature activation, real credential/provider access, commit, push or deployment. Existing source notices retained; owner-managed licensing questions are not declared resolved. The V4.1 reference remains unchanged.

This is a local implementation checkpoint only. A6 final visual/accessibility/responsive/browser acceptance remains **OPEN** under the retained Computer Use stop. No screenshots were generated or claimed. Authenticated whole-journey acceptance needs a separately authorized isolated synthetic backend. All P0–P12 scope and the previously recorded provider, assurance, document/DOCX/Arabic-font, infrastructure/restore, commercial/legal and live cross-tenant blockers remain open; no complete MVP production-readiness claim. Verification results are recorded in the linked report, without replacing prior evidence.
<!-- registration-onboarding-checkpoint-2026-11-27 -->
## Registration and agency onboarding checkpoint — 2026-11-27

Implemented locally: FR/AR personal registration fields and server validation, secure canonical profile seeding/settings, encrypted invitation continuation, a four-step saved agency wizard, atomic idempotent owner bootstrap, scoped agency administrative settings and future contract snapshot fields. Existing authentication, role authority, historical document versions and provider gates remain in place.

See [implementation and security report](registration-agency-onboarding.md) and [manual acceptance/restart instructions](registration-onboarding-manual-acceptance.md). Draft **0027** is guarded and unapplied. Final approved legal documents/versions are absent: registration remains unavailable rather than fabricating consent. A6 visual/authenticated acceptance, native PostgreSQL/managed backend concurrency and rollout verification, and all existing MVP production blockers remain open. No migration, provider activation, installation, commit, push or deployment.

