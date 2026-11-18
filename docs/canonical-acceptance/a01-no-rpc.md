# A01 independent no-RPC evidence

The previous HTTP PASS remains valid as supplied, but **retrospective no-RPC
evidence is insufficient**. The previous runner had no execution correlation ID
or server outbound audit. The existing Next development access log is not an
outbound/RPC audit. No complete external gateway trace or exact previous execution
window was supplied. A missing RPC log line and EXECUTE denial do not prove absence
of an attempted RPC. Do not upgrade that run to PASS or repeat it without a monitor.

## Minimal instrumentation and scope

`scripts/a01-server-trace.cjs` is an explicitly enabled Node preload, not an
application route or permission change. No application source, gate, SDK contract,
middleware or database is changed. It is inactive unless CONTRATPRO_A01_OBSERVE=1.
It must start before the reviewed Next Development process. A production NODE_ENV
is refused. Per incoming correlated request it checks effective Development URL,
app origin, loopback Host, NODE_ENV=development and provisioning flag != true.
Unsafe settings terminate the request before the application handler. It never
sets those gates and cannot verify SQL privileges; reuse the accepted denial
evidence and operator confirmation without additional SQL.

The existing runner generates a fresh UUID and sequence headers 1–8, retaining
the same methods, bodies, Origins and eight-request budget. The preload observes
Node's incoming request event, covering framework-generated GET405 as well as POST.
AsyncLocalStorage associates outbound global fetch, native http/https request/get
attempts and native undici dispatch diagnostics with that request. Any outbound
event prevents confirmation, even if it is not a provisioning RPC or fails before
dispatch. Duplicate observations are conservative failures, not deduplicated away.
Unscoped outbound events from any preloaded process within the exact runner window
also reject confirmation, so lost async context is not silently treated as zero
egress. Unrelated Development network work can therefore conservatively block A01.
The reviewed Supabase server transport uses global fetch, so these observations
cover its RPC transport. This is not a sandbox or proof about arbitrary raw sockets,
other processes, custom unreviewed transports or activity after the defined window.

Server NDJSON records contain only boot UUID, run UUID, sequence, timestamp,
fixed path/method/status and safety boolean. No cookies, headers, bodies, JWTs,
URLs of outbound requests or driver errors are recorded. Each preloaded process
opens a new private trace file with exclusive creation in an operator-owned fresh
temporary directory; no project files are written. Protect that directory from
tampering. This local observer is independent of HTTP status assertions, not a
cryptographic remote attestation.

`a01-trace-evidence.mjs` requires exactly eight start/end pairs from one server boot,
matching the current unpredictable run UUID, sequence, methods, paths, statuses,
effective-safe checks and runner start/end timestamps. Missing, duplicate, stale,
truncated, mixed-process, unsafe or outbound records fail closed. The window is
runner start through the post-eighth-response trace snapshot, not indefinite server
uptime. Request finish is logged synchronously; the snapshot also rejects any
correlated outbound event recorded after finish and before snapshot. Legacy
`--no-rpc-evidence` boolean files are no longer accepted. Without --trace-dir,
HTTP success still remains UNVERIFIED.

## Exact next operator steps (NOT executed here)

Stop the existing operator-owned dev server normally before restarting it with
the monitor. Do not start a second server and accept port fallback. In a dedicated
PowerShell terminal at the workspace root, use this fresh trace directory. If it
already exists, STOP and choose a fresh UUID consistently in both commands:

```powershell
$a01Trace = Join-Path $env:TEMP 'contratpro-a01-08b6e9ac-7ef6-4a99-8972-c5d4af57e0a8'
if (Test-Path -LiteralPath $a01Trace) { throw 'Use a fresh trace directory' }
$null = New-Item -ItemType Directory -Path $a01Trace
$env:CONTRATPRO_A01_OBSERVE = '1'
$env:CONTRATPRO_A01_TRACE_DIR = $a01Trace
$env:NODE_OPTIONS = ($env:NODE_OPTIONS + ' --require=C:/Users/lenovo/contratpro/scripts/a01-server-trace.cjs').Trim()
npm run dev --workspace=@contratpro/web
```

This terminal is the instrumented server only. Confirm it is ready on port 3000,
effective provisioning is OFF, the reviewed Development artifact/configuration
is used, and accepted authenticated provisioning EXECUTE denial remains applicable.
Do not change any provisioning/auth gate or permission to make checks pass.
Then in a second, ordinary PowerShell terminal at the workspace root:

```powershell
node scripts/run-canonical-a01.mjs --execute-a01 --origin http://localhost:3000 --confirm-local-development --confirm-provisioning-off --confirm-reviewed-artifact --confirm-execute-denied --trace-dir "$env:TEMP\contratpro-a01-08b6e9ac-7ef6-4a99-8972-c5d4af57e0a8"
```

This is one bounded A01 rerun, no A02, login, refresh or additional HTTP probe.
Keep the original 7/9/10-second deadlines, no redirects and no retries. An un-warmed
Next dev server may time out: preserve the failed evidence, never automatically
retry or increase the bounds. The command emits a credential-free run/window and
CONDITIONAL_OPERATOR_EVIDENCE only when HTTP and independent trace checks succeed;
it never authorizes activation. Inspect and retain the trace with the result before
manual acceptance. No live PASS is claimed by this package.

Stop the dedicated server normally afterwards. Close its dedicated terminal to
discard the process-local preload settings; no gates or database grants require
restoration. Retain traces securely; no automatic cleanup/delete is performed.

## Offline verification and remaining blockers

Run only these offline checks during preparation:

```powershell
node --test scripts/a01-server-trace.test.mjs scripts/run-canonical-a01.test.mjs scripts/canonical-category-a-observer.test.mjs scripts/canonical-security-acceptance.test.mjs
npm run typecheck --workspaces
npm exec -- eslint --config apps/web/eslint.config.mjs --rule "@next/next/no-html-link-for-pages:off" scripts/a01-server-trace.cjs scripts/a01-trace-evidence.mjs scripts/a01-server-trace.test.mjs scripts/run-canonical-a01.mjs scripts/run-canonical-a01.test.mjs --max-warnings=0
```

Still required: operator-controlled instrumented Development server restart, fresh
protected trace directory, explicit A01 execution authorization, all eight correlated
live records with zero outbound observations and manual review of that evidence.
No retrospective proof, live RPC absence, SQL denial revalidation or A01 PASS has
been established offline.

Preparation results: 65 offline Node tests passed (nine monitor/trace tests plus
the existing 56), web/database TypeScript passed, and targeted ESLint passed.
An initial unsafe-response mock and CommonJS-specific lint issues were corrected;
the final runs have no failures. No live HTTP/SQL was executed during preparation.
