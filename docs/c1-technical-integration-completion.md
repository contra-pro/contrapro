# C1 — Technical integration completion

Owner decisions, 2026-11-27: B2 payment integration/provider choice, B3 commercial plans/pricing/limits and B4 final legal documents/qualification are deferred, retained in MVP scope and required before commercial launch. Existing billing and legal safeguards remain intact. B1 internal simple electronic signature is locally implemented; external signing providers are optional deferred extensions. These C1 decision labels supersede older queue labels where they differ.

## Reuse and completed local gaps

The implementation reuses Supabase Auth confirmation/recovery/session/redirect controls, A1 team invitations, A3 durable encrypted delivery and Resend authentication/reconciliation, A4 agency-scoped OAuth/Sheets and A5 bounded orchestration. No duplicate email queue, Google connection store, notification system or registration preview was created.

Completed in C1:

- Shared OAuth configuration validation now checks enabled state, canonical HTTPS origin, bounded nonempty credential fields, key format and encryption key-ring contract. Sheets service creation validates this contract before constructing clients or preparing external work.
- OAuth token exchange/revocation and Sheets API requests refuse redirects. Credentials cannot follow a provider redirect to another origin. Existing fixed provider endpoints, timeouts, failure classification and uncertain-write handling remain.
- Technical bilingual French/Arabic confirmation/recovery HTML templates preserve Supabase's generated confirmation URL. They contain no fabricated sending domain, credentials or final legal wording. Templates are local files, not installed provider configuration.
- Isolated test-only registration legal fixtures support real handler testing through dependency injection. The factory demands test runtime, Vitest and proof that the network/credential isolation preload ran; production/development, missing proof and spoofed test arguments in production are rejected. No production route imports it, no feature flag enables it and no managed synthetic legal records are written.
- New regression tests cover malformed configuration, refused credential redirects, production/isolation rejection, bilingual template URL safety, FR/AR signup with synthetic release and existing email/Sheets worker dispatch/materialization failure behavior.
- Configuration matrix, exact external setup/acceptance steps and C2 infrastructure sequence are documented. No database change was necessary; **no 0029 draft** was created.

## Email integration status

Auth email remains owned by Supabase Auth/custom SMTP. Team invitations, client signing invitations/reminders, final document delivery and agency completion notifications reuse encrypted durable jobs, stable idempotency, bounded worker attempts and authenticated webhook observations. Unknown provider outcomes remain quarantined/reconciled: no automatic resend was added. Operational dashboard notifications remain in-app rather than being relabeled as sent email.

Invitation link and verification code separation is unchanged. Resend intentionally refuses verification-code material; codes use the existing manual WhatsApp/out-of-band workflow, not paid SMS or a second secret in the invitation URL. Manual sharing is not confirmed delivery. Real domain verification, sender configuration, SMTP installation, API/webhook credentials and actual delivery remain external acceptance requirements.

## Sheets integration status

Existing agency OAuth state/PKCE/callback, encrypted refresh/access tokens, revision/AAD binding, least-scope modes, destination/mapping/status/history, same-row updates, retry/reconciliation/resync and disconnect are retained. Initial export is a durable projection of successful contract creation; the contract handler makes no Google request that could block creation. Existing SQL/injected transport tests cover initial export and subsequent signature status on one logical row.

An ambiguous refresh result deliberately requires reconnect because the refresh token may have rotated. C1 does not weaken that safeguard. An ambiguous Sheets write is quarantined; absence during reconciliation does not authorize another insert. Dedicated-sheet ownership/header checks, metadata/visible-ID agreement, RAW string values and personal-field selection remain mandatory. No real OAuth/Google request occurred.

## Configuration and worker readiness

See [environment matrix](c1-environment-configuration-matrix.md) for exact variable names, purposes, deployment scope, secret classification and activation prerequisites, including the separate pinned database executor contract. See [live/C2 acceptance](c1-live-integration-acceptance.md) for SMTP, Resend, callback, OAuth and worker steps. Flags are attestations/gates, not proof that a provider is configured; they remain closed.

The existing maintenance task dispatcher processes authorized delivery/reminders, materialization, Sheets export/reconciliation and other scoped tasks through their established workers. C1 adds injected dispatcher tests; it does not start a worker or alter bounded concurrency, shutdown, leases, backoff or secret handling.

## Modified files

- `apps/web/src/sheets/oauth.ts`, `runtime.ts`, `google.ts`, `configuration.test.ts`.
- `apps/web/src/registration/test-support/isolated-acceptance.ts`, `isolated-acceptance.test.ts`.
- `apps/web/src/auth/email-templates.test.ts`; `supabase/templates/confirmation.html`, `recovery.html`.
- `apps/web/src/maintenance/c1-orchestration.test.ts`.
- `scripts/ui-review/isolate.cjs`: adds a read-only test-proof marker after establishing existing protections; no network allowance or environment exclusion was removed.
- `scripts/v41-integration/c1-verify.mjs`; three C1 documents and the four MVP/scope/completion/production-readiness trackers.

Prior uncommitted integration changes remain in the worktree; its complete diff must not be attributed to C1.

## Verification and remaining limitations

Final local suites: **2,024 web tests / 120 files** (standalone, 81.06 seconds), **741 database tests / 30 files** and **8 operational tests** pass. TypeScript passes for both workspaces. The earlier focused checks passed 77 targeted tests and 109 acceptance tests; the final full suite additionally includes the last template/orchestration cases. A template test initially matched the letters `script` inside “inscription”; its assertion was corrected to detect executable HTML tags/attributes. No production behavior was changed to accommodate that test.

Final zero-warning ESLint across both workspaces, isolated production build and Git whitespace check pass. Owner build hashes remain unchanged. The session manager reported stopped; C1 started neither a review server nor a background worker. Existing React title-child warnings in rendering fixtures remain distinct from browser-console acceptance.

Logs: `.verification/c1/`. The runner uses the minimal isolated environment, excludes credential sources, blocks external sockets and builds into private `.next-auth-polish`, avoiding owner `.next` artifacts. Test flags and clients are local injections only. Production registration stays closed without actual approved legal releases.

Local mocked/disposable tests do not constitute Supabase/Storage/Resend/Google/native concurrency acceptance, real delivery, legal approval, infrastructure readiness or browser/visual acceptance. No real environment files, live connections, remote migrations, purchases, feature activation, installations, payment implementation, legal drafting, existing production VPS, commit, push or deployment were used. A6 and all retained MVP blockers remain open.

The known B1 Unicode observation remains relevant: the exhaustive unchanged scalar test timed out under parallel build/SQL load, then passed in the standalone full suite. Run the C1 full web suite alone; do not remove assertions or raise that timeout to conceal resource contention.
