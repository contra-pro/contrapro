# Offline rental creation UI

Production Migration / Deployment remains **NO-GO**. This is an isolated French-first
demonstration, not a production page, authenticated feature or persistence adapter.
No Next.js page/route, production navigation, SQL draft, environment flag or database
record was changed. Existing audit evidence is preserved.

## Components and injected boundaries

- `apps/web/src/rentals/rental-create-form.tsx`: standalone controlled React form.
- `apps/web/src/rentals/form.ts`: form-string/domain adapter, bigint MAD formatter
  and sanitized HTTP-result interpretation. No default fetch or fixture imports.
- `apps/web/src/rentals/rental-create-form.module.css`: scoped blue/slate styles
  using existing tokens, native controls, visible focus, 46px controls and responsive
  single-column layouts below 1000px/600px. No unrelated screen redesign.
- `apps/web/preview/rental-create/`: separate Vite shell and explicit synthetic
  client/vehicle fixtures. No real names, registrations or agency records are used.
  New files: index.html, main.tsx, preview.css and vite.config.mts.

Required form props: clients/vehicles (readonly `{id,label}` choices), an opaque
draftScope, newKey() and transport({body,creationKey}):Promise<Response>. The form
does not receive an editable agency, import a real HTTP endpoint or call fetch.
Fixtures, fake context and outcome controls belong only to the preview/test adapters.
Future trusted identity changes must change draftScope; it is not an authorization
proof and does not replace the server/database boundary.

The preview fake transport returns local Response objects by calling the existing
createRental application service with an injected fake port and synthetic context.
It is not a live HTTP/RPC call. The form integration test instead invokes the existing
HTTP factory in memory with fake dependencies, exercising its parsing/encoding and
receipt checks without starting a server or opening a connection.

## Local preview

From the repository root, using already installed tooling:

```powershell
npx --no-install vite --config apps/web/preview/rental-create/vite.config.mts
```

Open **http://127.0.0.1:4179/**. The server binds only to loopback and fails if the
port is occupied. Stop this preview with Ctrl+C. It does not use localhost:3000,
Next.js application routing, Supabase or its authentication session. Vite envDir is
the isolated preview directory; no application dotenv path is selected. HMR is off.
Filesystem serving is limited to preview/form/domain/application dependencies and
installed modules, excluding unrelated repository evidence/migration directories.

The shell's CSP disables connect-src and form-action, so the form cannot make a
business fetch/WebSocket or native form submission. Local asset module/CSS requests
still occur normally. No external fonts/images/services are used. Do not deploy or
publish the preview, or place real customer data into its synthetic fixtures.

Choose a fake client/vehicle, dates, times and applicable numeric offsets, then enter
MAD amounts (for example 350,00 and 1000). The preview offers explicitly labeled fake
success/conflict/response-loss scenarios. To test an uncertain retry, choose response
loss, submit, change only the simulated response scenario, then explicitly retry.
The original request body/key remain unchanged. Simulation success explicitly says
no contract was stored and never issues a contract number/signature.

## Input, arithmetic and lifecycle of the UI draft

Dates are combined with a text time (HH:MM or HH:MM:SS with up to six fractional
digits) and an explicit numeric offset. Minute-only times explicitly mean zero
seconds. Offset defaults to +01:00 as a visible editable choice; this is **not** an
automatic Africa/Casablanca timezone/DST resolution. The screen requires the operator
to verify both offsets. Named-zone gaps/folds remain unverified, as in the domain
contract. Strict timestamps and [start,end) ordering use existing domain helpers.

MAD amount fields accept nonnegative decimal strings, comma or dot, at most two
decimal places and no exponent/group separators. Blank deposit means zero. These
are UI entry conventions, not a change to raw JSON number support. Centimes are
constructed with bigint and converted only after proving safe integer size; the
existing validator/pricing calculator enforce actual business bounds. Price preview
uses integral minor units and exact elapsed 24-hour rounding. Deposit remains a
separate line; no combined total is sent as authoritative input.

On submit, selected IDs must still belong to the injected choices. The existing
validator validates the business payload. No agency/key/number/total is embedded
in the JSON body. The mounted key survives parent refreshes. A synchronous ref
prevents duplicate in-flight calls, not just a rendered disabled button.

Uncertain outcomes freeze fields and retain the exact body/key snapshot. Only an
explicit retry submits it again. No automatic retry, key rotation, background job,
availability assertion or optimistic saved state exists. Conflict/forbidden/success
states require an explicit new-demo-draft action to reset. A scope change remounts
the draft, clears values/key and ignores any late response for the old scope.

HTTP output is untrusted: success requires the expected 200 creation receipt;
unknown/malformed responses become uncertain. Only local French messages are shown,
never raw response messages or field values. Accessible labels, field-error links,
live feedback, native keyboard controls and focused outcome messages are included.

## Verification limits and next task

Unit/component tests cover form validation, choice membership, exact prices,
microsecond/offset handling, success/error/conflict/uncertainty, no automatic retry,
refresh/key preservation, synchronous in-flight protection, identity changes and
late responses. A throwing global fetch stub verifies no real fetch is used.

The isolated preview bundle can be built with the existing Vite tool. Its generic
"production build" wording means an optimized **local preview artifact**, not a
deployment. The standalone bundler warns that Next's use-client directive is not
preserved; all code in this preview is intentionally client-side.

Browser automation was unavailable (browser access host unavailable). Consequently
screenshots, actual layout/overflow at 320/768/1024/1440px, real keyboard traversal,
browser console/CSP behavior, screen-reader behavior and computed contrast remain
**NOT VERIFIED**. jsdom checks cover basic DOM labels/focusability/errors only;
configured media queries and a successful bundle are not visual/a11y certification.

Executed verification:

```text
npm run test --workspace=@contratpro/web -- src/rentals
npx --no-install tsc --project apps/web/tsconfig.json --noEmit --incremental false
npx --no-install eslint --config apps/web/eslint.config.mjs apps/web/src/rentals/form.ts apps/web/src/rentals/rental-create-form.tsx apps/web/src/rentals/rental-create-form.test.tsx apps/web/preview/rental-create/main.tsx apps/web/preview/rental-create/vite.config.mts --max-warnings=0
npx --no-install vite build --config apps/web/preview/rental-create/vite.config.mts --outDir C:/Users/lenovo/AppData/Local/Temp/contratpro-rental-ui-preview-ec2e2e21-6ac4-49ac-bd83-bcbdf75dac84
git diff --check
```

Results: 430 tests passed across nine rental files, including 20 new UI tests.
TypeScript, targeted lint and whitespace checks passed. Lint retains the existing
informational Next.js pages-directory notice. The standalone preview bundle built
successfully with the documented use-client warning. Generated build artifacts were
retained only in the named local temporary directory, not deployed or published.

Vite started successfully on loopback for the check. The owned process was verified
by its command line, stopped after verification, and port 4179 no longer listened.
A supplementary Invoke-WebRequest loopback asset probe was rejected by lean-ctx's
command allowlist; it was not retried or bypassed, and no allowlist/environment
configuration was changed. This does not establish rendered-browser behavior.
The SQL draft retained SHA-256
3c27bc2a11de4d13a8003b35aa16d5d733eaeaa3be86557167a6fb2967214b79.

Next MVP task: manually review the isolated preview at the listed breakpoints and
keyboard-only, then independently review mounted-draft/retry behavior. Any real
selector, authentication resolver, API route, authenticated RPC port or activation
needs separate work/authorization. Production remains NO-GO.
