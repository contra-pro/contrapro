# Offline rental-create HTTP handler factory

`apps/web/src/rentals/http.ts` exports an isolated, server-only handler factory.
**No route.ts, public endpoint, authentication integration or real port adapter was
added. Production Migration / Deployment remains NO-GO.** Tests use native Request,
Response and ReadableStream objects without listening on any network port.

## Request and dependency contract

```ts
createRentalHttpHandler({ origin, resolveContext, port }):
  (request: Request) => Promise<Response>
```

All dependencies are required. Invalid/missing factory dependencies throw the fixed
RENTAL_HTTP_CONFIGURATION_INVALID error. There is no environment lookup, permissive
resolver, selected default agency or generated request key. The existing pure
appOrigin helper validates the explicit configured origin (HTTPS, or supported
loopback HTTP); importing it does not invoke authentication/provider configuration.

The resolver interface is:

```ts
resolveContext(request: Request): Promise<RentalCreateContext | null>
// RentalCreateContext = Readonly<{ agencyId: string; creationKey: string }>
```

The resolver runs only after method/origin/media/body-byte/UTF-8 checks. Request body
is already consumed; it must use independent trusted server context, not body parsing.
The eventual resolver must establish genuine authentication/canonical identity and
appropriately validate agency selection/key provenance. A client agency header is
not evidence. The handler never copies x-agency-id, idempotency-key, forwarding
headers or JSON agency/key fields into trusted context. Tests supply fixed synthetic
context only, and do not authenticate anyone. A dishonest resolver remains outside
what structural validation can detect.

Accepted request:

- POST with URL origin and mandatory Origin header both exactly matching the
  configured origin. No host/forwarded-header inference or localhost/127.0.0.1 swap.
- Content-Type application/json, case-insensitive, optionally one charset=utf-8
  parameter (quoted or unquoted). Other parameters/charsets reject.
- Content-Encoding absent or identity only; no decompression is attempted.
- Raw body is the existing flat rental-create business JSON, not an action/data
  wrapper. Agency and creation key are separate resolver context. Duplicate keys,
  exact numeric values and business fields are checked by the existing service.

Origin checking follows existing local agency/client POST conventions. It is an
origin/CSRF boundary, not identity verification. No CORS enablement or preflight
support is added; browser same-origin credentials do not imply authorization.

## Bounded decoding

Actual stream bytes are counted against rentalJsonMaxBytes = 32,768 before domain
parsing, independently of Content-Length. Bytes exceeding the cap are not decoded
or accumulated. UTF-8 decoding is fatal and streaming, so split multibyte sequences
are preserved while malformed/overlong/surrogate encodings and truncated endings
reject. ignoreBOM:true deliberately preserves a BOM for JSON rejection.

Missing, consumed/locked or failed body streams yield invalid-input. On read/size/
decode failure, cancellation is attempted and its errors are suppressed so they
cannot replace the primary sanitized failure. Reader locks are released. No raw
decoder/stream exception message reaches the response.

This bounds stored/parsed body size, not all platform resource use. A single already
allocated incoming chunk may exceed the limit before inspection. There is no new
wall-clock body-read/resolver/port timeout, abort controller or maximum chunk count;
a never-settling source/dependency can leave a call pending. Real deployment needs
server timeout/cancellation/rate-limit policy separately. No automatic retry occurs.

## Stable HTTP response mapping

| Condition | Status | JSON body |
|---|---|---|
| Validated original creation receipt | 200 | Service success: {ok:true,value:{id,version:1,state:brouillon,number:null}} |
| Invalid JSON/business fields | 400 | Service invalid-input result with fixed structured errors |
| Malformed UTF-8/body stream | 400 | {ok:false,code:invalid-input} |
| Unsupported method | 405 | {ok:false,code:method-not-allowed}; Allow: POST; HEAD has no response body |
| Origin mismatch/missing | 403 | {ok:false,code:forbidden} |
| Unsupported media type/encoding | 415 | {ok:false,code:unsupported-media-type} |
| Actual body exceeds 32 KiB | 413 | {ok:false,code:too-large} |
| Resolver returns no/invalid context | 403 | {ok:false,code:forbidden}; no port call |
| Resolver throws | 503 | {ok:false,code:unavailable}; no port call |
| Encoder UTC range rejection | 400 | Service out-of-range result with fixed structured errors |
| Explicit SQL 42501 / 40001 / 22023 port rejection | 403 / 409 / 400 | forbidden / conflict / invalid, respectively |
| Thrown transport, malformed RPC output, unknown outcome | 503 | {ok:false,code:uncertain} |

200 is used for both original creation and replay because the RPC receipt does not
distinguish them. No 201/new-record claim is invented. All responses carry private,
no-store cache control, Referrer-Policy:no-referrer and X-Content-Type-Options:nosniff.
No cookies, redirects, stack traces, raw payloads, SQLSTATE text or database details
are emitted. The handler logs nothing. Codes and field errors are fixed labels.

## Retrying and trust limitations

Exactly one service attempt per accepted handler invocation. An explicit later
request can reuse a key only if the trusted resolver returns the original key and
context. The handler neither rotates nor stores keys. The caller must also retain
the same business payload; a future trusted key resolver must not silently generate
a fresh key for uncertain retries.

A syntactically valid context is not membership or authorization. A fake HTTP 200
proves orchestration/response validation only, not real persistence, deduplication,
tenant isolation, availability or database transaction safety. Existing strict
timestamp, bounded-UTC encoder and PostgreSQL JSONB-size limitations remain.

## Verification

```text
npm run test --workspace=@contratpro/web -- src/rentals
npx --no-install tsc --project apps/web/tsconfig.json --noEmit --incremental false
npx --no-install eslint --config apps/web/eslint.config.mjs apps/web/src/rentals/http.ts apps/web/src/rentals/http.test.ts --max-warnings=0
git diff --check
```

410 rental tests passed across eight files, including 51 HTTP tests. TypeScript
passed. Targeted ESLint passed with the existing informational Next.js pages-directory
notice. Whitespace checks passed, including direct checks on the new files. The SQL
draft retained SHA-256
3c27bc2a11de4d13a8003b35aa16d5d733eaeaa3be86557167a6fb2967214b79.

## Next local task

**GO for offline Rental Creation UI development using fake transport only.** Keep
the server-only factory out of browser bundles and inject a separate UI transport
double. Preserve mounted-draft identity and explicit-retry keys; do not add a real
route, real auth resolver, live RPC port or feature flag activation as part of that
UI task. Production remains NO-GO.
