# Google Sheets automation — local MVP, 2026-11-24

Implemented locally behind `CONTRATPRO_SHEETS_VERIFIED`; the gate remains off.
Draft **0019** is guarded, ends in ROLLBACK, and has not been applied. No Google
account, credential, remote database, infrastructure setting, feature flag,
deployment preflight, commit, push, or live browser acceptance was used.

## Reused contracts

Rental creation still uses its existing authorized, transactional and idempotent
RPC. No new creation endpoint or duplicate client-side enqueue exists. Existing
rental versions, lifecycle mutations, secondary-driver records, canonical agency
selection, membership/capability checks, signing sessions and source fencing are
reused. The old snapshot `sheets.eventKey` remains unchanged: it identifies a
rental version, whereas a row now has the stable agency/contract identity.

Delivery supplies the AES-256-GCM envelope and HMAC primitives, with **separate
Sheets keys and AAD**. The worker follows its claim/arm/result/unknown-outcome
pattern. Existing documents, legal signature semantics, evidence and delivery
authorization are unchanged. Sheets never writes rental, signing or evidence data.

## Initial creation and later events

An AFTER INSERT trigger on `tenancy.rental_contracts` writes a permanent `created`
event, sequence 1, a mutable aggregate head and pending job in the **same
transaction** as “Créer le contrat”. This happens while the contract is a draft,
before confirmation, documents or signatures. Creation replay produces no second
insert/event. It requires no connection, destination, OAuth token, gateway key,
worker, or Google availability. No network operation runs in the transaction.

A database failure to persist this event necessarily rolls back creation: atomic
durability cannot promise successful creation after its own database fails. A
Google outage, rejection, quota or expired authorization cannot roll it back.

Rental version updates cover draft/driver edits, confirmation, handover, extension,
return and cancellation. Signing insertion and version/state/signature/final-PDF
changes advance the aggregate sequence, including agency/client signing and
finalization. Versions from a new signing session may restart at 1; the aggregate
sequence never does. Updates to older sessions cannot replace the current session.
Signatures on a superseded rental version are not presented as signatures or
document completion for the current version; their historical sessions remain intact.
Location/payment have no implemented domain capture and no fabricated events.

Immutable events retain the initial event and all emitted versions. One pending
job coalesces to the latest committed source, so a delayed first export may contain
the latest state rather than replay every draft as a separate Google write.
Existing rentals get an explicitly named `baseline` event, not a fabricated
historical creation event. Existing signing heads use the latest creation event.

## Connection, permissions and credentials

The agency API derives agency and canonical actor from the authenticated session;
browser agency IDs are ignored. Explicit `sheets.manage` permits connections,
destination changes, refresh-triggering provider operations and recovery;
`sheets.view` permits health/status only. Owners receive neither automatically.
Private tables force RLS, with no direct anon/authenticated/service-role access.
A dedicated NOLOGIN/NOBYPASSRLS worker executes MAC-protected, allowlisted RPCs.
Its domain grants are read-only. The agency wrapper reuses the existing rental
membership/capability composition; neither client-supplied scope nor a worker
lease confers agency configuration rights.

OAuth uses random 256-bit state, a hash-only database lookup, an HttpOnly Secure
SameSite=Lax host cookie, PKCE, ten-minute encrypted flow storage, exact configured
HTTPS redirect/origin, locale and actor/agency binding, and one-time consumption.
Callbacks immediately redirect to a clean URL. The authorization code is transient
and never stored. Infrastructure callback-query redaction still needs acceptance.
No Google access/refresh token is returned to a browser or audit/evidence export.

Default consent uses `drive.file` for application-created/authorized files. An
explicit alternative requests `spreadsheets` to enter an existing spreadsheet ID;
the UI explains that this grants access to all Sheets files. No broad Drive scope,
account-profile scope, browser access token or Drive Picker is used. Files/tabs
are fetched server-side; existing file selection is by ID, not a Drive-wide list.
Google's documented [scope choices](https://developers.google.com/workspace/sheets/api/scopes)
support these distinctions; Sheets authorization cannot be limited to one tab.

Access/refresh tokens are AEAD encrypted with agency, credential revision, key ID
and expiry in the associated data. Initial/reconnect exchange must provide a
refresh token; it never borrows one from a previously connected account. Refresh
uses an exclusive database lease and revision CAS. Rotated refresh tokens replace
old ones; an ordinary refresh response without a new refresh token retains the
same account's token. Ambiguous/abandoned refresh requires reconnect instead of
blindly replaying a possibly rotated token. Envelopes expire after 90 days;
rotation/provisioning/draining remain implementation work, not an activated job.
Disconnect removes local credentials and pauses exports, then attempts server-side
Google revocation; provider failure cannot restore local access. An already armed
external request cannot be recalled. Google's [server OAuth documentation](https://developers.google.com/identity/protocols/oauth2/web-server)
is the reference for offline consent, refresh, state and revocation behavior.

## Mapping and spreadsheet preservation

FR/AR settings provide connection health, consent choice, spreadsheet ID/tab
selection, new spreadsheet/dedicated tab creation, column checkboxes, preview,
save-paused, enable/pause, filtered jobs, confirmed history, retry/reconciliation
and per-contract health. RTL and existing workspace styling are reused.

The default omits client names, driver names, phone and email. Each is an explicit
optional mapping. Other columns include reference/created UTC time, vehicle,
rental UTC dates/duration, exact decimal-string money/currency, lifecycle,
agency/client signature status, technical completion and synchronization time.
Unavailable reference, optional driver, location and payment are blank. Technical
`completed` is not a new legal-assurance assertion. Identity/license numbers,
documents, verification codes, invitations, private storage links and dossiers are
not in the field allowlist or returned source snapshot.

All user values are validated bounded strings. Amounts are derived with integer
arithmetic, never floating point. Inserts use `stringValue`, updates use `RAW`;
values starting `=`, `+`, `-` or `@` remain literal. Existing formulas in managed
cells are detected from `userEnteredValue.formulaValue`, so a literal `=...`
does not become a false formula conflict. UTC timestamps include an explicit Z.
The row's last-sync value is the frozen export dispatch timestamp; confirmed
history separately records the result/reconciliation transaction time.

The adapter only accepts an owned dedicated tab with the exact managed header
and mapping fingerprint. Unknown tabs/data are never adopted or overwritten.
Users may select an existing ContratPro tab; otherwise create a dedicated tab in
the selected file. Mapping/header conflicts require a new compatible dedicated
tab. Writes touch only reserved/selected columns; other columns and rows retain
their values/formulas. Row insertion shifts existing rows rather than overwriting.

## Row identity, dispatch and consistency

Reserved columns hold `agencyUUID:contractUUID`, aggregate sequence and destination
revision. Sheet metadata binds agency and header fingerprint. Row developer
metadata binds the stable identity. Database `sheets_rows` binds agency/contract,
immutable captured destination revision, metadata ID, confirmed sequence and row
fingerprint. Numeric row positions are never the sole update address.

Each write checks headers, ownership, metadata and visible IDs. Duplicated IDs or
metadata, orphaned identity, a deleted previously known row, formulas, missing tab
or newer external sequence produce a conflict. Lookups scope row metadata to the
selected tab, allowing deliberate migration to another tab in the same file.
Updates use metadata-ID data filters, following row movement between lookup and
write, and require exactly one updated row and the expected cell count.

New rows use one atomic batch: insert below header, write literal cells, attach
metadata. Google documents [atomic batch application](https://developers.google.com/workspace/sheets/api/guides/batch)
and [metadata-based row addressing](https://developers.google.com/workspace/sheets/api/guides/metadata).
This avoids an append-success/metadata-failure split. It does **not** provide a
global unique key or compare-and-swap against human edits.

Database claims serialize per agency, lease/fence per contract, and lock in order
connection → head → job. Domain triggers never lock the connection. The rental
Sheets trigger sorts after the existing signing fence to preserve rental →
session → head ordering. A claim captures the latest snapshot, destination and
timestamp. Arming checks current sequence, destination, enablement and lease
before external dispatch. New source events wait behind an armed older write;
on success, newer desired state returns to pending. A failed result RPC leaves
an armed lease, whose expiry becomes reconciliation-required. It is never reclaimed
as a fresh append. Out-of-order claims/results cannot advance another lease.

429/read-unavailable failures use bounded exponential backoff, at most five
attempts per source/configuration generation. Explicit retry respects that delay
and ceiling. Permission/structure failures are permanent until corrected.
Transport/write 5xx or malformed write acknowledgements are uncertain. No blind
append retry exists. Reconciliation confirms only an exact captured sequence and
full row fingerprint; absence/mismatch remains unresolved because a late original
request may still arrive. Success history is append-only and contains IDs,
versions, destination revision and timestamps, not exported personal values.

For an unrecoverable unknown operation, an authorized user may explicitly abandon
the old destination **after lease expiry and only after selecting a physically
different file/tab**. The audit retains old destination/lease/fingerprint and
unknown outcome. The new target can then export safely; the old target may still
receive its late row and is not reported as synchronized. Known deleted rows in
the same tab remain conflicts even if the destination configuration is re-saved.

Actual limits: no exactly-once guarantee against humans, other applications,
malicious metadata edits, partial-range sorts or a read/write race during manual
schema edits. Whole-row moves/sorts are the supported case. Managed columns must
be reserved to ContratPro. No external CAS is available; native concurrent-worker
and real Google behavior remain acceptance work. Visible-ID scanning is linear
in tab size and costs several read requests per write; high-volume optimization
is deferred. Quota rejection backs off; it does not promise unlimited throughput.

Spreadsheet/tab creation is also an external side effect. Explicit tab IDs make
an ambiguous duplicate tab creation conflict instead of overwrite. Spreadsheet
creation names include the request UUID; a lost acknowledgement requires manual
Drive recovery by that title. The UI blocks another creation attempt in that
mounted view. There is no Drive-wide creation-recovery index or automatic orphan
spreadsheet deletion. This cannot create duplicate contract rows in a configured
target, but may leave an unconfigured empty spreadsheet after a lost response.

## Files and verification

New code: `apps/web/src/sheets/{model,google,oauth,repository,runtime,worker,handler,copy,workspace}`
and two test files; FR/AR Sheets page, POST action, OAuth callback and internal
one-tick worker route. Rental detail/page and workspace navigation gain gated
entry points. No scheduler was installed. Draft:
`supabase/migration-drafts/20261124001900_google_sheets.sql`.
The existing embedded document/signing/delivery test now loads 0019 in memory,
stripping its guard only inside the disposable PGlite instance.

Final local verification: `npm run verify` passed workspace TypeScript,
zero-warning ESLint, **1,833 web tests in 83 files**, **735 database tests in
26 files**, and the Next.js production build. The final current-rental-version
signature guard and its integration assertion also passed a targeted embedded
database rerun afterward. `git diff --check` and whitespace checks against every
new Sheets source/route/draft/report passed. SHA-256 checks confirm drafts
0013–0017 retain their prior bytes; 0018 was not edited.
The 31 dedicated Sheets tests use only fake transports and mocked identity/routes.
The embedded integration assertions prove initial draft enqueue without Google,
creation replay, explicit/cross-tenant denial, OAuth single consume, refresh CAS,
same logical row mapping after signatures/finalization, lifecycle events,
expired/stale leases, destination fencing, retained creation events and retry
ceilings. They do not establish real multi-session PostgreSQL concurrency or
Google account consent/API acceptance.

## Remaining implementation and deferred acceptance

Implementation work: operational key ring/rotation/draining; automatic recovery
of unknown spreadsheet creation; account-profile display/Drive Picker (not required
for server-side ID selection); high-volume scan/pacing optimization. Location and
payment export waits for the corresponding authoritative domain capture.

Deferred configuration/acceptance: native PG17 migration/ACL/RLS compatibility
and deployment inventory for 0013–0019; explicit capability/key provisioning;
Google project/API/consent setup and any required verification; separate FR/AR
HTTPS callback registration; worker hosting/scheduling/access credentials;
callback URL/token/body log redaction and retention policy; cross-tenant/JWT,
real simultaneous source/worker/refresh races; actual sorting/deletion/metadata,
quotas/revocation/lost response behavior; FR/AR mobile/browser/accessibility QA.
Only after separate approval and acceptance could the gate be enabled.

Runtime configuration names (no values have been provisioned):
`CONTRATPRO_SHEETS_VERIFIED`, `CONTRATPRO_SHEETS_GATEWAY_SECRET`,
`CONTRATPRO_SHEETS_ENCRYPTION_KEY`, `CONTRATPRO_SHEETS_KEY_ID`,
`CONTRATPRO_SHEETS_WORKER_ACCESS_SECRET`, `CONTRATPRO_GOOGLE_CLIENT_ID`,
`CONTRATPRO_GOOGLE_CLIENT_SECRET` and the existing `CONTRATPRO_APP_ORIGIN`.
The gateway secret must match the restricted database gateway key; the encryption
key and worker access secret have separate purposes. Existing canonical-auth
verification gates still apply. Do not place any private value in `NEXT_PUBLIC_*`.

All previous blockers remain: higher-assurance signature providers and their
verification/completion, legal validation, Resend SMTP domain verification,
delivery worker hosting, unknown delivery-provider-ID recovery, automatic reminder
generation, key provisioning/rotation, preconfirmation previews, location/payment,
Arabic fonts, DOCX conversion/layout acceptance, generated/signing orphan
reconciliation, migration compatibility/inventory and cross-tenant acceptance.
