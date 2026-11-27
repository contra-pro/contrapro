# Registration and agency onboarding — 2026-11-27

Local implementation checkpoint. No migration, provider activation, deployment or production acceptance.

## Journeys and data

The existing FR/AR sign-up collects first and last name, email (personal domains allowed), personal phone with editable calling code, password/confirmation and legal acknowledgment. Phone normalization defaults new forms to +212; it does not certify ownership or carrier validity. Password requirements remain 12–128 characters. Validation runs in the browser and again before invoking the authentication SDK.

The four-step agency wizard collects general contacts, administrative/address information, optional preferences and a final review. Company legal name, representative and RC city rules are conditional. Identifiers remain strings, preserving leading zeros. Country and administrative fields are not represented as universally valid legal advice. Reusing personal contacts is an explicit action. Logo management continues through the existing private branding flow after creation; no stamp or signature authority is fabricated.

Personal settings are at `/{locale}/app/account`; the verified authentication email is read-only. Agency profile/settings remain authorization scoped. New agency fields are available to future contract snapshots and field labels; existing stored document versions are unchanged. Billing links to administrative settings. Personal profile fields are not added to Sheets exports.

## Security and persistence

Authentication, confirmation, password policy, sessions, validated redirects, rate limiting and invitation authorization retain their existing implementations. Profile metadata is sanitized content, never role or membership authority. Profile seeding runs through explicit canonical provisioning, verifies the same current user and does not overwrite an existing profile.

Drafts remain in memory until explicitly saved to the self-scoped server draft. No passwords or invitation tokens are persisted in browser storage. An encrypted, expiring HttpOnly invitation cookie carries continuation across authentication; accepting membership still requires the existing verified invitation operation. Sign-out clears continuation state.

Mutations use stable request identifiers, revision checks and transaction receipts. An uncertain submission retries its original body. Final agency creation delegates to the existing atomic agency/owner bootstrap and rechecks access before selecting the agency. Creating another agency requires an explicit action. Existing memberships and invitations are retained.

## Legal release blocker

`approvedLegalRelease` is deliberately null: final approved terms/privacy documents and versions were not supplied. Registration displays an accessible unavailable state and does not fabricate acceptance or authentication success. Release requires approved document routes, actual versions/content hashes, publication in the legal registry and the existing server signing secret through the normal authorized environment process.

For an approved release, the server signs the email/version-bound signup receipt. Canonical provisioning verifies it before recording consent to published versions. The signed signup receipt contains server signup time; the database `accepted_at` is the authoritative first canonical recording/import time, not a claim that both events occurred simultaneously. Client timestamps cannot establish acceptance.

## Local migration draft

`supabase/migration-drafts/20261127002700_registration_onboarding.sql` adds private profiles, published legal documents/acceptances, onboarding drafts, agency details and idempotency receipts. It uses existing least-privileged roles, RLS and bounded SECURITY DEFINER RPCs. The file has an unconditional execution guard and rollback. It has **not** been applied remotely. Tests remove that guard only in a disposable in-memory projection.

Database evidence covers actor/agency isolation, immutable legal recording, idempotency, changed retry rejection, explicit additional agency creation and rollback after an injected post-bootstrap failure. Queued PGlite calls do not prove native multi-session PostgreSQL concurrency or managed Supabase behavior. Native role/ACL, migration rollout and live cross-tenant acceptance remain pending.

## Verification evidence

## Files in this batch

- `apps/web/src/registration/`: validators/types, FR/AR copy, profile/onboarding HTTP handler, wizard and personal/agency settings, consent signing, profile provisioning, encrypted invitation continuation and their regression tests.
- `apps/web/src/app/[locale]/app/{account,onboarding,onboarding-action}/`, `auth/{continue,invitation}/`, and the billing page: real guarded routes and administrative context link.
- `apps/web/src/auth/{password,canonical-provisioning,provisioning-handler,handlers}.ts` and password/SDK tests: validated signup metadata, explicit profile provisioning and sign-out cleanup.
- `apps/web/src/components/{auth-form,auth-view,agency-navigation,agency-management-page}.tsx`, auth/legacy-retry tests, `i18n/auth.ts` and `app/auth-design.css`: form fields, shared Dusk presentation, navigation and localized validation.
- `apps/web/src/operations/{accept,page,handler}.tsx` / `.ts`: invitation continuation into the existing acceptance flow.
- `apps/web/src/documents/{model,field-labels}.ts`: additional agency field registry labels.
- `supabase/migration-drafts/20261127002700_registration_onboarding.sql`; database tests `registration-onboarding.test.ts` and composed `a1-workflows.test.ts`.
- `scripts/v41-integration/registration-verify.mjs`, this report, the manual acceptance guide and the five linked MVP/A6/readiness trackers.

The worktree also contains prior integration changes; its entire diff must not be attributed to this batch.

## Recorded results

Final checks passed: TypeScript; zero-warning ESLint across both workspaces; production build; **1,987 web tests / 114 files**; **739 database tests / 29 files**; **8 operational tests**. The focused suite passed 101 tests / 9 files, and the SQL-specific suite passed 2 tests. Sixteen public FR/AR route requests returned HTTP 200 with the expected authentication shell and text direction. Server logs contained no external request or unhandled exception diagnostics. Both review ports were found without a listener after verification; the owner's session manager reported stopped. Owner build hashes matched the pre-verification snapshot.

The web suite emits React title-child warnings in existing rendering tests; tests pass, but this is not browser-console acceptance. Whitespace is checked separately after documentation updates.

Logs: `.verification/registration/{typecheck,lint,web,database,operations,targeted,sql,build}.log`. Public isolated HTTP results: `.verification/auth-polish/http.json` and `http-server.log`. The private `.next-auth-polish` build avoids overwriting the owner's `.next` artifacts. No browser, screenshot or authenticated visual acceptance is claimed.

See [manual acceptance](registration-onboarding-manual-acceptance.md) for restart and remaining checks. A6 and all previously recorded MVP production blockers remain open.
