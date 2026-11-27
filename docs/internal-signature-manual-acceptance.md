# Internal signature — manual acceptance

Use [the existing isolated review lifecycle](registration-onboarding-manual-acceptance.md#restart-isolated-review) for exact PowerShell build/start/status/shutdown commands. Check session status before rebuilding; never overwrite an active owner's artifacts. Signing gates remain closed in that credential-free review: unavailable states are expected. No simulated success should be substituted.

The following whole-journey checks require a separately authorized isolated synthetic backend and reviewed local draft projections. They have not been claimed as browser or live acceptance:

1. In both French and Arabic, create/confirm a rental with template/clauses/custom fields and branding. Issue the contract and note its version/hash and designated signer.
2. Reject owner-without-sign-permission, another capable but undesignated signer and another tenant. Reject invitation/client signing before agency signature. Reject changed version/hash.
3. Review agency PDF; use typed-only signing with keyboard. Repeat with optional drawing using mouse, touch and stylus; test clear, bounds, blank drawing, mobile scrolling outside the pad, consent reset and pending/double-click behavior. Confirm representation and exact notice in evidence.
4. Prepare email link and separate manual code. Verify no code in invitation URL or link email; manual WhatsApp sharing must not show confirmed delivery. No paid SMS is required.
5. Verify code attempt limit/rate limiting, expired invitation/challenge, replacement/revocation, stale tabs, consumed challenge and replay/changed retries. A link alone must not unlock document/signature access. Test two actual PostgreSQL sessions submitting simultaneously.
6. Verify client sees the exact agency revision, identity/name requirement, consent in document language, typed alternative, optional drawing and clear failure/retry states in FR/AR RTL.
7. Interrupt upload/finalization, resume safely, and simulate uncertain completion. Confirm one authoritative signature per party and no replacement of completed bytes.
8. Inspect final PDF against original pages, custom fields/clauses/branding, both visual appearances, unique references, authoritative UTC dates and appended execution record. Verify Arabic shaping, font embedding/licensing and mobile PDF readability. Compare downloaded SHA-256 to final evidence checksum.
9. Verify agency archive/evidence access, client expiring/revocable download grants, final notification to both parties, real authorized failure recovery/reminders and Sheets same-row status update. Reject foreign-tenant access and modified evidence/document bytes.
10. Record browser/device/version, screenshots, keyboard/screen-reader results and legal reviewer decisions. Do not infer identity proof, certified time or qualified signature from a drawing or checksum.

External signature providers are optional deferred extensions. Legal/privacy/retention and production acceptance remain separate launch requirements. No remote migration, gate activation or real delivery is authorized by this checklist.
