# C1 configuration and live integration acceptance

This is a future operator checklist, not permission to access Supabase, Resend, Google or a production VPS. No live service acceptance occurred in C1. B2 payments, B3 plans/pricing/limits and B4 final legal validation remain deferred by the owner and must return before commercial launch. B1 internal simple signing is the selected local implementation; external signature providers remain optional and deferred.

## C2 — exact next infrastructure/worker steps

1. Obtain separate approval for a dedicated non-production infrastructure target and a synthetic backend. Do **not** use the existing production Hostinger/Coolify VPS. Inventory approved host/origin, TLS termination, ingress, resource limits, database target and private storage. Reuse `deploy/` artifacts; do not buy services or deploy as part of C1.
2. Review the existing bootstrap/foundation executor restrictions, native roles/default ACLs, guarded local drafts through 0028 and migration order. Prepare an explicitly reviewed target/manifest/rollback plan. Do not strip guards or run drafts against managed Supabase from these instructions. C1 adds no migration.
3. Provision server secrets through approved secret stores, separated by web/worker scope using [the matrix](c1-environment-configuration-matrix.md). Confirm public build variables contain no server keys. Check origins/callbacks without printing secret values. Keep gates closed until corresponding acceptance is signed off.
4. Verify private buckets and exact object policies, isolated converter/font assets, backend-only guest storage access, audit retention and backup inventory. Run native cross-tenant/owner/role tests and restore drills on the approved isolated target. Agree privacy/retention before holding real signatures or recipients.
5. Configure an approved sending domain and its ownership/DNS/authentication in the chosen provider account. Validate sender/reply-to and the Resend API/webhook scope. Configure Supabase custom SMTP and its Site URL/redirect list separately; do not store SMTP credentials in client variables.
6. Install `supabase/templates/confirmation.html` and `recovery.html` in Supabase Auth only after review. They are bilingual technical messages. Keep `{{ .ConfirmationURL }}`, confirmation requirements, PKCE, expiry/rate controls and flow cookies. Allow the exact approved FR/AR `/{locale}/auth/password-callback` and existing `/{locale}/auth/callback` paths with generated flow parameters. Do not use broad arbitrary redirect destinations or invent a domain.
7. Register Google Sheets OAuth as a separate integration from Supabase Google sign-in. Configure exact approved `/{locale}/app/sheets/callback` URLs for `fr` and `ar`. Default created-file mode requests `drive.file`; existing-file mode explicitly requests `spreadsheets`. Do not add broad Drive scopes. Review consent/test users and approvals without making OAuth requests in C1.
8. Configure the existing maintenance worker with HTTPS origin, distinct access bearer/gateway keys, concurrency initially 1, bounded poll/backoff and graceful shutdown. The established launch entry is `node scripts/maintenance-worker.mjs` **only after C2 authorization and secret/gate readiness**. Verify authenticated `/api/internal/maintenance/run`, readiness and status. Disabled task gates must yield disabled, without provider dispatch.
9. In that approved target, exercise the email and Sheets cases below. Start with synthetic identities and controlled recipient accounts. Measure retries, queue age, ambiguous outcomes, lease recovery and shutdown draining. Confirm no secret/recipient/token payloads in logs. Review backup/restore, key inventory/rotation and deployment rollback.
10. Record live evidence and owner approval separately from local test counts. Only then consider activation of the individually accepted features. Commercial/legal decisions, production registration release and A6 visual/authenticated acceptance remain independent blockers.

## Email cases

- Confirmation/recovery in FR/AR: real delivery via Supabase custom SMTP, secure one-use callback, signed recovery flow, no signup until actual approved legal release exists. Auth email is owned by Supabase Auth, not a second application outbox pretending to confirm users.
- Team invitation: canonical membership/email verification; encrypted durable queue, actual invitation expiry and acceptance; no email sent automatically before the explicit existing action.
- Client signature invitation/reminder: agency first, current invitation only, email link distinct from manual code channel. **Verification codes are not sent by Resend**; existing architecture uses manual WhatsApp/out-of-band codes and refuses link+code in the same material/channel. No SMS provider is installed. Test an agreed separate channel and its assurance limitations.
- Final document: both parties' existing delivery paths, exact checksum, expiring/revocable grant, agency notification and archive access. Dashboard operational notifications remain in-app; no claim of blanket email notification coverage.
- Recovery: authenticated raw Svix webhook, five-minute timestamp window, replay/conflicting-body rejection in durable SQL, wrong secret, tagged correlation after lost response and no automatic resend of unknown outcomes. Manual WhatsApp actions must never assert provider-confirmed delivery.

## Google Sheets cases

- Authorize each agency separately; reject foreign agency, mismatched/used/expired state, wrong locale/cookie and redirect injection. Confirm encrypted tokens and agency/revision AAD, refresh fencing, rotation and disconnect.
- A failed or ambiguous refresh retains the established fail-safe reconnect policy. Do not replay a potentially rotated refresh token or fabricate a healthy connection.
- Select/create a dedicated spreadsheet/worksheet and mapping; retain explicit personal-data selection and formula-injection protection. Reject unrelated sheets, altered headers, duplicate visible IDs/metadata, formulas and oversized scans. Do not overwrite foreign data.
- Click **Créer le contrat**: contract creation must succeed independently of external Google availability; the existing durable initial projection schedules export. Later contract/signature versions update the same logical row. Prove retry/lost-response reconciliation does not append twice and that higher sequence is not overwritten by stale work.
- Verify history, authorized retry/reconciliation/manual resync, destination revision changes and disconnect/revocation. For an absent row after an ambiguous write, quarantine rather than guess that a retry is safe.

## Isolated registration acceptance now available

From `C:\Users\lenovo\contratpro`, run only local isolated checks:

```powershell
& 'C:/Users/lenovo/AppData/Roaming/npm/node_modules/lean-ctx-bin/bin/lean-ctx.exe' -c "node scripts/v41-integration/c1-verify.mjs acceptance"
& 'C:/Users/lenovo/AppData/Roaming/npm/node_modules/lean-ctx-bin/bin/lean-ctx.exe' -c "node scripts/v41-integration/c1-verify.mjs database"
```

The test-support factory requires actual `NODE_ENV=test`, Vitest and the immutable isolation-preload marker. Synthetic document versions are conspicuously named `SYNTHETIC-C1-*` and injected only into test dependencies. Production handlers never import the factory and keep `approvedLegalRelease=null`. No synthetic HTTP identity, signup route bypass or managed acceptance record exists. The suite exercises registration, confirmation/recovery callbacks, canonical profile provisioning, saved onboarding, existing membership/invitation continuation and legal-version SQL behavior using injected transports or disposable PGlite. This is automated acceptance support, **not** an authenticated manual browser environment or a legal approval.
