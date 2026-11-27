// Offline-only compiler. Imports and CLI never connect, execute SQL or provision anything.
import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
import {parse} from 'pgsql-parser';
export const root=resolve(import.meta.dirname,'../..');
export const output='supabase/migration-candidates/d2-native-synthetic-v1';
export const planId='contratpro-d2-0013-0028-v1';
export const sha=b=>createHash('sha256').update(b).digest('hex');
const quote=s=>"'"+s.replaceAll("'","''")+"'";
const rolesByVersion={13:['contratpro_rental_writer'],14:[],15:['contratpro_rental_writer'],16:['contratpro_rental_writer'],17:['contratpro_rental_writer'],18:['contratpro_rental_writer','contratpro_delivery_worker'],19:['contratpro_rental_writer','contratpro_sheets_worker'],20:['contratpro_rental_writer','contratpro_billing_writer'],21:['contratpro_rental_writer','contratpro_delivery_worker','contratpro_sheets_worker','contratpro_a1_writer'],22:['contratpro_rental_writer'],23:['contratpro_rental_writer'],24:['contratpro_rental_writer','contratpro_sheets_worker','contratpro_billing_writer'],25:['contratpro_rental_writer','contratpro_billing_writer','contratpro_maintenance'],26:['contratpro_rental_writer'],27:['contratpro_rental_writer','contratpro_agency_writer'],28:['contratpro_rental_writer']};
const preserve=['auth.users','storage.buckets','storage.objects','identity.users','identity.supabase_users','tenancy.agencies','tenancy.memberships','tenancy.roles','tenancy.permissions','tenancy.role_permissions','tenancy.membership_roles','tenancy.membership_invitations','tenancy.agency_settings','tenancy.audit_events','tenancy.clients','tenancy.vehicles','app_private.client_creation_receipts','platform.admin_identities'];
export function segments(bytes,ast){return ast.stmts.map(s=>({stmt:s.stmt,kind:Object.keys(s.stmt)[0],text:bytes.subarray(s.stmt_location??0,s.stmt_len?(s.stmt_location??0)+s.stmt_len:bytes.length).toString('utf8').trim()}));}
export function sourceBody(bytes,ast,version){
 const parts=segments(bytes,ast),guards=parts.filter(p=>p.kind==='DoStmt'&&p.text.includes('$guard$'));
 if(version===14?guards.length!==0:guards.length!==1)throw Error('Unexpected design guard count');
 for(const guard of guards){const body=guard.stmt.DoStmt.args.find(a=>a.DefElem?.defname==='as')?.DefElem.arg.String.sval;if(!/^\s*BEGIN\s+RAISE EXCEPTION 'LOCAL DESIGN ONLY:[^']+';\s*END\s*$/s.test(body))throw Error('Refuse nontrivial guard transformation');}
 const tx=parts.filter(p=>p.kind==='TransactionStmt').map(p=>p.stmt.TransactionStmt.kind);
 if(JSON.stringify(tx)!==JSON.stringify(version===14?[]:['TRANS_STMT_BEGIN','TRANS_STMT_ROLLBACK']))throw Error('Unexpected source transaction contract');
 const retained=parts.filter(p=>p.kind!=='TransactionStmt'&&!guards.includes(p));
 if(retained.some(p=>/^(Dropdb|Createdb|Truncate|Copy|Vacuum|AlterSystem)/.test(p.kind)))throw Error('Unexpected operational statement');
 return {retained,excluded:parts.filter(p=>!retained.includes(p)).map(p=>({kind:p.kind,sha256:sha(p.text)}))};
}
function facts(parts){const tables=[],functions=[],rls=[],renames=[];for(const p of parts){if(p.kind==='CreateStmt'){const r=p.stmt.CreateStmt.relation;tables.push(r.schemaname+'.'+r.relname);}if(p.kind==='CreateFunctionStmt')functions.push(p.stmt.CreateFunctionStmt.funcname.map(x=>x.String.sval).join('.'));if(p.kind==='RenameStmt'&&p.stmt.RenameStmt.renameType==='OBJECT_FUNCTION'){const r=p.stmt.RenameStmt,names=r.object.ObjectWithArgs.objname.map(x=>x.String.sval),from=names.join('.'),to=[...names.slice(0,-1),r.newname].join('.');functions.push(to);renames.push({from,to});}if(p.kind==='AlterTableStmt'){const s=p.stmt.AlterTableStmt;for(const c of s.cmds??[]){const type=c.AlterTableCmd?.subtype;if(['AT_EnableRowSecurity','AT_ForceRowSecurity'].includes(type))rls.push({relation:s.relation.schemaname+'.'+s.relation.relname,flag:type==='AT_EnableRowSecurity'?'relrowsecurity':'relforcerowsecurity'});}}}return {tables,functions:[...new Set(functions)],rls,renames};}
function objectPost(objects){return `DO $d2_objects_post$ BEGIN
${objects.tables.map(name=>` IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid=${quote(name)}::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;`).join('\n')}
${objects.rls.map(x=>` IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid=${quote(x.relation)}::regclass AND ${x.flag}) THEN RAISE EXCEPTION 'D2 declared RLS invariant missing';END IF;`).join('\n')}
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace,
 LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
 WHERE (n.nspname||'.'||p.proname)=ANY(ARRAY[${objects.functions.map(quote).join(',')||"''"}]::text[]) AND p.prosecdef AND a.grantee=0 AND a.privilege_type='EXECUTE') THEN RAISE EXCEPTION 'D2 definer PUBLIC execute leak';END IF;
END $d2_objects_post$;`;}
const authority=roles=>`
CREATE TEMP TABLE d2_authority(role_name name PRIMARY KEY, own_edge jsonb, create_public boolean, create_private boolean) ON COMMIT DROP;
CREATE FUNCTION pg_temp.d2_authorize(wanted name) RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $d2$
DECLARE role_oid oid; edge jsonb; BEGIN
 IF wanted::text<>ALL(ARRAY[${roles.map(quote).join(',')||"''"}]::text[]) THEN RAISE EXCEPTION 'D2 role outside manifest';END IF;
 IF EXISTS(SELECT 1 FROM pg_temp.d2_authority WHERE role_name=wanted) THEN RETURN;END IF;
 SELECT oid INTO STRICT role_oid FROM pg_catalog.pg_roles WHERE rolname=wanted
 AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolreplication AND NOT rolinherit;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_auth_members WHERE roleid=role_oid AND member='postgres'::regrole AND admin_option) THEN RAISE EXCEPTION 'D2 lacks existing ADMIN authority';END IF;
 SELECT jsonb_build_object('admin',admin_option,'inherit',inherit_option,'set',set_option) INTO edge FROM pg_catalog.pg_auth_members
 WHERE roleid=role_oid AND member='postgres'::regrole AND grantor='postgres'::regrole;
 INSERT INTO pg_temp.d2_authority VALUES(wanted,edge,
 pg_catalog.has_schema_privilege(role_oid,'public','CREATE'),pg_catalog.has_schema_privilege(role_oid,'app_private','CREATE'));
 EXECUTE format('GRANT %I TO postgres WITH ADMIN TRUE, INHERIT TRUE, SET TRUE GRANTED BY postgres',wanted);
 IF NOT pg_catalog.has_schema_privilege(role_oid,'public','CREATE') THEN EXECUTE format('GRANT CREATE ON SCHEMA public TO %I',wanted);END IF;
 IF NOT pg_catalog.has_schema_privilege(role_oid,'app_private','CREATE') THEN EXECUTE format('GRANT CREATE ON SCHEMA app_private TO %I',wanted);END IF;
END $d2$;
REVOKE ALL ON FUNCTION pg_temp.d2_authorize(name) FROM PUBLIC;
`;
const restore=`
DO $d2_restore$
DECLARE r record; observed jsonb; BEGIN
 FOR r IN SELECT * FROM pg_temp.d2_authority ORDER BY role_name LOOP
  IF NOT r.create_public THEN EXECUTE format('REVOKE CREATE ON SCHEMA public FROM %I',r.role_name);END IF;
  IF NOT r.create_private THEN EXECUTE format('REVOKE CREATE ON SCHEMA app_private FROM %I',r.role_name);END IF;
  IF r.own_edge IS NULL THEN EXECUTE format('REVOKE %I FROM postgres GRANTED BY postgres RESTRICT',r.role_name);
  ELSE EXECUTE format('GRANT %I TO postgres WITH ADMIN %s, INHERIT %s, SET %s GRANTED BY postgres',r.role_name,r.own_edge->>'admin',r.own_edge->>'inherit',r.own_edge->>'set');END IF;
  SELECT jsonb_build_object('admin',admin_option,'inherit',inherit_option,'set',set_option) INTO observed FROM pg_catalog.pg_auth_members
   WHERE roleid=r.role_name::regrole AND member='postgres'::regrole AND grantor='postgres'::regrole;
  IF observed IS DISTINCT FROM r.own_edge OR pg_catalog.has_schema_privilege(r.role_name,'public','CREATE') IS DISTINCT FROM r.create_public
   OR pg_catalog.has_schema_privilege(r.role_name,'app_private','CREATE') IS DISTINCT FROM r.create_private THEN RAISE EXCEPTION 'D2 authority restoration mismatch';END IF;
 END LOOP;
END $d2_restore$;
DROP FUNCTION pg_temp.d2_authorize(name);
`;
function preservation(){return `
CREATE TEMP TABLE d2_preservation(relation_name text,payload jsonb) ON COMMIT DROP;
DO $d2_preserve$
DECLARE rel text; BEGIN
 FOREACH rel IN ARRAY ARRAY[${preserve.map(quote).join(',')}] LOOP
  IF pg_catalog.to_regclass(rel) IS NULL THEN RAISE EXCEPTION 'D2 missing preservation relation';END IF;
  EXECUTE format('INSERT INTO pg_temp.d2_preservation SELECT %L,to_jsonb(t) FROM %s t',rel,rel::regclass);
 END LOOP;
END $d2_preserve$;
`;}
const preservationPost=`
DO $d2_preservation_post$
DECLARE rel text; missing boolean; BEGIN
 FOR rel IN SELECT DISTINCT relation_name FROM pg_temp.d2_preservation LOOP
  EXECUTE format('SELECT EXISTS(SELECT 1 FROM pg_temp.d2_preservation p WHERE p.relation_name=%L AND NOT EXISTS(SELECT 1 FROM %s t WHERE to_jsonb(t) @> p.payload))',rel,rel::regclass) INTO missing;
  IF missing THEN RAISE EXCEPTION 'D2 existing baseline row changed or missing';END IF;
 END LOOP;
END $d2_preservation_post$;
`;
export async function buildPlan(){
 const inventory=JSON.parse(await readFile(resolve(root,'.verification/d1/inventory.json'),'utf8'));
 const selected=inventory.filter(x=>/supabase\/migration-drafts\/202611\d{2}00(?:1[3-9]|2[0-8])00_/.test(x.path)).sort((a,b)=>a.path.localeCompare(b.path));
 if(selected.length!==16)throw Error('Expected sixteen sources');
 const base=inventory.filter(x=>x.path.startsWith('supabase/migrations/')).map(x=>x.path.split('/').at(-1).slice(0,14)).sort();
 base.push('20261118000800','20261118000900','20261118001000','20261119001100','20261119001200');
 const files=[],migrations=[];
 for(const [index,item]of selected.entries()){
  const version=13+index,id=item.path.split('/').at(-1).slice(0,14),logical=String(version).padStart(4,'0'),bytes=await readFile(resolve(root,item.path));
  if(sha(bytes)!==item.sha256||Number(id.slice(-4,-2))!==version)throw Error('Source lineage/order changed');
  const ast=await parse(bytes.toString('utf8')),body=sourceBody(bytes,ast,version),objects=facts(body.retained),roles=rolesByVersion[version],created=body.retained.filter(p=>p.kind==='CreateRoleStmt').map(p=>p.stmt.CreateRoleStmt.role);
  const existing=roles.filter(r=>!created.includes(r));
  const transformed=[];for(const p of body.retained){transformed.push(p.text+';');if(p.kind==='CreateRoleStmt'){if(!roles.includes(p.stmt.CreateRoleStmt.role))throw Error('Unplanned writer role');transformed.push(`SELECT pg_temp.d2_authorize(${quote(p.stmt.CreateRoleStmt.role)}::name);`);}}
  const prefix=[...base,...selected.slice(0,index).map(x=>x.path.split('/').at(-1).slice(0,14))];
  const text=`-- D2 NATIVE SYNTHETIC TEST CANDIDATE ONLY. NOT A MANAGED DEPLOYMENT ARTIFACT.
-- Source: ${item.path}; raw SHA256 ${item.sha256}
-- ${planId}; historical draft retained unchanged; native acceptance pending.
BEGIN;
SET LOCAL search_path=pg_catalog,pg_temp;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='30s';
SET LOCAL idle_in_transaction_session_timeout='10s';
DO $d2_target$ BEGIN
 IF current_database()<>'contratpro_d2_native' OR current_user<>'postgres' OR session_user<>'postgres'
 OR current_setting('server_version_num')<>'170011' OR inet_server_port() IS DISTINCT FROM 54329
 OR inet_server_addr() IS NULL OR NOT(inet_server_addr()=ANY(ARRAY['127.0.0.1'::inet,'::1'::inet]))
 OR current_setting('contratpro.d2_profile',true) IS DISTINCT FROM 'synthetic-offline'
 OR current_setting('contratpro.d2_plan_id',true) IS DISTINCT FROM '${planId}'
 OR COALESCE(current_setting('contratpro.d2_baseline',true),'') NOT IN('candidate-synthetic','provenance-reproduced')
 THEN RAISE EXCEPTION 'D2 isolated native target/baseline binding mismatch';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=current_user AND NOT rolsuper AND rolbypassrls AND rolcreaterole AND rolcreatedb AND rolreplication AND rolinherit AND rolcanlogin) THEN RAISE EXCEPTION 'D2 administrative login model mismatch';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_stat_ssl WHERE pid=pg_catalog.pg_backend_pid() AND ssl) THEN RAISE EXCEPTION 'D2 native TLS required';END IF;
 IF NOT pg_catalog.pg_try_advisory_xact_lock(1129337680,202611) THEN RAISE EXCEPTION 'D2 migration contender';END IF;
END $d2_target$;
LOCK TABLE supabase_migrations.schema_migrations IN SHARE ROW EXCLUSIVE MODE;
DO $d2_history$ BEGIN
 IF ARRAY(SELECT version FROM supabase_migrations.schema_migrations ORDER BY version) IS DISTINCT FROM ARRAY[${prefix.map(quote).join(',')}]::text[]
 THEN RAISE EXCEPTION 'D2 exact predecessor history mismatch';END IF;
END $d2_history$;
${preservation()}
${[16,22].includes(version)?`DO $d2_storage_owner$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class c WHERE c.oid='storage.objects'::regclass AND pg_catalog.pg_has_role(current_user,c.relowner,'USAGE')) THEN RAISE EXCEPTION 'D2 provider policy owner authority missing; no ownership/grant workaround';END IF;
END $d2_storage_owner$;`:''}
${authority(roles)}
${existing.map(r=>`SELECT pg_temp.d2_authorize(${quote(r)}::name);`).join('\n')}
-- Retained source statements; parser-classified design stop/outer BEGIN/ROLLBACK excluded.
${transformed.join('\n\n')}
-- Postconditions are in the same transaction as source changes and history.
${restore}
${preservationPost}
${objectPost(objects)}
${version===16?`DO $d2_bucket_post$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='contract-documents' AND name='contract-documents' AND NOT public AND file_size_limit=10485760 AND allowed_mime_types=ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']) THEN RAISE EXCEPTION 'D2 private bucket configuration mismatch';END IF;
END $d2_bucket_post$;`:''}
DO $d2_security_post$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=ANY(ARRAY[${roles.map(quote).join(',')||"''"}]::text[])
 AND (rolcanlogin OR rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication OR rolinherit)) THEN RAISE EXCEPTION 'D2 writer role widened';END IF;
END $d2_security_post$;
INSERT INTO supabase_migrations.schema_migrations(version) VALUES('${id}');
DO $d2_post$ BEGIN
 IF ARRAY(SELECT version FROM supabase_migrations.schema_migrations ORDER BY version) IS DISTINCT FROM ARRAY[${[...prefix,id].map(quote).join(',')}]::text[]
 THEN RAISE EXCEPTION 'D2 final history mismatch';END IF;
END $d2_post$;
COMMIT;
`;
  await parse(text);
  const file=item.path.split('/').at(-1);
  files.push({file,text});migrations.push({logical,id,file,source:item.path,sourceSha256:item.sha256,candidateSha256:sha(text),expectedHistory:prefix,dependencies:[index?String(version-1).padStart(4,'0'):'0012'],authorityRoles:roles,newRoles:created,expectedObjects:objects,providerPolicyOwnerRequired:[16,22].includes(version),excludedStatements:body.excluded,retainedStatements:body.retained.map(p=>({kind:p.kind,sha256:sha(p.text)})),transaction:'candidate owns BEGIN/COMMIT and one native history INSERT',status:'OFFLINE_EXECUTABLE_NATIVE_TEST_CANDIDATE_NOT_NATIVE_ACCEPTED_NOT_MANAGED_RELEASE'});
 }
 return {files,manifest:{schema:1,planId,profile:'native-synthetic-only',target:{database:'contratpro_d2_native',port:54329,serverVersionNum:170011,listen:'loopback-only'},baselineProvenance:'UNRESOLVED_0008_0009; candidate-synthetic is not faithful target upgrade acceptance',historyOwner:'candidate',sqlExecuted:false,managedReleaseApproved:false,storageConfiguration:'0016 retains private contract-documents bucket INSERT and policies; 0022 replaces two policies atomically; provider policy-owner authority must pre-exist in authorized native fixture; no managed configuration executed',migrations}};
}
export async function writePlan(){const plan=await buildPlan();await mkdir(resolve(root,output),{recursive:true});for(const file of plan.files)await writeFile(resolve(root,output,file.file),file.text,{flag:'wx'});await writeFile(resolve(root,output,'manifest.json'),JSON.stringify(plan.manifest,null,2)+'\n',{flag:'wx'});return plan;}
export async function refreshOwned(){const plan=await buildPlan(),old=JSON.parse(await readFile(resolve(root,output,'manifest.json'),'utf8'));if(old.planId!==planId||old.profile!=='native-synthetic-only'||old.managedReleaseApproved!==false||old.migrations.length!==16)throw Error('Not an owned native-test package');const names=(await readdir(resolve(root,output))).sort();if(JSON.stringify(names)!==JSON.stringify(['manifest.json',...plan.files.map(f=>f.file)].sort()))throw Error('Unexpected package files');for(const m of old.migrations){if(!plan.files.some(f=>f.file===m.file)||sha(await readFile(resolve(root,output,m.file)))!==m.candidateSha256)throw Error('Existing candidate edited; stop');}for(const f of plan.files)await writeFile(resolve(root,output,f.file),f.text);await writeFile(resolve(root,output,'manifest.json'),JSON.stringify(plan.manifest,null,2)+'\n');return plan;}
export async function checkPlan(){const plan=await buildPlan();for(const file of plan.files)if(await readFile(resolve(root,output,file.file),'utf8')!==file.text)throw Error('Generated candidate drift');if(await readFile(resolve(root,output,'manifest.json'),'utf8')!==JSON.stringify(plan.manifest,null,2)+'\n')throw Error('Manifest drift');return plan;}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){try{const arg=process.argv[2];if(!['--write','--check','--refresh-owned'].includes(arg)||process.argv.length!==3)throw Error('Use --write once, --check, or --refresh-owned');const p=await(arg==='--write'?writePlan():arg==='--refresh-owned'?refreshOwned():checkPlan());console.log(JSON.stringify({status:'OFFLINE_ONLY',migrations:p.files.length,sqlExecuted:false,output,manifestSha256:sha(JSON.stringify(p.manifest,null,2)+'\n')}));}catch(e){console.error('D2_OFFLINE_STOP: '+e.message);process.exitCode=1;}}
