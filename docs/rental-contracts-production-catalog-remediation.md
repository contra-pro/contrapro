# Rental Contracts Phase 1A — Offline catalog query remediation

**NOT EXECUTED. Production deployment remains BLOCKED / NO-GO.**

This record documents source-only remediation of the [query package](rental-contracts-production-catalog-query-review.md).
It authorizes no database access. The [independent audit](rental-contracts-production-catalog-independent-audit.md)
remains unchanged: its historical verdict was **9 SAFE / 6 NEEDS REVISION / 1 BLOCKED**.
The earlier author's classifications do not override those findings.

## Changes and classifications

| Query | Independent finding before | Exact remediation | Author assessment after |
|---|---|---|---|
| Q03 | NEEDS REVISION: incomplete effective privilege evidence | Adds relation OID/column number, explicit decoded table/column ACLs, hardwired-default indicator, all PG17 table privileges including DELETE/TRUNCATE/TRIGGER/MAINTAIN and grant options, column privileges/options, owner role USAGE/SET and exact-executor context | SAFE metadata; independent re-review pending |
| Q05 | NEEDS REVISION: raw settings disclosure and incomplete fingerprint | Withholds unknown configuration values; reveals only exact approved search_path/row_security strings. Adds argument/type/language/security attributes, configuration counts, source/parsed-body/binary-reference fingerprints, support OID, extension and initial-ACL provenance | SAFE metadata; independent re-review pending |
| Q10 | NEEDS REVISION: incomplete trigger evidence | Includes internal and user triggers, enablement/current replication-mode applicability, update columns, argument count/fingerprint, constraints, deferral, transition names, exact function identity/security metadata and implementation fingerprints; retains policy fingerprints and counts the combined result | SAFE metadata; independent re-review pending |
| Q13 | NEEDS REVISION: insufficient history prerequisites | Adds exact relation/type identity, structure, key versus INCLUDE counts, SELECT/schema access, RLS/effective executor context, policy shape and explicit unresolved payload labels; returns a constant BLOCKED Q14 decision | SAFE metadata; independent re-review pending |
| Q15 | NEEDS REVISION: omitted PG17 MAINTAIN | Adds MAINTAIN/grant option, separates owner/role/executor evidence, identifies the OR privilege evidence for strong table locks without acquiring locks | SAFE metadata; independent re-review pending |
| Q16 | NEEDS REVISION: incomplete dependency evidence | Adds incoming/outgoing two-hop dependency traversal, exact quoted identities including overloaded functions, attached object roots, extension edges and shared owner/ACL edges; explicitly reports incomplete closure | SAFE metadata; independent re-review pending |

Post-remediation **author self-review**: **15 SAFE / 0 NEEDS REVISION / 1 BLOCKED**.
This is not a new independent approval. Q03/Q05/Q10/Q13/Q15/Q16 are eligible for a
subsequent independent review before separately authorized metadata collection.
The nine previously accepted SQL blocks and Q14 are byte-identical to the audited package.

## Evidence and safety rationale

Q03 separates stored ACL entries from effective privilege calculations: owner rights,
PUBLIC grants and inherited roles can affect effective answers. SET authority is not
the same as inherited USAGE. Neither proves CREATEROLE, authority to grant a future role,
ownership transfer, or the success of a future deployment transaction. Column grants do
not imply relation-wide grants. row_security_active is labeled for the actual executor,
not the cross-joined role. Missing objects/roles and NULLs are unresolved evidence.

Q05 does not emit raw proconfig, function source, parsed bodies, binary paths or secret
hashes of unknown configuration values. Only safe setting literals and configuration
keys are disclosed. prosrc alone is insufficient: parsed SQL bodies, binary references,
support functions and attributes matter. Hash equality is not semantic equivalence;
internal-node fingerprints contain catalog OIDs and are not portable across clusters.
The binary-reference fingerprint does not hash library bytes. Unknown fingerprints or
settings require independent source review; no complete implementation proof is claimed.
Initial ACL metadata is provenance, not a substitute for current or effective ACLs.

Q10 distinguishes disabled triggers and replica/origin applicability from active
enforcement. Enablement alone does not prove the trigger body enforces tenant rules.
Argument/WHEN/body hashes avoid unnecessary raw values but require trusted comparison
evidence. Constraints, trigger type bits and deferred execution must be interpreted
together. Internal triggers are not silently excluded. No trigger function is invoked.

Q15 includes PG17 MAINTAIN among relevant object privileges for strong table-lock
authority. MAINTAIN does not confer arbitrary ALTER/DROP, role administration or ownership.
No privilege is exercised and no lock is acquired by the query.

Q16 supplies exact catalog addresses and pg_identify_object identities, not a complete
application call graph. Roots include required relations/helpers and their attached
indexes, constraints, policies, triggers and row types. Expansion is limited to listed
application namespaces/attached objects and two declared-dependency hops. Shared edges
can extend one hop beyond visited nodes. Core/extension/other-schema endpoints are
reported without unrestricted expansion. Dynamic SQL, string-body references, external
libraries and unvisited objects remain unresolved. LIMIT bounds output, not planner work;
platform timeouts and narrower review are required for unexpected graph growth. Absence
of an edge never proves absence of a dependency.

## Q13 / Q14 decision

Q13 observes catalogs only. Its prerequisites boolean is a screening aid, never approval.
Unexpected relation kind, custom type, inheritance, rules, missing SELECT/schema access,
active RLS, unknown policies, missing/ambiguous keys or truncated results fail closed.
RLS activity is assessed for the exact current executor and snapshot; policy metadata
alone cannot certify complete content visibility. Column names/types cannot prove that
the version values contain no sensitive payloads.

**Q14 remains BLOCKED**, even if Q13 executes successfully or its screening flag is true.
Independent evidence must establish the intended project/executor, exact history-table
identity, expected structure, authorized SELECT access, sufficient visibility and
acceptable disclosure risk. Explicit approval for history-content inspection is also
required. Any uncertainty preserves the block. Q14 SQL was not modified.

## Offline verification

Reviewed the readiness report, Phase 1A design, original guarded rental draft, relevant
0001–0012 migration/draft dependencies, query package and independent audit. No new
Production evidence was acquired. No original migration or application file changed.

- All 16 SQL blocks parsed with the installed pgsql-parser PostgreSQL 18 AST parser.
- Each contains exactly one SELECT; nested AST traversal found no non-SELECT statements.
- Function calls were inventoried and reviewed: ACL/role checks, catalog identity and
  definition inspection, current context, aggregates, JSON construction, string/array
  transformations and SHA256 encoding only. No application RPC, mutating function,
  advisory lock, role switch, temporary object or transaction command is present.
- pg_identify_object identifies an object without executing it; to_regprocedure and
  to_regrole resolve identities. pg_get_constraintdef deparses catalog definitions.
  row_security_active reports current-executor RLS activity without reading business rows.
- PostgreSQL 17 catalog semantics were checked against official documentation for
  pg_proc, pg_trigger, pg_index, pg_shdepend, role/ACL inquiry functions and object identity.
- SQL preservation checks confirmed only Q03/Q05/Q10/Q13/Q15/Q16 changed; independent
  audit content remained identical. Relative links and trailing whitespace were checked.

Parser acceptance is syntax evidence only: its major version is 18, not a PostgreSQL 17
runtime. No SQL, PostgreSQL process, connection or harness was executed. Catalog access,
runtime types, permissions, workload and provider behavior remain unverified.

Query-package SHA256 after remediation:
`8c7627a878a575f52b2ddd248a2796eadc6c0d94f0aebdcd4a38214d70d678bc`.

## Remaining blockers and next step

Production execution authority is not established by local SUPERUSER bootstrap or the
20/20 local integration results. Exact non-superuser role creation/SET/grantor paths,
ownership transfers, final ACL/default handling, provider restrictions, dependency
compatibility and a reviewed atomic deployment/history/serialization design remain
release blockers. The rental deployment guard remains intact. This package neither
prepares nor authorizes a deployment script.

Next: independently review the six revised queries, then obtain separate authorization
for bounded metadata collection bound to the intended project and executor, with output
custody/timeouts agreed. Q14 needs its own independent prerequisites and explicit content
approval. No metadata result alone constitutes Production deployment approval.

References: [PG17 privilege inquiry](https://www.postgresql.org/docs/17/functions-info.html),
[pg_trigger](https://www.postgresql.org/docs/17/catalog-pg-trigger.html),
[pg_proc](https://www.postgresql.org/docs/17/catalog-pg-proc.html),
[pg_index](https://www.postgresql.org/docs/17/catalog-pg-index.html),
[pg_shdepend](https://www.postgresql.org/docs/17/catalog-pg-shdepend.html).
