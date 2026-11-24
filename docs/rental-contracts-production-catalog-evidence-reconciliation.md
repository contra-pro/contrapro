# Q12/Q13/Q15 evidence reconciliation

**Offline review, 2026-11-20. Production remains NO-GO. Q14 remains BLOCKED.**
Only this new report was created. Existing reports, evidence and SQL were not edited.
No SQL, connection, migration, application change, commit, push or deployment occurred.

## Scope and provenance

Read all existing rental-contracts Markdown reports under docs and inventoried
docs/evidence. Only q16-production-catalog-export.json is present there. No Q12/Q13/
Q15 raw export or full executed hotfix artifact was found in that evidence directory.
This is not a claim that no such files exist elsewhere or that the queries never ran.
The user's current reconciliation request is itself a new explicit attestation of
reported Q13 three-row and Q15 one-row collection; it is not an original result export.
No missing rows, booleans, OIDs or authentic CSV/JSON were reconstructed.

## Source trace and reconciled status

| Item | Exact supporting source | Supported conclusion | Still unknown |
|---|---|---|---|
| Q12 corrected execution | [Batch3 verification](rental-contracts-production-catalog-batch3-verification.md), lines206–209,223–224,348–355 | User-reported corrected pg_catalog.bool query succeeded with seven extension/language rows | Actual complete executed SQL, raw export, context/time/hash and independent result verification |
| Q12 persisted failure | [Consolidated report](rental-contracts-production-catalog-q01-q16-consolidated-readiness.md), lines14–16,83,114–119; [canonical SQL](rental-contracts-production-catalog-query-review.md), Q12; Batch3 verification338–346 | FAIL explicitly refers to the original/current persisted pg_catalog.boolean copy; not the reportedly successful correction | Whether an independently approved corrected execution artifact exists elsewhere |
| Q13 three rows | Current user request: “Three metadata result rows were previously reported as collected” | Execution/collection is now explicitly REPORTED, count3; not independently verified | Earlier original report/result source not located in existing docs; actual three rows, completeness and executor identity unavailable |
| Q15 one row | Current user request: “One effective-privileges result row was previously reported as collected” | Execution/collection is now explicitly REPORTED, count1; not independently verified | Earlier original report/result source not located; values and execution context unavailable |
| Earlier missing-evidence assessment | Consolidated report61,84,86,92; [Q16 results review](rental-contracts-production-catalog-q16-production-results-verification.md), lines249–255,424 | The inspected repository lacked the raw result artifacts; execution was not independently established | Cannot turn absent artifacts into proof of nonexecution |
| Q13/Q15 source approval | [Independent re-review](rental-contracts-production-catalog-independent-rereview.md), Q13 and Q15 sections; canonical headings468 and558 | Queries existed as independently reviewed metadata candidates | Source approval alone never proves execution or specific returned privilege values |

The statements “Q13/Q15 never executed” or “nothing was ever reported” are unsupported.
The narrower statement “no raw result or earlier specific three/one-row execution
record was found in inspected repository reports” is supported. Generic references
to “already-collected Q01–Q15 artifacts” in earlier reports are not specific proof of
Q13/Q15 execution/counts. The current user's attestation must be retained separately
rather than backdated into those historical reports.

## Findings by discrepancy

### Q12 — supported distinction, no execution contradiction

The consolidated report already says FAIL applies to the stale executable artifact.
The post-collection Batch3 review separately records original failure42704 and corrected
success. Those statements coexist: a corrected query can succeed while an old file
remains invalid. Seven supplied rows and SQL/plpgsql USAGE=true were reported, not
independently validated from raw output. No finding establishes failure of the corrected
run, unsafe installed extensions, or missing btree_gist as a current-draft requirement.
Earlier unqualified SAFE/executable-compatibility statements were contradicted by the
original runtime error; that historical error does not negate the later reported success.

Current artifact check confirms canonical/Batch3 still contain pg_catalog.boolean.
The actual qualified catalog type is bool. No source correction is authorized here.
Execution status: REPORTED corrected success. Result verification: PARTIAL. Persisted
original artifact: FAIL. Production release clearance: BLOCKED.

### Q13 — missing export is not missing reported execution

The current request supplies the count3/execution claim. It should now be described as
“reported collected; raw artifact unavailable; independent verification pending.” The
old “Execution NOT ESTABLISHED” can accurately mean independent establishment was absent,
but is misleading if read as confirmed nonexecution. Its “prepared SQL only” description
must not erase the new attestation. No earlier specific three-row claim was located in
the inspected repository, so historical source attribution remains UNKNOWN.

Three metadata rows can be consistent with per-column history structure output, but
row count alone proves neither what columns exist nor SELECT/schema access, RLS,
unique key shape or safe history visibility. No values are inferred. Q14 remains
BLOCKED regardless of reported Q13 success.

### Q15 — missing values prevent authority conclusions

The current request supplies count1/execution. The correct evidence status is “reported
collected; raw artifact unavailable; independent verification pending.” A one-row
privilege inquiry does not imply any returned privilege was true. INSERT, MAINTAIN,
owner SET/USAGE, schema/version access and executor binding remain UNKNOWN. Even true
catalog privileges would not exercise lock acquisition, INSERT constraints/RLS or atomic
history recording. Missing export does not prove execution failed or never occurred.

## Classification reconciliation

The historical **0 PASS /12 PARTIAL /3 BLOCKED /1 FAIL** mixed result coverage with
artifact correctness. It explicitly counted Q12 artifact failure and Q13/Q15 evidence
gaps. It is preserved; no existing report was edited. Repository-only inspection finds
no new raw Q13/Q15 artifact or prior specific three/one-row record that would independently
justify upgrading those checks to PASS or claiming verified collected results.

Two distinct ledgers avoid changing meanings silently:

| Ledger | PASS | PARTIAL | BLOCKED | FAIL | Meaning |
|---|---:|---:|---:|---:|---|
| Historical consolidated mixed checks | 0 | 12 | 3 | 1 | Preserved original classification, including Q12 stale artifact FAIL |
| Mixed checks incorporating the CURRENT user attestations | 0 | 14 | 1 | 1 | Q13/Q15 become PARTIAL reported-result checks; Q14 BLOCKED; Q12 persisted artifact remains FAIL |
| Result-evidence-only normalization, including CURRENT attestations | 0 | 15 | 1 | 0 | Q12 corrected execution evidence PARTIAL, artifact failure tracked separately; not a repository-only independent upgrade |

The latter two are explicitly attestation-based reinterpretations, not new independently
verified Production facts and not replacements for the original historical totals.
**Recommended current labels:** Q12 corrected-result evidence PARTIAL plus stale-artifact
FAIL; Q13 reported-result evidence PARTIAL; Q15 reported-result evidence PARTIAL.
History authorization/readiness remains BLOCKED until values/provenance are reviewed.
No metadata count or relabeling changes the Production NO-GO decision.

## Minimum missing artifacts — no new database work requested

1. Q12: the original complete seven-row export with headers/NULLs and the exact corrected
   executed SQL or retained Editor text/history reference showing pg_catalog.bool.
   Record/hash originals after receipt; do not reconstruct an authentic export from
   the seven-row narrative.
2. Q13: original complete three-row metadata export with all columns/JSON/arrays/NULLs,
   plus exact executed query and any original execution/result message. Locate the
   earlier specific collection record if available to establish historical chronology.
3. Q15: original complete one-row export, including every effective privilege boolean/
   NULL and owner/role metadata, exact executed SQL and execution outcome record.
4. For each: non-secret Production project/database label, UTC execution time and
   selected/actual executor context, warnings/errors, export/Editor limits and complete
   row count. Editor current_user evidence is not future migration-executor authority.
5. Use source hashes and comparisons to bind artifacts. Different dates/sessions must
   remain distinct snapshots. If originals are lost, record unavailable; any fresh
   collection is new evidence needing separate authorization, not a historical substitute.

No credentials, tokens, connection strings, customer data or migration-history values
are requested. First recover existing files from the evidence custodian; no SQL/query
is proposed. Policy/settings/ownership, defaults, temporary-role authority, history
atomicity and Q16 missing suffix/shared-root evidence remain unresolved release gates.

## Offline checks and final decision

Search covered all existing rental-contracts Markdown reports and the docs/evidence
inventory. Exact Q12 source spelling and cited passages were read. New report links/
whitespace checked and git diff --check passed; other reports/evidence unchanged.
No raw-export rows or successful operations were invented.

**Production remains NO-GO. Q14 remains BLOCKED.**
