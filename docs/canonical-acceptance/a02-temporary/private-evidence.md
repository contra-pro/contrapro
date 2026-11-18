# Private local evidence preparation

Gate 2 remains unauthorized. All four role groups (installation/recovery, Auth
administration, session custody and observation) are assigned to **project owner**.
Independent evidence means separately captured and reviewable evidence, not a
different invented human name. This assignment does not establish privileges.

## Configurable private directory

Verified location: `C:\Users\lenovo\AppData\Local\Contratpro-A02-Evidence`.
The first automated initialization attempt was blocked before execution. The owner
subsequently created it manually. Independent read-only checks now verify the five
templates and their owner-only NTFS ACLs; see private-evidence-verification.json.
No private file or ACL was modified during verification. The subsequently supplied
original hashes now match all five current files and packet bindings. See
gate2-final-offline-review.json; the earlier verification receipt retains its
historical statement that original hashes had not yet been supplied.

The operator may select a different absolute fixed-NTFS-drive path outside any Git
worktree. Its immediate parent must already exist. The initializer refuses existing
targets, repository ancestors/descendants, any ancestor containing .git, network
drives and reparse points. It never changes an existing directory's permissions.

In an operator-controlled Windows PowerShell session, after reviewing the script:

```powershell
# Offline filesystem preparation only; this does not authorize Gate 2.
$a02EvidencePath = 'C:\Users\lenovo\AppData\Local\Contratpro-A02-Evidence'
& .\scripts\a02-private-evidence.ps1 -EvidencePath $a02EvidencePath
# Recheck the same fixed template set independently:
& .\scripts\a02-private-evidence.ps1 -EvidencePath $a02EvidencePath -VerifyOnly
```

Use the actual chosen path; no credentials in arguments. Do not change global
execution policy, bypass shell restrictions or relax ACLs to make this pass. If the
script is blocked, stop and use the operator's approved script-execution process.

The directory is created with a protected DACL, owned by the current Windows SID,
allowing FullControl only to that SID. The script verifies that model before writing
and verifies every inherited file ACL afterwards. It reports only path, fixed status
and SHA-256 values. Generic failure does not claim privacy, delete partial artifacts
or overwrite an existing destination. Inspect/recover partial preparation separately.

This is local ACL privacy, not encryption or an assurance against elevated admins,
backup/restore privileges, synchronization/backup software or same-user malware.
The operator must exclude the destination from sync, backups and terminal recording
where required; those controls are not attested by a DACL. Recheck privacy before
future evidence writes. VerifyOnly presently verifies the exact five-file template
set, not an arbitrary later evidence collection.

## Fixed records and separate manifests

Only these five JSON templates are written, with fixed allowlisted fields:

| File | Meaning |
| --- | --- |
| ownership-reference.json | A/B/U inbox-availability statement; no addresses. Domain and verification receipt UNBOUND |
| credential-channel-reference.json | Existing hidden interactive memory-only method; actual Admin header channel and review UNBOUND |
| destination-reference.json | Actual selected directory and permission model; independent-capture review UNBOUND |
| execution-manifest.json | Empty operations list, NOT_STARTED; run/time/review UNBOUND |
| observation-manifest.json | Separate empty captures list, NOT_STARTED; same human, independent capture process; run/time/review UNBOUND |

All are TEMPLATE_ONLY_NOT_EVIDENCE and liveExecutionAuthorized:false. Template
creation is not an ownership verification, an Admin-channel implementation, an
execution receipt or an observation result. Do not replace review fields with PASS
merely because these templates exist. No private addresses are required in chat.

After a genuine permission PASS, bind the actual destination and the path/hash of
each existing reference in the packet. Keep the underlying approval/ownership/channel
review receipts UNBOUND until independently reviewed. A real channel reference
identifies the approved memory-only supplier without containing its secret value.
Do not substitute the channel template's existence for proof of usable Admin authority.

Passwords, access/refresh tokens, headers, private emails, raw Auth responses/errors,
request bodies, transcripts and dumps are forbidden in these files and manifests.
Continue using the existing in-memory credential provider and session transport.
There is no generic arbitrary-JSON evidence writer here. A future reviewed capture
writer must allow only checkpoint/label enums, timestamps, file hashes, exit and
commit-certainty statuses; keep private canonical IDs only in the reviewed observer
capture, never credential payloads. Free-form diagnostics are not evidence fields.

Manifests permit separately captured evidence verification through file hashes and
target/run/checkpoint correlation; hashes alone do not prove independent provenance
or accurate contents. The complete in-flight/mutation evidence source and its review
remain required. Do not mark the packet READY or authorize any live operation.
