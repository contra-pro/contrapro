# ADR-003 — expiring delivery material and channel separation

Status: implemented and reviewed locally; independent integration/security acceptance
and activation remain pending. Date: 2026-11-24 UTC.

Ordinary delivery jobs contain immutable tenant/session/purpose bindings, credential
hashes, opaque IDs, intent MACs and disposition metadata. A separate private payload
table stores AES-256-GCM envelopes. Recipients, signing links, download links and
verification codes are inside those envelopes, never plaintext jobs, audit events,
provider-error records or evidence exports.

The local review checked random 96-bit nonces, 128-bit authentication tags, 32-byte
keys, separate gateway/encryption/signing credentials, tenant/session/job/purpose
AAD, authenticated key IDs and expiry, expiry enforcement both in SQL and before
decryption, immutable job/grant binding and plaintext-leakage tests. The intent MAC
is keyed with the encryption secret, so a captured ordinary code-job fingerprint
is not a public offline eight-digit-code oracle. Encryption keys never enter SQL.
Only the separate gateway MAC key is provisioned to the restricted SQL gateway.

Each payload contains either a link or a code. Email code jobs are refused. The
supported policies are email link + manual WhatsApp/phone/in-person code, or manual
WhatsApp link + phone/in-person code. An invitation's channel choices remain fixed,
including for reminders; changing them requires renewal. This preserves technical
separation but does not prove legal identity or prevent a trusted operator from
misusing material they were authorized to share.

Invitation material expires with the underlying invitation. Final download grants
and their material expire after 48 hours. Workers recheck scope, state, revocation,
recipient/document binding and expiry before dispatch. The worker does not need the
signing secret or a storage service-role key. Agency-side invitation preparation
reuses the existing deterministic invitation derivation before encrypting material.

Maintenance deletes encrypted material after expiry or terminal delivered/bounced/
cancelled dispositions. Audit/evidence metadata is retained. No maintenance service
or scheduler is activated. Key provisioning/rotation must retain the current key ID
until its valid envelopes have drained; automatic historical key-ring migration is
not implemented. Sender/domain, SMTP, log-redaction, legal retention and managed
Storage/JWT/native concurrency acceptance are separate release prerequisites.

Provider effects cannot share a database transaction. An unarmed expired lease can
be reclaimed, but an armed expired lease becomes uncertain. Unknown outcomes never
automatically resend. Provider acceptance, provider-confirmed delivery, WhatsApp
open requests and an agency's manual sent report are distinct observations.
