# A6 — product-owner manual visual review

This is a manual review of real React presentation components with synthetic
transports, not a deployment, real authentication session or live integration.
Automated browser interaction remains stopped by Computer Use's URL-confidence
restriction. Do not bypass that restriction or run another browser automation
technology. The product owner opens the local pages manually.

## Start and stop (PowerShell)

Run in a dedicated terminal, with the installed dependencies:

```powershell
Set-Location -LiteralPath 'C:\Users\lenovo\contratpro'
node .\scripts\ui-review\manual.mjs
```

Open **http://127.0.0.1:3316/viewer** manually. The launcher prints its PID and the
server PID. Keep this terminal open and retain those two numbers for cleanup.
Do not run `npm run dev`, `next dev` or `next start` for this review. Do not use
the old direct `serve.mjs` command; it now requires the isolated launcher.

The launcher supplies only Windows executable/temp environment variables and a
verification preload. Application/provider variables, ambient `NODE_OPTIONS`
and real credential files are excluded. The preload blocks `.env*` reads;
Next's server/framework environment loader is not imported. Esbuild bundles the
selected presentation components only. The server binds **127.0.0.1**, never a
LAN interface. CSP restricts browser resources to self/blob/data as applicable;
the fixture fetch adapter refuses external origins and handles application calls
in memory. Server POST requests are rejected. No Supabase, Storage, Google,
payment, signing or delivery provider is contacted. No real credentials are needed.

Stop using **Ctrl+C in the dedicated terminal**. Then verify:

```powershell
Get-NetTCPConnection -LocalPort 3316 -State Listen -ErrorAction SilentlyContinue
Get-Process -Id <printed-server-PID>,<printed-launcher-PID> -ErrorAction SilentlyContinue
```

Both commands should return no matching server/listener/process. If the listener
remains, identify it before stopping anything:

```powershell
$reviewListener = Get-NetTCPConnection -LocalPort 3316 -State Listen -ErrorAction SilentlyContinue
$reviewProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $($reviewListener.OwningProcess)"
$reviewProcess | Select-Object ProcessId,ParentProcessId,ExecutablePath,CommandLine
```

Only if the PID matches the printed server PID and the command line names
`C:\Users\lenovo\contratpro\scripts\ui-review\serve.mjs`, stop that exact PID:

```powershell
Stop-Process -Id <verified-server-PID>
```

If the printed launcher remains, verify its command line names this project's
`scripts\ui-review\manual.mjs`, then stop that exact PID as well. Repeat the two
cleanup checks. Never kill every Node process or an unrelated listener on 3316.

For a fixture compilation check **without any listener**, use:

```powershell
node .\scripts\ui-review\manual.mjs --build-only
```

No dependencies, lean-ctx settings or PowerShell execution policies are changed.

## Addresses and controls

- `/viewer`: screen, language, width and transport-state selectors. Choose values,
  then **Afficher**. **Mesurer** reports document overflow, unlabeled controls,
  runtime error events and request count from that iframe. These are simple
  diagnostics, not an axe or WCAG audit.
- `/matrix`: representative paired FR/AR iframes at 320, 375, 768, 1024, 1440 and
  1920px. **Mesurer les cadres** collects the same diagnostics.
- `/?screen=NAME&locale=fr&state=ready`: direct synthetic presentation. Replace
  `fr` with `ar`. Use these URLs or viewer selectors when changing screens;
  normal application deep links are not an emulated Next router.
- `/sample.pdf`: populated synthetic PDF generated with the actual document
  renderer, synthetic driver/vehicle/dates/amount and its non-final preview strip.
  It uses Latin fixture values and Helvetica. It is **not an official/signed
  document or evidence of Arabic rendering**.

Available screens: `dashboard`, `onboarding`, `invitation`, `clients`,
`client-form`, `client-detail`, `vehicles`, `vehicle-form`, `vehicle-detail`, `rental-create`, `draft`, `rental`,
`templates`, `preview`, `agency-signing`, `signing`, `delivery`, `archive`,
`sheets`, `team`, `branding`, `profile`, `settings`, `billing`, `platform`, `auth`.

Transport modes are `ready`, `empty`, `loading`, `error`, `conflict`, `uncertain`.
They affect mocked requests; screens with initial data can retain that data until
an action/refresh. `loading` deliberately leaves requests unresolved. Reload in
`ready` to recover. `conflict` and `uncertain` do not simulate a provider outcome.
Do not infer functionality from an unsupported mock action returning an error.
The dashboard also supports direct `state=restricted` and `state=unavailable`.

Synthetic identities: Agence Démonstration (Rabat), Nora Exemple,
`nora@example.invalid`, `+212600000000`, Dacia Sandero `0000-A-00`, contract
`CTR-2026-0042`. Agency ID ends in `000001`, rental `000002`, session `000003`,
client `000004`, vehicle `000005`, template `000006`, version `000007`, all under
the synthetic `90000000-0000-4000-8000-` UUID prefix. Observation time is
2026-11-26 09:00 UTC. None is real customer data. Use invented values only.

## Route-by-route review checklist

For **each row**, inspect French and Arabic/RTL, first at desktop width and then
375px. Use 320px for signing, forms and dense editors. Real application route names
in column two are a map for later acceptance, not permission to open a live app.

| Synthetic screen | Actual application journey | Expected visual / interaction review |
| --- | --- | --- |
| `auth` | `/sign-in` | Password fields, labels/errors, recovery/registration links; external auth absent by default. |
| `auth&auth=sign-up` | `/sign-up` | Password rules and confirmation, no account enumeration. Use direct URL below. |
| `auth&auth=forgot-password` | `/forgot-password` | Email validation and neutral recovery instructions. |
| `auth&auth=reset-password` | `/reset-password` | New password/confirmation, actionable validation. |
| `auth` with `status=confirmation-sent`, `expired-link`, `password-updated-session` | Confirmation/session states | Fixed localized status text, no sensitive diagnostics. Submission does not create a real Auth session. |
| `onboarding` | `/app/onboarding` | Agency form fields, optional identifiers, required-field feedback. |
| `invitation` | `/app/team/accept` | Synthetic fragment is removed; acceptance state and next destination. No real team membership created. |
| `dashboard` | `/app` | Bounded task lists, contract links, clear 24-hour UTC boundary, status counts scoped to displayed items; empty/error/restricted/setup distinct. |
| `clients`, `client-form`, `client-detail` | `/app/clients`, `/new`, `/[clientId]` | Search/paging, client/driver fields, identity minimization, editing/archive controls and validation. |
| `vehicles`, `vehicle-form`, `vehicle-detail` | `/app/vehicles`, `/new`, `/[vehicleId]` | Registration bidi, filters, form validation and archive controls; fixture status is unknown, with no availability guarantee. |
| `rental-create` | `/app/rentals/new` | Sections, choices, dates, exact prices, locations, draft language. Saving must not imply issuance/signature. |
| `draft`, `rental` | `/app/rentals/[rentalId]` | Lifecycle/accounting/document areas and authorized actions; error and stale state wording. Fixture mutations are not durable SQL acceptance. |
| `templates` | `/app/templates` | Library, upload controls, version/mapping/clause UI, localized mapping names, appendix limitation. Use synthetic files only. |
| `preview` | Draft PDF preview | Load saved configuration, generate/view/download controls, non-final marking and stale handling. Returned bytes are the fixed populated synthetic renderer fixture, not a newly captured snapshot of edited fields; Arabic fidelity requires separate document acceptance. |
| `agency-signing` | Agency signing in rental detail | Synthetic pending agency session, review/download, typed name and explicit consent, then invitation. No certification badge. Unsupported evidence/provider operations return unavailable. |
| `signing` | `/sign` | Mobile first; synthetic token, separate-code instructions, enter any synthetic 8-digit code such as `12345678`, then review/consent/name. Finalization/download are mocked; no legal or identity assurance inferred. |
| `delivery` | `/app/deliveries` / rental delivery | Uncertain email, channel separation, reminder/history/recovery controls; no copied-link or WhatsApp-opened delivery claim. |
| `archive` | `/app/archive` | Search, filters, pagination, private historical references and non-destructive language. |
| `sheets` | `/app/sheets` | Disconnected/disabled connection, pending job, one-way sync explanation, destination/recovery controls. No real OAuth or synchronization. |
| `team` | `/app/team` | Synthetic owner/member/signer display, role and invitation controls; no real invite email. |
| `branding`, `profile`, `settings` | Agency administration | Logo/profile/preferences forms, optional identifiers, unsaved changes and errors. |
| `billing` | `/app/billing` | No configured subscription/catalog: clear empty/setup state, no invented prices or checkout. Billing histories/manual submission require fixture/domain tests and later acceptance. |
| `platform` | `/platform` and maintenance | Explicit refresh loads synthetic operations, disabled schedules, absent backup attestation, uncertainty metrics and internal billing empty state. This fixture bypasses no real platform MFA because no real platform is used. |

Example direct registration URL:
`http://127.0.0.1:3316/?screen=auth&auth=sign-up&locale=ar&state=ready`.
To inspect expired confirmation copy add `&status=expired-link`. Use viewer locale
selection for full-page language changes; client signing has in-page language
buttons that retain its in-memory synthetic token. Language links in the shell
point to actual application route shapes and do not preserve fixture selectors.

## Responsive, keyboard and screenshot record

- Inspect 320, 375, 768, 1024, 1440 and 1920px. Distinguish iframe viewport width
  from the surrounding viewer's horizontal scroll. The **application document**
  must not overflow; a labeled table scroll region may scroll locally.
- Tab/Shift+Tab through language, navigation disclosure, inputs, actions and links.
  Check visible focus, logical RTL order, reachable primary actions and labels.
- Open any consequential native dialog available in the selected component;
  check cancel initially focused, Escape, trapped focus and focus restoration.
- Enable reduced motion in the browser/OS manually; verify controls still work.
- Review empty, loading, error, conflict and uncertain transports. Retry/reload
  must not claim unsupported success. Inspect the browser console manually.
- Save screenshots under `.verification/a6/screenshots/` with names such as
  `dashboard-fr-1440-ready.png`, `dashboard-ar-375-restricted.png`,
  `signing-ar-320-consent.png`, `preview-fr-1024-nonfinal.png`,
  `templates-ar-768-mapping.png`, `delivery-fr-375-uncertain.png`,
  `sheets-ar-1440-disconnected.png`, `team-fr-1024.png`,
  `billing-ar-375-unconfigured.png`, `platform-fr-1920-disabled.png`.
- Minimum screenshot set: auth FR/AR, dashboard FR/AR desktop/mobile, clients and
  vehicles mobile, rental form/detail, templates/mapping, preview, agency signing,
  client signing FR/AR at 320/375px, delivery uncertainty, archive, Sheets,
  team/branding/settings, billing and platform/operations. Include failures and
  focused keyboard states; screenshots are requested from the owner, not already
  captured artifacts.

Record screen/locale/width/state, expected/observed outcome, screenshot path,
console findings, keyboard results, and reproducible defect steps in a review log.
Do not mark every checklist row passing merely because the page renders.

## Separate acceptance gates

**Visual inspection:** typography, hierarchy, spacing, bidi and viewport behavior.
**Functional acceptance:** complete journeys with deterministic real handlers/SQL
and later authorized managed-backend/provider flows. The component fixture is
not a complete stateful emulation; authentication, details, historical PDF/evidence,
preview regeneration from edited values and full cross-screen persistence cannot be accepted here.
**Accessibility acceptance:** keyboard, screen-reader semantics/announcements,
contrast and automated axe checks where authorized. Screenshots alone prove none
of these. No WCAG compliance claim is made.

Actual Arabic shaping/font fidelity, native DOCX conversion, signing/provider
assurance, real Resend delivery/SMTP, Google OAuth/same-row behavior, payment/
merchant acceptance, MFA/cross-tenant/native concurrency, migration compatibility,
workers/containers/backup restore and infrastructure provisioning remain in the
existing A3/A4/A5 and D acceptance queues. This guide authorizes none of them.
