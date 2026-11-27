# Backup, isolated restore and disaster recovery

These are future authorized procedures. No real backup, restore or provisioning
was performed during A5. Never use the existing production VPS for rehearsal.
Choose and measure recovery objectives during final acceptance; none are promised.

## Capture

Install compatible PostgreSQL client tools, restic and an external age recovery
workflow. Configure `PGSERVICE`/`PGPASSFILE` privately; do not put a database URL or
password in argv. Provide a pre-encrypted `CONTRATPRO_RECOVERY_KEYS_AGE` file that
contains reviewed key IDs, retained keys and configuration recovery instructions.
The age decryption identity must be kept independently.

Set an encrypted `RESTIC_REPOSITORY` and private `RESTIC_PASSWORD_FILE`. Approve
an operator-owned staging directory on an encrypted disk with restrictive ACLs;
Windows ACLs must be checked explicitly because POSIX mode bits are insufficient.
Staging contains sensitive plaintext until securely removed. Never stage in the
checkout, sync folders or a web-served directory.

Externally freeze app, worker, webhook, direct database, Auth and Storage writes.
The script cannot establish this cross-service freeze on its own. Set
`CONTRATPRO_WRITES_FROZEN=true`, `CONTRATPRO_PRIVATE_STAGING_APPROVED=true` and
`CONTRATPRO_BACKUP_AUTHORIZED=true` only after it exists. Supply the staging path,
release revision, Supabase version, HTTPS backup origin and server-only Storage
credential. Dry-run: `node scripts/operations/backup.mjs backup`.
Authorized execution: append `--execute`.

The tool captures a full custom PostgreSQL dump (including migration history,
Auth records, private operational data and Storage metadata), private bucket
bytes, reference checksums and version metadata; it validates a manifest before
restic ingestion. Required missing objects fail validation. Missing pending-upload
reservations are counted separately. It does not manufacture missing documents.
Inspect the encrypted repository with `restic check` before releasing the freeze.
Register only the resulting manifest checksum and an honest validation attestation
through the MFA backup RPC. It is not a restore acceptance certificate.

Configure retention in the encrypted repository with an approved restic policy
(for example operator-supplied `--keep-within` / daily / weekly counts). First run
`restic forget` with `--dry-run`; review legal holds, backup dependencies and key
retention before a separately authorized forget/prune. No retention period is
approved here and no automatic prune is shipped. Stage deletion is likewise an
explicit, separately reviewed filesystem operation.

## Restore

1. Keep traffic, workers, SMTP, webhooks and provider credentials blocked. Choose an
   isolated destination and explicitly approve it. Matching PostgreSQL extensions,
   roles and compatible managed Auth/Storage services are prerequisites.
2. With private restic credentials, set `CONTRATPRO_RESTORE_AUTHORIZED=true`,
   `CONTRATPRO_RESTORE_ISOLATED=true`, private staging approval, snapshot and
   extraction directory. Run `backup.mjs restore --execute`. Select the bundle
   inside restic's preserved original path and run `backup.mjs verify BUNDLE`.
3. Review managed-schema compatibility and role bootstrap. Only for an approved
   empty compatible target, set the isolated `PGSERVICE` and
   `CONTRATPRO_RESTORE_EMPTY_TARGET_APPROVED=true`; run
   `backup.mjs restore-database --execute BUNDLE`. It uses pg_restore's single
   transaction and no `--clean`, then executes post-restore quarantine before
   allowing traffic. If quarantine fails, keep the target isolated and repair it
   before any app access. Never restore onto an existing managed project blindly.
4. Provision the private bucket/service. With the isolated HTTPS restore origin
   and credential, `backup.mjs restore-objects --execute BUNDLE` checks existing
   bytes, refuses overwrite and verifies each uploaded checksum. Managed metadata
   rows with missing backend blobs can block API uploads: recover the metadata /
   blob mapping using the selected provider's reviewed procedure. This is a real
   managed-service dependency, not solved by a PostgreSQL dump.
5. Validate required object bytes, immutable documents/evidence chains, Auth
   identity mapping, migration history, RLS/ACL/role ownership and key references.
   Restore managed JWT signing keys/project settings, SMTP and OAuth/provider
   consoles through their supported independent recovery paths. Keys/config do
   not appear as plaintext manifest fields.
6. Independently query provider state newer than the backup. Quarantine marks
   restored sends uncertain, blocks Sheets writes and holds provider operations;
   it disables reminders, schedules, cleanup and rotation. No blind replay.
   Use existing delivery/Sheets/billing/signing recovery authority, including
   positive correlation and manual evidence where automatic observation cannot
   prove the result. Do not release a hold merely because a remote row is absent.
7. Measure restore duration/data loss against approved objectives in a separate
   rehearsal. Re-enable individual capabilities only after recorded acceptance.

## Incident procedures

| Incident | Executable recovery path and constraint |
| --- | --- |
| Database outage | Readiness fails; stop workers/writers; restore connectivity before claims. Expired unarmed leases recover under existing domain rules. Armed external operations become uncertain. |
| Storage outage / missing object | Inventory reports missing references. Block affected rendering/downloads; restore exact verified bytes from encrypted backup. Never substitute a new PDF for immutable evidence. |
| Worker interruption | SIGTERM stops polling and drains the current HTTP request. Restart after config/readiness review; durable due times, domain leases and CAS own progress. Failed/exhausted schedules require audited operator review. |
| Lost provider acknowledgement | Reconcile by positive provider identifier / correlation; never force an uncertain operation back to a sendable state. |
| Interrupted generation | Bounded pinned-request recovery. Existing issued artifact, rental-version change, cancellation or repeated failure requires manual review. Finalization reuses only committed signatures and valid invitation authority. |
| Interrupted rotation | Restore historical map, inspect counter/reference metrics, resume CAS; never extend envelope expiry or delete old keys to clear an incident. |
| Revoked provider credential | Disable affected schedule; reconnect through existing OAuth/provider authority; reconcile prior uncertainty before resuming writes. |
| Restored database | Keep external replay quarantined and immutable evidence unchanged until independent provider/service reconciliation is recorded. |
