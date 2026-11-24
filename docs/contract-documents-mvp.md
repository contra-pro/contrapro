# Contract templates and document artifacts — local MVP

Implemented locally on 2026-11-24. No remote SQL, deployment, live Supabase,
browser acceptance, flag activation, signing call or paid service was performed.
The feature stays closed behind `CONTRATPRO_DOCUMENTS_VERIFIED`; no environment
file was changed. Draft 0016 deliberately raises an exception and ends in ROLLBACK.

## Reused functionality

Existing SSR authentication, canonical subject, selected-agency cookie, workspace
and FR/AR routes remain authoritative. Draft 0015's immutable rental snapshots
supply captured parties and exact decimal-string prices; current agency/client/
vehicle edits cannot replace them. Existing lifecycle, creation encoder, logo
validation and signing-evidence contracts are reused. The demo template studio,
five presentations and browser-print export remain demonstrations.

## New functionality

- `/fr/app/templates` and `/ar/app/templates`: tenant library, PDF/DOCX upload,
  names, duplication, owner-only version appends, archival, one default, historical
  versions and original PDF preview. Creation requires an uploaded original;
  further edits preserve it unless a new file is explicitly supplied.
- Numeric positioned-field and signature-zone editor: page points from top-left,
  repeated fields, required values, font size, right alignment, custom definitions,
  agency/client signature zones and bounded PNG logo placement. Business data
  comes from the existing profile and captured rental parties.
- Catalog for agency, drivers, identity/contact/license, vehicle, rental dates/
  duration, prices, reference and explicit issue date. Pickup/return/payment keys
  are recognized but 0015 does not capture them; unresolved required values fail.
  Agencies can define/supply `custom.*` values; no source value is invented.
- Selection during rental preparation, explicitly associated with a saved draft
  before confirmation. Association is a separate transaction from rental creation.
  Confirmed rentals can generate from an explicit active template version.
- Actual server PDF generation and private draft/issued artifact persistence,
  preview/download, exact pricing, history and same-input generation retries.
  Generation currently requires a captured 0015 rental snapshot, so an unconfirmed
  rental draft cannot yet produce a document preview.
- SHA-256 checksums, tenant object keys, request-JWT Supabase storage adapter,
  authenticated POST downloads and revocable browser Blob previews. No public URL
  or bearer link is created.
- Transactional jobs pin rental version, template version, issue date, custom
  values and request ID. Changed-input replay conflicts; completed replay returns
  the original artifact. Version rows, jobs and artifact metadata reject changes.
  Reissuance appends an artifact and preserves earlier PDFs.
- Server HMAC-SHA256 attestation binds agency, immutable request, object key,
  PDF checksum and source-template checksum. The publishing RPC verifies this
  before accepting an artifact; authenticated clients cannot bypass rendering by
  directly uploading arbitrary bytes. This MAC is not an electronic signature.
- Signing preparation records artifact/rental/template version, exact PDF hash,
  original template hash, agency-first/client-second order and zones. Evidence
  remains null; no signature, provider invocation or Signed state is fabricated.

## Supported formats and actual limitations

PDF: `pdf-lib` preserves page content and overlays text/logo. Supported inputs are
plain unencrypted PDFs, at most 10 MiB, 50 unrotated pages and 2000-point dimensions.
Active actions, embedded files, AcroForms, XFA, external links and unsafe nested
dictionaries are rejected. No paragraph reflow, OCR, encrypted-file recovery or
existing digital-signature preservation is supported. Text must fit its mapped
box; overflow fails. Unusual page boxes require template-specific acceptance.

French defaults to Helvetica/WinAnsi. Arabic requires a licensed Arabic-capable
TTF/OTF at server-only `CONTRATPRO_DOCUMENT_FONT_PATH`. `@pdf-lib/fontkit` embeds
and subsets that font; RTL zones align right. A local automated test generates an
Arabic PDF using Windows Arial. It proves embedding/generation, **not** visual
correctness, extraction order, mixed-direction layout or arbitrary Arabic fidelity.
No font binary is redistributed; unavailable glyphs fail explicitly.

DOCX: restricted OOXML ZIP, at most 250 entries, 4 MiB expanded per entry and
20 MiB expanded total, streamed in bounded compressed chunks. Traversal, duplicate
entries, unsafe parts, macros/OLE/ActiveX, DTD/entities, fields and external
relationships (including numeric character references) are rejected. This is a
supported-format boundary, not a malware-scanner certification.

Tokens such as `{{agency.name}}` must be wholly inside one `w:t` text run in the
document/header/footer XML. Unknown, malformed, split and absent required tokens
fail. Substitution XML-escapes values and retains styles/runs. The converter, not
this substitution, determines the resulting page fidelity.

`ContainerDocxConverter` provides optional real conversion. Configure
`CONTRATPRO_DOCX_IMAGE` with a **preinstalled digest-pinned** image containing
`/usr/bin/libreoffice`, fonts and output-mount write permission for UID/GID 65534.
Docker runs with `--pull=never`, no network, read-only root, no capabilities,
no-new-privileges, bounded memory/CPU/processes/tmpfs, unique profile, fixed args,
no shell and a 30-second timeout. Only its generated container and verified temp
directory are cleaned up. No image was pulled, built or run here. Missing engine
returns unsupported; failed/invalid output returns conversion-failed. Converted
PDFs are screened again. Native conversion/layout fidelity remains unverified.

References: [pdf-lib](https://pdf-lib.js.org/),
[fflate](https://github.com/101arrowz/fflate),
[LibreOffice parameters](https://help.libreoffice.org/latest/en-US/text/shared/guide/start_parameters.html).

## Storage, consistency and retention

Private bucket contract: `contract-documents`. Keys:
`agencyId/{originals|drafts|issued}/resourceId/sha256.{pdf|docx}`. Metadata reservation
precedes upload; successful publication retains the object. Uploads never upsert.
Ambiguous upload success is reconciled by reading/hashing bytes. Failed metadata
commit does **not** eagerly delete an object, because the commit may have succeeded.
Completed jobs never rerender. Native conversion may vary byte-for-byte across
engine versions; pending retries can leave extra generated objects, safely retained.

Generation requires a separately provisioned random 32-byte key: server-only
`CONTRATPRO_DOCUMENT_RENDERER_SECRET` (64 lowercase hex characters) and the matching
row in private `app_private.document_renderer_key`. No key is shipped or configured
by this work. Authenticated clients cannot read the key or invoke its MAC helper.
Missing configuration fails closed. Provisioning/rotation and least-privilege key
access must be reviewed before activation; never reuse the auth flow secret.

Referenced originals, all versions, drafts and issued PDFs have indefinite MVP
retention, including after archival. Issued objects have no update/delete policy.
Owner-authorized `Documents.cleanupOrphans()` claims only unreferenced original
uploads older than seven days under the agency lock. Claimed objects cannot be
newly referenced; deletion failure preserves a retryable claim. Metadata removal
follows storage deletion. Each call processes at most 100 claims. No scheduler is
activated. Generated objects/jobs remain retained until a reviewed reconciliation
policy can remove them without breaking retries/signing history.

## Files and dependencies

- New `apps/web/src/documents/`: model, upload screening, renderer, converter,
  repository/service/storage adapters, HTTP handler, FR/AR UI, styles and six test files.
- New localized `app/templates/page.tsx` and `app/document-action/route.ts`.
- Minimal integration in agency navigation and rental page/workspace.
- New `supabase/migration-drafts/20261124001600_contract_documents.sql` and embedded
  `packages/infrastructure/database/tests/contract-documents.test.ts`.
- Exact added dependencies: `pdf-lib@1.17.1`, `@pdf-lib/fontkit@1.1.1`,
  `fflate@0.8.3`, `fast-xml-parser@5.12.1`, plus lockfile changes.

## Verification and remaining integration

Tests cover upload abuse, encoded references, mappings/required values, exact money,
real FR/AR PDF generation, overflow, conversion failure, checksum mismatch, storage
fault/retry recovery, revoked access, HTTP origin/gate/size checks and FR/AR markup.
The embedded PostgreSQL/storage-policy harness covers tenant and owner denial,
defaults, versions, draft selection, job replay/conflicts, immutable artifacts,
archival, history and orphan deletion retries. Simplified storage tables do not
prove managed Supabase semantics. Final command results are in the MVP tracker.
SQL/Node HMAC interoperability, rejection of forged publication attestations and
denial of direct key/MAC-helper reads are covered in the embedded database harness.

Final `npm run verify` passed on 2026-11-24: workspace TypeScript, zero-warning
lint, 1,765 web tests (69 files), 735 database tests (26 files), production build.
The new module contributes 27 web tests in six files and one embedded database
scenario containing the tenant/storage/versioning/attestation/cleanup assertions.

Audit reports seven moderate findings in the existing development lint chain
(`typescript-eslint` / transitive `minimatch`), with no new production renderer
finding reported. Unrelated dependency upgrades were not attempted.

Remaining requirements: reviewed PG17 ownership/ACL/default-policy rehearsal and
transaction/history packaging; actual Supabase Storage/JWT/RLS and native concurrency
acceptance; licensed deployment fonts; real isolated LibreOffice conversion and
FR/AR visual/accessibility/browser QA; optional preconfirmation snapshot rendering;
authoritative location/payment capture; generated-orphan reconciliation/scheduling.

The canonical digest decision is unchanged: this module hashes **actual PDF bytes**
and does not approve semantic snapshot canonicalization. Real signing must verify
persisted bytes, provider authenticity, agency-first ordering, consent, evidence
references and exact artifact/version/hash binding through the existing contracts.
No provider adapter or evidence persistence is claimed.
