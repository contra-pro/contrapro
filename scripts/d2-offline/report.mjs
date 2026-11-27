import {readFile,writeFile} from 'node:fs/promises';import {resolve} from 'node:path';import {checkPlan,root,output,sha} from './candidates.mjs';
const plan=await checkPlan(),deps=JSON.parse(await readFile(resolve(root,'.verification/d2/dependencies.json'),'utf8'));
if(deps.length!==16||deps.some(d=>d.unresolvedLexicalReferences.length||d.ddlConflicts.length))throw Error('Dependency/DDL predecessor review incomplete');
const scenarios={
 '0013':['Rental contracts','Exact vehicle/client/identity bridge/receipt helper baseline; new restricted rental writer; rejection of existing colliding rental objects','Concurrent draft/confirmation, number allocation, availability exclusion, cross-tenant IDs, rollback after DDL and role creation'],
 '0014':['Vehicle module','0008 vehicle schema/RLS and exact recorded prefix through 0013; new fields must not collide','Old vehicle payload retained, added category/fuel/transmission/status defaults, archive/restore, registration uniqueness and tenant checks'],
 '0015':['Rental MVP','Accepted 0013 rental objects and 0014 vehicle fields','Driver/version lifecycle, stale writes, overlapping rentals, immutable confirmed versions, return transitions'],
 '0016':['Contract documents and private Storage','0013–0015; reviewed native Auth/Storage fixture and pre-existing policy-owner authority; contract-documents absent','Private 10 MiB PDF/DOCX bucket, path/tenant access, renderer key absent failure, generation deduplication and version/object integrity'],
 '0017':['Signing engine','0016 artifact/document references, rental writer and synthetic key configuration only for explicit positive tests','Session/invitation token replay, expiry/rate limits, consent and evidence immutability, concurrent sign/decline, object binding'],
 '0018':['Delivery orchestration','0017 signing evidence and 0016 document artifacts; new restricted delivery worker','Claim/lease concurrency, retry/backoff, deduplication, outbox/evidence atomicity; transport injected, no email/provider'],
 '0019':['Google Sheets','0018 worker contracts and rental snapshot, restricted sheets worker','Tenant/outbox ordering, lease expiry, connection revocation, retries and deduplication with fake transport; no Google tokens'],
 '0020':['Billing dependency structures','0019 suffix and signing admission wrapper prerequisites; restricted billing writer; no commercial activation','Inert missing configuration, reservation/usage idempotency and concurrent admission with synthetic plans; payment/pricing decisions remain deferred'],
 '0021':['Agency rental workflows','Accepted 0013–0020, restricted A1 writer, prior Sheets/delivery functions to rename','Agency/member/branding/operations permissions, tenant ownership, concurrent agency/signatory updates, atomic rental/payment records'],
 '0022':['Previews and clauses','0016 documents plus 0021; exact old Storage policies and policy-owner authority','Atomic replacement of two Storage policies, stale preview rejection, reviewed-input binding, custom fields and unsigned preview separation'],
 '0023':['Reminders and delivery recovery','0022 plus signing/delivery wrapper chains','Concurrent reminder slots, recovery deduplication, cancellation/expiry and bounded worker retry'],
 '0024':['Archive, Sheets creation and billing composition','0023, original Sheets and billing public wrappers','Archive idempotency, concurrent Sheets creation, billing reservations, no provider success simulation'],
 '0025':['Operational readiness','0024 operational queues and new restricted maintenance role','Claim/finalize concurrency, retention holds, incident/rotation/reconciliation state and shutdown; no real backup/deletion/provider work'],
 '0026':['Navigation capabilities','0025 and existing auth/agency access contracts','Positive/negative tenant capability projections and missing-environment behavior; no feature-gate activation'],
 '0027':['Registration and onboarding','0026 plus canonical identity/agency writer and workflow contracts','Preserve pre-existing synthetic Auth users and mappings; confirmation/provisioning retry, profile/legal-version guards, agency/invitation authorization with synthetic legal documents'],
 '0028':['Internal signature representation','0027 prefix and prior signing_command signature','Exact FR/AR consent notices, typed/drawn capture bounds, signatory authority, immutable prior evidence, concurrent retries and source-function rename chain']
};
const sections=plan.manifest.migrations.map(m=>{
 const d=deps.find(d=>d.logical===m.logical),s=scenarios[m.logical];return `## ${m.logical} — ${s[0]}

- Source: [${m.source}](../${m.source}), raw SHA-256 \`${m.sourceSha256}\`.
- Native-test executable: [${m.file}](../${output}/${m.file}), SHA-256 \`${m.candidateSha256}\`. Status: generated, offline parsed, **not native accepted / not a managed release**.
- Predecessor: exact native prefix ending ${m.dependencies[0]} (${m.expectedHistory.length} records); ${s[1]}. Name-level dependency report resolves ${d.priorReferences.length} prior references, ${d.renameOrigins.length} rename origins and ${d.declaredHere.length} in-file names. Types/arguments/columns/dynamic SQL remain native obligations.
- Transaction: candidate owns BEGIN/COMMIT, 2s lock/30s statement/10s idle bounds, nonblocking transaction advisory lock, explicit history-table lock and exactly one history INSERT in the same transaction; no nested source BEGIN/ROLLBACK.
- Objects: ${m.expectedObjects.tables.length} new ordinary tables, ${m.expectedObjects.functions.length} created/replaced/renamed function names. Table postchecks require postgres ownership; ${m.expectedObjects.rls.length} explicitly declared RLS/force flags are asserted. Dynamic DO-loop grants/ownership remain source-retained and native-verified, not falsely resolved by lexical analysis.
- Authority: ${m.authorityRoles.join(', ')||'no temporary writer-role authority'}. New roles: ${m.newRoles.join(', ')||'none'}. Snapshot the executor's own grantor edge and effective CREATE rights; temporary INHERIT/SET/ADMIN and only missing public/app_private CREATE rights are restored before commit. Writer NOLOGIN/NOSUPERUSER/NOBYPASSRLS/NOINHERIT/NOCREATEROLE/NOCREATEDB/NOREPLICATION asserted; new SECURITY DEFINER PUBLIC EXECUTE rejected. ${m.providerPolicyOwnerRequired?'Provider policy-owner authority must already be valid; candidate refuses rather than grants/changes provider ownership.':'No provider policy-owner workaround is added.'}
- Preservation: preserve all old Auth, identity, tenancy, receipt, platform and Storage rows via transaction-private before/after JSON containment; additions are allowed, old field values/deletions are rejected. An intended data transformation that fails this check requires a separately reviewed migration contract, not removal of the assertion. No real user data is used in native fixtures.
- Postconditions: source-declared objects/RLS, restored temporary authority, limited writer roles, no definer PUBLIC EXECUTE leak, baseline rows intact and exact prefix extended by ${m.id}. ${m.logical==='0016'?'Also assert private contract-documents, 10485760-byte limit and exactly PDF/DOCX MIME types.':''}
- Failure/recovery: any error rolls back source/temporary grants/history together; stop clients, retain private diagnostics and verify the isolated schema/history before another authorization. Lost COMMIT response is UNKNOWN; no automatic replay/down/delete/history repair.
- Native acceptance: ${s[2]}.
`;});
const intro=`# D2 per-migration native-test candidate contracts

2026-11-27. All sixteen candidates are separate derivatives of pinned historical drafts. They replace exactly the parser-identified unconditional design-stop and outer BEGIN/ROLLBACK **in new files**, then add explicit isolated-target/authority/data/object/history contracts. This is reviewed offline derivation, not permission to apply the guarded sources or a claim that historical/provenance blockers disappeared.

Manifest: [${output}/manifest.json](../${output}/manifest.json), SHA-256 \`${sha(JSON.stringify(plan.manifest,null,2)+'\n')}\`. Full retained/excluded statement fingerprints and object lists are in that manifest; [source inventory](d1-local-migration-inventory.md) supplies detailed dependencies, grants, policies and constraints for each historical file. Candidate files are not listed in the canonical supabase/migrations directory and no existing runner was repointed at them.

Every candidate is bound to database contratpro_d2_native, port 54329, loopback, PG17.11, TLS, non-superuser administrative postgres and explicit synthetic-offline plan/baseline settings. **It refuses the managed target (database postgres/port 5432).** The baseline setting labels candidate-synthetic vs provenance-reproduced; neither setting proves source provenance. A future operator must verify manifest/source hashes before execution. There is currently no authorized native executor.

The smallest suitable native fixture can validate SQL, ownership/RLS and multi-session concurrency, but cannot validate real Supabase Auth/Storage API/JWT/provider behavior. Source 0016 includes bucket metadata and policies; these execute only in an explicitly authorized provider-schema fixture with policy-owner authority. Managed bucket/API setup is a distinct later plan.

Offline SQL parse: 16/16. Standalone PL/pgSQL parse: 15/16; 0013 retains the exact source catalogue-dependent error \`r.starts_at is not a known variable\`. PostgreSQL compilation/execution, data compatibility, ownership and concurrent acceptance have not run. Name-level dependency closure and rename predecessors resolve; this does not prove native semantic compatibility.

${sections.join('\n')}
`;
await writeFile(resolve(root,'docs/d2-candidate-contracts.md'),intro.split('\n').map(line=>line.trimEnd()).join('\n'));console.log(JSON.stringify({contracts:sections.length,manifestSha256:sha(JSON.stringify(plan.manifest,null,2)+'\n'),sqlExecuted:false}));
