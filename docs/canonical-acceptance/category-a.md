# Category A operator handoff (not executed)

Only A01 and A02 are implemented by `scripts/canonical-category-a-observer.mjs`.
It extends `collectCase`; importing/constructing it performs no I/O. The observer
has no default fetch, credential discovery, SDK, login or token refresh.
`scripts/run-canonical-a01.mjs` is the explicit operator-only A01 transport wiring.
No live acceptance result is established by its offline tests.

## A01 immediate operator command

For independent no-RPC evidence, use the instrumented-server restart and bounded
rerun in [a01-no-rpc.md](a01-no-rpc.md). The prior HTTP PASS cannot be retrospectively
upgraded using a boolean assertion. The uninstrumented command below still runs
only HTTP checks and intentionally remains UNVERIFIED.

Local preparation found `CONTRATPRO_APP_ORIGIN=http://localhost:3000` and the pinned
Development Supabase URL in `apps/web/.env.local`. No local env file examined sets
the provisioning flag; it is also absent from the inspecting PowerShell process.
The reviewed handler enables it only on exact string `true`, so these local inputs
are OFF. **No listener on ports 3000–3010 and no matching Next server process were
found during preparation.** There is no verified running Development origin or
effective server gate yet. Build artifacts are not running-process evidence.

After the operator has a running reviewed Development process at the configured
origin, confirms its effective provisioning gate is OFF, its target is the pinned
Development project, and the existing EXECUTE denial is preserved, run from the
workspace root (this command has NOT been executed during preparation):

```powershell
node scripts/run-canonical-a01.mjs --execute-a01 --origin http://localhost:3000 --confirm-local-development --confirm-provisioning-off --confirm-reviewed-artifact --confirm-execute-denied
```

These flags are explicit operator assertions, not automatic runtime verification.
The command performs A01 only, using the existing observer and `collectCase`.
It opens direct IPv4 loopback sockets, preserves Host `localhost:3000`, and does
not use DNS, proxy settings, cookies, credentials, redirects or retries. No remote
destination, A02, Supabase API or SQL request is supported by this runner.
The existing eight-request, 7/9/10-second request/observer/harness limits apply.

Without independent no-RPC evidence, successful HTTP checks return
`httpChecks:PASS`, `status:UNVERIFIED`, `noProvisioningRpc:UNVERIFIED`, exit 1.
This is intentional: do not convert eight expected HTTP responses into full A01
acceptance. `--no-rpc-evidence` boolean files have been removed: they cannot bind
proof to this execution window. Use `--trace-dir` with the independently instrumented
server described in the linked handoff. Complete trace evidence and successful HTTP
checks produce CONDITIONAL_OPERATOR_EVIDENCE (exit 0), never activation approval.

## Exact request allowlist

App origin O must be exactly `http://localhost:3000` or `http://127.0.0.1:3000`.
Paths have no query parameters. Requests are sequential; no automatic retries.

| Case / request | Method / path | Origin / body | Expected |
| --- | --- | --- | --- |
| A01 / 1 | POST /fr/auth/provision | O / empty | 503 blocked |
| A01 / 2 | POST /ar/auth/provision | O / empty | 503 blocked |
| A01 / 3 | POST /fr/auth/provision | https://invalid.example / empty | 403 forbidden |
| A01 / 4 | POST /ar/auth/provision | https://invalid.example / empty | 403 forbidden |
| A01 / 5 | POST /fr/auth/provision | absent / empty | 403 forbidden |
| A01 / 6 | POST /ar/auth/provision | O / `{}` | 400 invalid |
| A01 / 7 | GET /fr/auth/provision | absent / none | 405 |
| A01 / 8 | GET /ar/auth/provision | absent / none | 405 |
| A02 / 1, 2, 3 | GET https://gllsiklbvqpxzucvkehw.supabase.co/rest/v1/rpc/contratpro_auth_access | no Origin/body; existing A, B, U respectively | 200; exact self row A/B, empty array U |

A01 has no Authorization, cookies or API key. Only request 6 sets Content-Type:
application/json. Non-GET responses must contain exactly `{ok:false,code}` with
the expected fixed code. `invalid.example` is an Origin header, never a destination.
A02 sends only Accept: application/json, apikey: the operator-supplied Development
publishable key, and Authorization: Bearer (the corresponding existing session).
No provisioning RPC, Auth endpoint or database observer is called by the adapter.
The read RPC is STABLE SECURITY INVOKER SELECT-only in migration 0004 lines 52–68.

Both cases can run with provisioning OFF and provisioning EXECUTE denied. A01
needs no session; the gate rejection occurs before SDK construction. A02 bypasses
the application access gate only to exercise the existing authorized read RPC;
it does not change that gate or confer provisioning capability. A/B must have
active distinct canonical mappings and no memberships; U must already be unmapped.
Do not create U, refresh a token or log in to satisfy this preparation.

## Operator inputs and trust boundary

Before separately authorized execution supply these values in process memory:

- Exact Development project reference, pinned API URL above, selected loopback
  app origin and explicit environment `development`.
- Fresh independent confirmation that the running app artifact matches the reviewed
  handler, its provisioning gate is OFF, and authenticated provisioning EXECUTE is
  still denied. Config fields `artifactContractVerified`, `operatorTargetConfirmed`
  and `authenticatedExecuteDenied` must be true; `provisioningEnabled` false.
  These are operator assertions, not runtime attestations manufactured by the script.
- A reviewed injected `request(url, init)` transport that honors AbortSignal,
  performs exactly the requested request and retains native response URL/redirect
  metadata. No wrapper may follow redirects, retry, refresh, log headers or send
  extra requests. HTTPS uses normal trusted CA and hostname verification; no TLS
  overrides. The callback is trusted code, not sandboxed by the allowlist.
- For A02 only: `publicKey` in `sb_publishable_...` format (legacy keys deliberately
  unsupported), and `sessions: {A,B,U}`. Each session has `accessToken`, `subject`,
  `canonicalUserId` (null for U), `projectRef`, `isSynthetic:true`,
  `source:"operator-verified-existing-session"`, `verifiedAt`, `expiresAt`.
  Times are epoch milliseconds. Verification must be no more than 60 seconds old;
  expiry must be more than 10 seconds away before and after each read. Subjects
  must be distinct UUIDs; A/B canonical IDs must be distinct from all subjects.
  These must be existing independently server-verified synthetic sessions, never
  identities extracted from browser storage by this package. JWT decoding checks
  consistency only, not signatures. Claims must bind sub/issuer, authenticated
  audience/role, is_anonymous:false and matching exp. PostgREST verification remains
  a live requirement. Missing fresh evidence blocks A02; do not silently log in.
- A reviewed local `confirmEvidence({id,requestCount,signal})` callback returning
  exactly `{noProvisioningRpc:true}` for A01 or `{noDataChanges:true}` for A02,
  backed by independent scoped trace/baseline evidence. A 503 is not proof of no
  RPC and SELECT results are not proof of unchanged data. No default callback,
  SQL observer or fabricated always-true live assertion is provided. Any additional
  observer I/O needs its own explicitly bounded read-only authorization, outside
  the HTTP budgets here. Reuse accepted catalog evidence; do not repeat postflight.

Use the existing API after those prerequisites and separate authorization:
`createCategoryAObserver(operatorConfig, {request, confirmEvidence})`, then
`collectCase(plan, "A01", observer, {authorization:{projectRef:
"gllsiklbvqpxzucvkehw",environment:"development",category:"A"},timeoutMs:10000})`.
Invoke A02 separately only after reviewing A01; never automatically run all cases.
The authorization descriptor does not itself grant operator permission.

## Bounds, evidence and blockers

A01 budget is eight requests, A02 budget four (only three issued; no spare probe).
Each request <=7 seconds, each observer <=9 seconds, outer harness <=10 seconds.
Response bodies are bounded to 4096 bytes / 8192 bytes respectively. Redirects,
changed URLs, Location, Set-Cookie, unexpected status/body, missing evidence,
abort or expired session stop the case. Each case is single-use per observer;
there are no automatic retries. Omit credentials, cache and referrer on transport.
No raw requests, responses, IDs or errors are logged. Returned evidence is fixed
booleans; errors are only CATEGORY_A_BLOCKED (harness sanitizes further).
The A01 CLI prints only the fixed outcome report or A01_BLOCKED.

Local app configuration currently names `http://localhost:3000` and the exact
Development Supabase URL. Adapter configuration cannot select a different remote
API or remote app. This does not prove what a loopback process actually runs or
proxies: operator confirmation of its effective configuration is mandatory. No
Production destination is accepted, and no live target verification occurred here.

Live execution remains blocked until the operator authorizes the exact cases and
time window, confirms running-process/privilege evidence, supplies reviewed
transport and independent evidence callbacks, and provides the existing verified
A/B/U sessions for A02. If these are unavailable, run neither login nor fixture
creation: report missing evidence. B/C, gateway SECURITY DEFINER behavior and
activation remain outside Category A and require their separate acceptance steps.

## Offline verification

Commands run locally without live transports (all exit 0):

```powershell
node --test scripts/canonical-category-a-observer.test.mjs scripts/canonical-security-acceptance.test.mjs
npm run test --workspace=@contratpro/web -- src/auth src/agency src/clients src/components/dashboard.test.ts src/components/mvp-journey.test.ts src/components/agency-access-view.test.ts src/components/agency-management.test.ts src/components/clients.test.ts
npm run typecheck --workspaces
npm exec -- eslint --config apps/web/eslint.config.mjs --rule "@next/next/no-html-link-for-pages:off" scripts/canonical-category-a-observer.mjs scripts/canonical-category-a-observer.test.mjs --max-warnings=0
```

Results: 35 adapter + 15 existing harness tests pass; 435 application tests across
18 files pass; web/database TypeScript and targeted ESLint pass. The disabled Next
page-link lint rule applies only to these non-page Node scripts. No live request,
login, refresh, database access, activation or grant was performed.

A01 command-wiring follow-up (offline only), all exit 0:

```powershell
node --test scripts/run-canonical-a01.test.mjs scripts/canonical-category-a-observer.test.mjs scripts/canonical-security-acceptance.test.mjs
npm run typecheck --workspaces
npm exec -- eslint --config apps/web/eslint.config.mjs --rule "@next/next/no-html-link-for-pages:off" scripts/run-canonical-a01.mjs scripts/run-canonical-a01.test.mjs --max-warnings=0
```

56 tests pass (six command/transport tests plus the existing 50); web/database
TypeScript and targeted ESLint pass. No live transport invocation occurred. The
435 application-suite result above belongs to the preceding observer preparation;
that suite was not rerun for this standalone Node command wiring.
