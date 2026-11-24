# Authentication UX — local implementation

Password registration/login, email confirmation and password recovery use the existing Supabase SSR client with the public publishable key. No admin API, service-role key, database migration or membership shortcut is introduced.

## Local browser testing

Run `npm run dev` at the repository root. Open `http://localhost:3000/fr/sign-up` or `/ar/sign-up`. The configured origin is localhost:3000; do not substitute 127.0.0.1 in browser URLs unless the application origin and provider redirects are intentionally configured for it.

Routes in both locales:

- `/sign-in`: email/password primary; Magic Link under other methods.
- `/sign-up`: email/password and matching confirmation; new passwords must have 12–128 characters.
- `/forgot-password`: neutral account-existence response.
- `/reset-password`: enabled only with a verified session and a signed, session-bound recovery grant.
- `/auth/password-callback`: bounded PKCE exchange with one-use same-browser correlation. Tokens/codes are removed by redirect; no arbitrary next URL.
- `/auth/continue`: checks the existing agency context. Existing members reach their dashboard/agency selector; mapped users without agencies reach onboarding; unmapped users see an explicit account-setup action.

Forms use native POST and work without JavaScript. JavaScript adds localized validation, duplicate-submit protection and pending feedback. Email/password fields are never reflected in error URLs. Authentication errors use fixed FR/AR messages; raw SDK errors are not logged or rendered.

Authenticated workspace logout uses a same-origin fetch with an explicit JSON acknowledgement, so sensitive pages can retain `no-referrer` without producing a native-form `Origin: null`. JavaScript is required for that workspace logout enhancement; a missing Origin always fails closed. Cookies, the selected-agency hint and recovery/correlation grants are cleared on confirmed local logout. Errors never claim logout succeeded.

## Required manual Supabase configuration

No Supabase settings were changed during implementation. An operator must verify these settings in the already selected development project:

1. Enable Email/password signups and **Confirm email**. Keep existing users and sessions; do not reset Auth/database state.
2. Set Site URL to `http://localhost:3000` for this local environment. Allow the exact FR/AR `/auth/password-callback` and existing `/auth/callback` destinations, including their generated `flow` query parameter. Use exact application-origin/path allowlisting with a narrowly scoped query wildcard where the Dashboard requires it; never allow arbitrary domains.
3. Signup confirmation and password recovery email templates must retain the standard `{{ .ConfirmationURL }}` link. The SDK passes the correlated redirect through `emailRedirectTo`/`redirectTo`. A custom token_hash-only template is not supported by this PKCE callback. Open emails in the same browser that initiated the request, within one hour. Expired/reused/cross-browser links fail closed; request another link.
4. Configure working SMTP/delivery for intended recipients. Supabase's default mail service may restrict recipients and rate-limit messages. Check service password policy and Auth rate limits; production should also use the provider's abuse protections. No email was sent by automated tests.
5. Leave Google hidden unless its provider/client credentials and redirect URI are actually configured. Only then set the server environment variable `CONTRATPRO_GOOGLE_AUTH_ENABLED=true` and restart/rebuild. Direct Google initiation is also rejected while off. No OAuth credentials are supplied by this feature.

Official behavior references: [password Auth](https://supabase.com/docs/guides/auth/passwords), [SSR PKCE](https://supabase.com/docs/guides/auth/server-side/advanced-guide), [signInWithPassword](https://supabase.com/docs/reference/javascript/auth-signinwithpassword).

## Local secret and deployment

`CONTRATPRO_AUTH_FLOW_SECRET` is a server-only random secret (at least 32 characters). `node scripts/setup-auth-local.mjs` appends a securely generated value to the existing ignored `apps/web/.env.local` only when absent, without printing it or changing other settings. Do not commit this file. For another deployment, provision a separate secret using its secret manager; all instances of that deployment must share it. Rotation invalidates outstanding recovery grants, not existing normal Supabase sessions.

Recovery is refused when this secret is missing. A successful correlated recovery exchange creates an HttpOnly, SameSite=Lax grant for ten minutes, signed over the verified subject/session ID/expiry. Reset re-verifies Supabase identity and that grant before `updateUser`. Success clears the grant and agency hint and requests local sign-out. A failed sign-out is reported explicitly; it is never represented as confirmed logout. This does not promise immediate revocation of already issued access tokens on other devices.

## Existing authorization remains authoritative

Account setup calls the existing parameter-free same-origin `/auth/provision` POST. Its existing canonical-provisioning/access gates and authenticated RPC/read-back checks remain unchanged. It creates no agency membership. Agency creation remains an explicit submission through the existing authorized onboarding RPC. A missing deployed provisioning RPC, disabled gate or failed read-back leaves access unavailable/uncertain.

Client CRUD, Client Creation Contract V2, tenant RLS and agency permissions are unchanged. These must already be installed/verified for persistent client use; successful authentication does not establish database compatibility. No feature flag was enabled by this work. Offline Digest O8/C8, registry freeze and real signing are independent and unchanged.

## Verification scope

Tests use injected SDK/RPC boundaries and synthetic data. They cover credential operations, signup/confirmation, expired codes, session-bound recovery/tampering/expiry, CSRF, safe cookies/errors, conditional Google, explicit provisioning and post-auth navigation. Existing logout, canonical-provisioning, agency/client journey and retry tests remain part of regression coverage. Live email delivery, real provider configuration and deployed RLS compatibility still require authorized manual testing.

## Diagnosing a failed registration

`node scripts/auth-signup-preflight.mjs` performs only a GET of the pinned project's public Auth settings and the local signup page. It prints selected booleans/statuses and allowlisted existing-log code counts, never environment values, key material, user records or raw log lines. It never calls signup or a database. The public settings endpoint does not expose SMTP credentials/configuration, redirect allowlisting or Auth hooks.

Read-only observation on 2026-11-22: project/origin match; publishable key accepted by `/auth/v1/settings` (HTTP 200); `disable_signup=false`, `external.email=true`, `mailer_autoconfirm=false`, `external.google=false`. The served local signup form posts to `/fr/auth/sign-up` and has the correct referrer policy. These observations rule out globally disabled/email-disabled signup at that time; they do not identify why an individual signup failed.

In development only, failures emit `[contratpro-auth]` followed by an object containing operation, stage, category, an allowlisted error code and optional numeric upstream HTTP status. No email, password, request payload, session, callback code, token, raw message or stack is emitted. Unknown provider codes become `unclassified`. Production emits none of these diagnostics.

The registration POST and the later confirmation callback are separate stages. A registration failure must not be described as an expired Magic Link. Both legacy `status=error` signup pages and the new `status=signup-unavailable` use registration-specific generic copy. Duplicate-account responses remain neutral, rate limits retain their fixed status, and immediate verified sessions (confirmation disabled) still proceed to the existing authorization/onboarding boundary.

For one final test, start the application with `npm run dev`; in Incognito open `http://localhost:3000/fr/sign-up`, submit an address you control and a matching 12–128-character password once. If confirmation is required, expect `status=confirmation-sent`, then open the email in the same Incognito window. With confirmation disabled, expect `/fr/auth/continue`. If the POST fails, use only its sanitized terminal diagnostic to localize the cause:

| Diagnostic | Operator inspection; do not change settings blindly |
| --- | --- |
| `signup-response / signup_disabled` | Supabase Dashboard → Authentication → Sign In / Providers → Allow new users to sign up |
| `signup-response / email_provider_disabled` | Authentication → Sign In / Providers → Email |
| `signup-response / email_address_not_authorized` | Authentication → Emails → SMTP Settings; default SMTP restricts delivery to project-team addresses |
| `signup-response / over_email_send_rate_limit` | Authentication → Rate Limits and Emails → SMTP Settings; wait before retrying |
| `signup-response / unexpected_failure` | Logs → Auth: inspect the failed signup's provider-side error; a trigger/hook, mail/template or service problem needs that evidence |
| `client / configuration` | Check local public URL/key configuration without copying their values into logs |
| `signup-request / transport` | Check application-to-Auth connectivity/timeouts, not callback browser cookies |
| `callback` failure | Authentication → URL Configuration → Site URL/Redirect URLs, and Emails → Templates → Confirm signup |

References: [Supabase Auth error codes](https://supabase.com/docs/guides/auth/debugging/error-codes), [custom SMTP restrictions](https://supabase.com/docs/guides/auth/auth-smtp), [redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls). Do not disable confirmation, modify Auth triggers or bypass tenant checks as a troubleshooting shortcut.
