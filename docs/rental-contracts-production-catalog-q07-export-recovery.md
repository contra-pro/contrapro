# Q07 original export recovery — offline verification

**Verdict: MISSING within the inspected local locations. Production Migration / Deployment: NO-GO. Q14 remains BLOCKED.**

The original Q07 CSV/JSON was not located. This does **not** establish that Q07 was never executed, that its reported 96 rows are incorrect, or that no original exists elsewhere. No substitute export was reconstructed. No SQL was executed and no database was contacted.

## Recovery method and scope

Inspected existing CSV, JSON, JSONL and TSV files by content, not filenames alone. First inspected up to 16 KiB for the eight expected field names; then searched complete contents of all 2,648 candidate data files for those names. No file matched all eight. None exceeded the 30 MiB full-content inspection cap. No unrelated record values are reproduced here.

Search scope:

| Location | Traversal scope |
|---|---|
| C:/Users/lenovo/contratpro | Repository tree, maximum 20 nested levels; includes docs/evidence |
| C:/Users/lenovo/Downloads | Top level and four nested directory levels |
| C:/Users/lenovo/Desktop; C:/Users/lenovo/Documents | Top level and three nested levels |
| C:/Users/lenovo/OneDrive; C:/Users/lenovo/downloader | Top level and three nested levels |
| C:/Users/lenovo/.codex/attachments | Top level and three nested levels; one candidate data file, no matching export |

Excluded dependency/build directories named node_modules, .git, .next, .turbo, dist and build; did not follow symbolic links. This was a bounded local recovery search, not a full-disk search. Files with other extensions, deeper directories, archives, deleted files, online-only files and other user profiles are not cleared by this result. Directory-read failures were skipped by the scanner, so this is not an exhaustive accessibility assertion.

## Required Q07 schema and completeness contract

Canonical source: [query review, Q07 — relevant default ACL entries decoded](rental-contracts-production-catalog-query-review.md#q07--relevant-default-acl-entries-decoded), lines 306–322. Expected columns, in order:

1. creating_owner
2. target_schema
3. defaclobjtype
4. grantor
5. grantee
6. privilege_type
7. is_grantable
8. rows_total

The reviewed query expands pg_default_acl through aclexplode, includes all creator-global entries and entries in identity, tenancy, app_private, public and supabase_migrations, and uses count(*) OVER() with LIMIT 1000. A recovered original must be parsed completely, validate record widths/types/nulls and compare its actual record count to every rows_total. The LEFT JOIN can preserve empty ACL entries with null expansion fields; such rows must not be discarded as malformed automatically.

| Requested verification | Finding |
|---|---|
| Exact original export path | MISSING / not established |
| Original export SHA-256 | UNKNOWN; no Q07 file to hash |
| Actual Q07 exported record count | UNKNOWN, not zero; 96 is a documented reported count only |
| Actual column structure/types/nullability/malformed records | NOT VERIFIED; expected schema above is SQL-source evidence only |
| rows_total consistency / completeness / truncation | NOT VERIFIED; LIMIT 1000 does not establish a particular export is complete |
| Creator roles, schemas, object types | NOT independently recovered |
| Grantors, grantees, privileges and grant options | NOT independently recovered |
| Execution project, database, role and timestamp | UNKNOWN for the original Q07 execution |

## Candidate discrimination

The four Supabase-named CSVs in Downloads were checked by actual headers:

| Existing path under C:/Users/lenovo/Downloads | Schema finding |
|---|---|
| Supabase Snippet Untitled query (3).csv | 32-column Q03 table/column privilege schema, including schema_name, table_name, exact_executor and effective_table_privileges; lacks Q07 creator/default-ACL schema. Rejected as Q07 |
| Supabase Snippet Untitled query (1).csv | Single to_regclass column; rejected |
| Supabase Snippet Untitled query (2).csv | Unrelated application-table export structure; rejected; no row values inspected for this review |
| Supabase Snippet Untitled query.csv | Unrelated application-table export structure; rejected; no row values inspected for this review |

The existing docs/evidence/q16-production-catalog-export.json is dependency-graph evidence, not Q07 default ACL evidence. Neither Q03 nor Q16 supplies missing Q07 field values or execution context. Existing exports were not modified, copied or renamed.

## Cross-check with existing reports

| Existing source | Supported conclusion | Unresolved limitation |
|---|---|---|
| [Batch 2 verification](rental-contracts-production-catalog-batch2-verification.md), Q07 section lines 60–66 and SQL digest line 118 | Independently reviewed query candidate, expected default-ACL scope and interpretation limits | Query SAFE status and SQL digest are not an export hash or execution proof |
| [Consolidated assessment](rental-contracts-production-catalog-q01-q16-consolidated-readiness.md), Q07 row line 78 | Reports successful execution, 96 rows and broad schema-public defaults | No original rows recovered to reconcile precise creator/grantor/grantee/options |
| [Authority/ACL gap matrix](rental-contracts-phase1a-authority-acl-evidence-gap-matrix.md), lines 47–50, 135 and 180 onward | Explicitly labels Q07 96 rows as reported, prioritizes original recovery and creator-global/schema function-default evidence | This search does not close G2 or bind the future migration executor |
| [Restrictive ACL policy proposal](rental-contracts-phase1a-restrictive-acl-policy-proposal.md), lines 23 and 124–127 | All 18 initial ACLs remain unknown; creator/default behavior must be separated from desired policy | No new function ACL or effective-privilege evidence recovered |

No contradiction in the reported 96-row claim was established. Its independent raw verification remains missing. The phrase broad public defaults is insufficient to infer EXECUTE to the pseudo-role PUBLIC: schema public and grantee PUBLIC are different fields.

## Execution-context evidence

Q07 returns neither current_user/session_user nor project/database/execution timestamp. creating_owner and grantor identify ACL metadata principals, not the query executor. The inspected files supplied no matching Q07 export or associated execution-context artifact. Filesystem timestamps cannot establish SQL execution time; context from a Q03 snapshot cannot authenticate Q07's session or the future migration executor.

## Security interpretation and remaining unknowns

Observed here: the canonical query text and historical reports. The actual Q07 ACL rows remain unavailable. No specific creator, grantee, grant option or function-kind default is therefore newly confirmed.

Creator-global defaults replace the hardwired baseline; per-schema defaults add grants. Defaults apply to future objects created by the relevant creating role, rather than automatically applying defaults of inherited roles. They are not retroactive and do not establish existing function ACLs after ownership transfer. Missing pg_default_acl records are not proof of denied privileges. Direct default grants, PUBLIC grants, role inheritance, effective EXECUTE and actual grantor/owner/SET authority require separate evidence.

Even a complete original 96-row export would be a snapshot limited to the query's schema scope. It would not by itself establish future migration-executor identity, current membership paths, privilege-change authority, or all 18 functions' initial/final ACLs. No Production readiness conclusion follows from the reported count.

## Minimum next evidence

Ask the evidence custodian for the already collected original Q07 CSV/JSON and its existing execution record: project/database context, executing role, timestamp, query ID/exact SQL reference, and any export/truncation warnings. Preserve the original file, then hash and parse it completely. Do not reconstruct a missing original from reports. A new Q07 execution is outside this task and requires separate authorization; none is proposed or performed here.

Only this recovery report was created. Original evidence, SQL drafts, roles, flags and application code were untouched. No commit, push or deployment occurred.
