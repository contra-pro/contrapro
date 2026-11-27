# Key rotation and interruption recovery

Do not execute against a live environment without separate authorization. Review
0025 and the A5 report first. Keys are operator-injected; none are generated here.

1. Freeze the affected writers. Inventory database key references and retained
   encrypted backups. Verify a separately encrypted recovery copy of every needed
   key and its ID; keep its decryption identity outside the backup repository.
2. Deploy the active-plus-historical map to **all** app instances before enabling
   writes with a new ID. Check restricted readiness. Unknown required IDs fail
   readiness and leave pre-dispatch email leases unarmed; OAuth is not marked
   revoked simply because a deployment key is absent.
3. Before first activation of the unapplied drafts, provision
   `CONTRATPRO_DELIVERY_DERIVATION_KEY` independently from all active/historical
   AEAD keys, gateway and signing keys. Keep this identity key unchanged across
   encryption rotations. There is no fallback to the encryption key. If an
   independently activated legacy installation already derived IDs with its AEAD
   key, stop and design a separate identity migration/drain; do not reinterpret
   an encryption key as a second-purpose key to bypass validation.
4. Through the existing MFA platform RPC, configure `rotation` with consumer
   `delivery` or `sheets`, target active ID and enabled=true. Enable the rotation
   schedule at an approved interval. Each tick handles one record, preserving its
   original expiry and AAD. Counters/audit survive restarts; CAS makes replay safe.
5. A crash before CAS changes nothing. A lost response after CAS is safe: the old
   envelope no longer matches and no second counter increment occurs. A concurrent
   credential refresh wins its own revision; the next tick reads current state.
6. Investigate failed incidents and key-reference counts. Expired OAuth flow and
   delivery material must follow their existing bounded purge policies; do not
   decrypt expired invitations to extend their validity. Disable rotation after
   completion. Remove a historical key only after database **and backup** review.

Invitation/verification HMAC keys are not encryption keys. Their persisted hashes
cannot be re-encrypted. Disable invite/verify writers and workers, drain or revoke
outstanding invitations through the existing signing/team authority, retain
completed evidence, cut over the server/gateway pair atomically, then issue fresh
invitations under current authorization. Do not silently accept old codes under a
new secret or renew expiry. Existing single-secret invitation issuance deliberately
requires this drain; automatic multi-version HMAC invitation rotation is not added.

Gateway MACs and worker access secrets require an atomic blocked-traffic cutover
with separately provisioned database/server keys. Webhook signing secrets require
provider-supported overlap and independently verified events. Provider OAuth/API
credentials require the provider's own revoke/reconnect procedure. No generic
rotation script can establish provider identity or authorize a payment/signature.
