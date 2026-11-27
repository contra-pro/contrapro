# C1 environment configuration contract

No real environment file was read, copied or changed. Values below are variable names and deliberately unusable placeholders. No flag was enabled. `R` means required **only when that feature is separately authorized for activation**; `O` means optional. App and worker secrets belong in their respective server secret stores, never client variables or logs. This matrix does not authorize configuration or deployment.

| Variable | Purpose / feature | Environment | Required | Secret | Activation prerequisites |
|---|---|---|---|---|---|
| `CONTRATPRO_APP_ORIGIN` | Exact public origin / auth, delivery, callbacks | web/worker | R | No | Approved HTTPS origin, no path, credentials, query or trailing slash; localhost is review-only |
| `NEXT_PUBLIC_SUPABASE_URL` | Pinned project URL / Auth, gateway | web build/server | R | No | Must equal existing `AUTH_PROJECT_URL`; no arbitrary backend substitution |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public SDK key | web build/server | R | No | Publishable key or classified legacy anon key; never service-role key |
| `CONTRATPRO_AUTH_FLOW_SECRET` | Recovery, signup receipt, invitation continuation HMAC/encryption | web server | R | Yes | Independent 32–512 character secret, secure cookies and callback acceptance |
| `CONTRATPRO_AUTH_ACCESS_VERIFIED` | Canonical tenant context gate | web | R | No | Verified Auth issuer/session and RLS acceptance |
| `CONTRATPRO_CANONICAL_PROVISIONING_VERIFIED` | Explicit canonical provisioning gate | web | R | No | Reviewed provisioning RPC and same-subject tests |
| `CONTRATPRO_GOOGLE_AUTH_ENABLED` | Optional Supabase Google sign-in | web | O | No | Separately configured Supabase provider; unrelated to Sheets OAuth; remains off |
| `CONTRATPRO_A1_VERIFIED` | Agency/team/onboarding operations gate | web | R | No | Reviewed agency operations migration and authority checks |
| `CONTRATPRO_AGENCY_OPERATIONS_SECRET` | Authenticated agency operation gateway | web server | R | Yes | Independent 64 lowercase hex; database gateway key provisioned separately |
| `CONTRATPRO_AGENCY_WRITES_VERIFIED` | Existing agency writes gate | web | R | No | Existing canonical self/owner write acceptance |
| `CONTRATPRO_DOCUMENTS_VERIFIED` | Contract generation gate | web/worker | R | No | Exact immutable version/storage/renderer acceptance |
| `CONTRATPRO_DOCUMENT_RENDERER_SECRET` | Generation renderer binding | web/worker | R | Yes | Independent secret matching existing renderer contract |
| `CONTRATPRO_DOCUMENT_FONT_PATH` | Local font bytes / FR/AR PDF | web/worker filesystem | R for Arabic | No | Approved licensed font, identical pinned bytes for generation/recovery |
| `CONTRATPRO_DOCX_IMAGE` | Existing DOCX conversion image | worker | O | No | Reviewed digest-pinned image; container/Arabic layout acceptance |
| `CONTRATPRO_SIGNING_VERIFIED` | Internal signature gate | web/worker | R | No | B1 legal/native/managed acceptance and guarded drafts reviewed |
| `CONTRATPRO_SIGNING_SECRET` | Signing gateway / invitation derivation | web/worker | R | Yes | Independent 64 lowercase hex, protected gateway setup |
| `CONTRATPRO_SIGNING_STORAGE_SERVICE_KEY` | Server-mediated guest private file access | web/worker server | R for guest files | Yes | Least-privilege storage review; never expose to browser |
| `CONTRATPRO_DELIVERY_VERIFIED` | Durable delivery gate | web/worker | R | No | Outbox, ACL, leases, encryption and recovery accepted |
| `CONTRATPRO_DELIVERY_GATEWAY_SECRET` | Delivery RPC MAC | web/worker | R | Yes | Independent 64 lowercase hex |
| `CONTRATPRO_DELIVERY_ENCRYPTION_KEY` | Encrypted recipient/link payloads | web/worker | R | Yes | Independent 64 lowercase hex; key inventory accepted |
| `CONTRATPRO_DELIVERY_DERIVATION_KEY` | Stable job identity/intent | web/worker | R | Yes | Independent 64 lowercase hex; do not rotate as an ordinary encryption key |
| `CONTRATPRO_DELIVERY_KEY_ID` | Active encryption key identifier | web/worker | O (`v1`) | No | Must identify the active key consistently |
| `CONTRATPRO_DELIVERY_HISTORICAL_KEYS` | Retained decryption keys JSON | web/worker | O (`{}`) | Yes | Retain referenced keys until inventory/rotation CAS confirms safe retirement |
| `CONTRATPRO_RESEND_VERIFIED` | Email transport gate | web/worker | R | No | Verified domain, sender, API/webhook and live acceptance |
| `CONTRATPRO_RESEND_API_KEY` | Resend API credential | worker/server | R | Yes | `re_` format; scoped real credential supplied by owner/operator |
| `CONTRATPRO_EMAIL_FROM` | Transactional sender address | worker/server | R | No | Verified owned sending domain; `@resend.dev` refused |
| `CONTRATPRO_EMAIL_REPLY_TO` | Optional default reply-to | worker/server | O | No | Valid monitored address; agency reply-to remains context scoped |
| `CONTRATPRO_RESEND_WEBHOOK_SECRETS` | Comma-separated authenticated webhook keys | web server | R | Yes | Svix `whsec_` keys, rotation overlap, raw-body verification and durable replay tests |
| `CONTRATPRO_A3_VERIFIED` | Reminder/recovery/correlation extensions | web/worker | R for A3 | No | Reviewed 0023 and actual delivery recovery acceptance |
| `CONTRATPRO_SHEETS_VERIFIED` | Sheets integration gate | web/worker | R | No | OAuth, leases, dedicated destination and tenant acceptance |
| `CONTRATPRO_GOOGLE_CLIENT_ID` | Sheets OAuth client | web/worker server | R | No | Approved OAuth app, consent screen, exact FR/AR callbacks |
| `CONTRATPRO_GOOGLE_CLIENT_SECRET` | Sheets code/refresh exchange | web/worker server | R | Yes | Approved secret; no client-side exposure |
| `CONTRATPRO_SHEETS_GATEWAY_SECRET` | Sheets RPC MAC | web/worker | R | Yes | Independent 64 lowercase hex |
| `CONTRATPRO_SHEETS_ENCRYPTION_KEY` | OAuth state/credential encryption | web/worker | R | Yes | Independent 64 lowercase hex, agency/revision AAD |
| `CONTRATPRO_SHEETS_KEY_ID` | Active Sheets encryption key ID | web/worker | O (`v1`) | No | Same active key ID across consumers |
| `CONTRATPRO_SHEETS_HISTORICAL_KEYS` | Prior Sheets decryption keys JSON | web/worker | O (`{}`) | Yes | Bounded key ring; retain referenced keys |
| `CONTRATPRO_A4_VERIFIED` | Sheets history/resync/creation recovery extensions | web/worker | R for A4 | No | Reviewed 0024 and creation uncertainty acceptance |
| `CONTRATPRO_A5_VERIFIED` | Maintenance scheduler / operational routes gate | web/worker | R | No | Reviewed 0025, independent worker authority and hosting acceptance |
| `CONTRATPRO_MAINTENANCE_GATEWAY_SECRET` | Maintenance RPC MAC | web server | R | Yes | Independent from worker HTTP bearer |
| `CONTRATPRO_MAINTENANCE_ACCESS_SECRET` | Internal worker HTTP bearer | web/worker | R | Yes | 64 lowercase hex; distinct from gateway key |
| `CONTRATPRO_WORKER_ORIGIN` | Exact internal application origin | worker | R | No | HTTPS in production; approved isolated host, never existing production VPS for testing |
| `CONTRATPRO_WORKER_CONCURRENCY` | Worker lanes | worker | O (`1`) | No | Integer 1–8, capacity review and single authority/lease handling |
| `CONTRATPRO_WORKER_POLL_MS` | Poll interval | worker | O (`5000`) | No | Integer 1000–60000, existing bounded backoff |
| `CONTRATPRO_STORAGE_CLEANUP_VERIFIED` | Destructive private storage cleanup gate | web/worker | O | No | Reviewed retention, fenced exact-object deletion and restore drill; stays off |
| `CONTRATPRO_MAINTENANCE_STORAGE_SERVICE_KEY` | Fenced private object cleanup | web server | R only for cleanup | Yes | Backend-only scope review and explicit cleanup approval |
| `CONTRATPRO_DEV_AUTH_PROBE` | Existing development diagnostic route | development only | O | No | Never enable as production authentication or identity bypass |

Private buckets (`contract-documents` and existing private branding storage) use the current scoped repositories and Storage policies; there is no public-bucket fallback or browser service credential. The application uses Auth/gateway RPCs, not a generic browser database URL.

## Database executor configuration — separate from app runtime

The existing migration executor remains development-target-only and deliberately fail closed. Do not substitute a new production `DATABASE_URL` or bypass pinned target/CA/manifest checks. No executor is run in C1.

| Variable | Purpose | Environment | Required | Secret | Prerequisite |
|---|---|---|---|---|---|
| `CONTRATPRO_MIGRATION_ENVIRONMENT` | Target stage (`development` only) | authorized executor | R | No | Separate approved development target |
| `CONTRATPRO_MIGRATION_CONNECTION_MODE` | Session pooler mode | executor | R | No | Must be `session` |
| `CONTRATPRO_MIGRATION_TARGET_ID` | Exact target confirmation | executor | R | No | Must match explicit CLI confirmation |
| `CONTRATPRO_MIGRATION_DATABASE` | Pinned database identity | executor | R | No | Match approved target |
| `CONTRATPRO_MIGRATION_LOGIN` | Administrative migration login | executor | R | Sensitive | Separate from runtime roles |
| `CONTRATPRO_MIGRATION_JOURNAL_OWNER` | Control journal owner | executor | R | No | Exact owner/ACL review |
| `CONTRATPRO_MIGRATION_DATABASE_OID` | Pinned database OID | executor | R | No | Verified native target identity |
| `CONTRATPRO_MIGRATION_SERVER_PORT` | Expected server port | executor | R | No | Exact target check |
| `CONTRATPRO_MIGRATION_SERVER_ADDRESS` | Expected native address | executor | R | No | Exact IP identity |
| `CONTRATPRO_MIGRATION_PLAN_SHA256` | Approved plan hash | executor | R | No | Reviewed immutable manifest |
| `CONTRATPRO_MIGRATION_URL` | Authenticated PostgreSQL URL | executor only | R | Yes | Pinned session host/user, TLS and approved login |
| `CONTRATPRO_MIGRATION_CA_FILE` | CA certificate path | executor | R | No | Valid trusted CA; TLS verification never disabled |

## Supabase custom SMTP — provider dashboard contract, not new app variables

Configure host, TLS mode/port, SMTP user/password, sender address/name, Site URL and exact redirect allowlist in Supabase Auth. Obtain SMTP values from the selected approved provider account; do not assume the Resend API key can be placed in an arbitrary SMTP field. SMTP secrets stay in that provider configuration. Enable email confirmation, keep PKCE flows and existing recovery callback checks, configure rate/expiry policies, and install the technical bilingual templates from `supabase/templates/confirmation.html` and `recovery.html`. They preserve `{{ .ConfirmationURL }}` and make no legal claims. No dashboard change occurred.

## Deliberately nonfunctional examples

```text
CONTRATPRO_APP_ORIGIN=<APPROVED_HTTPS_ORIGIN>
CONTRATPRO_EMAIL_FROM=<VERIFIED_SENDER_ADDRESS>
CONTRATPRO_GOOGLE_CLIENT_ID=<APPROVED_OAUTH_CLIENT_ID>
CONTRATPRO_GOOGLE_CLIENT_SECRET=<SERVER_SECRET_REFERENCE>
CONTRATPRO_RESEND_API_KEY=<SERVER_SECRET_REFERENCE>
CONTRATPRO_SHEETS_VERIFIED=false
CONTRATPRO_DELIVERY_VERIFIED=false
CONTRATPRO_RESEND_VERIFIED=false
CONTRATPRO_A5_VERIFIED=false
```

These are documentation placeholders, not usable values or an environment file. No synthetic legal release variable exists. Production registration still requires actual approved documents, which remain deferred. Test fixtures are injected only by the isolated test-support factory and never configured as a production fallback.
