/** Fixed A02 offline packaging; no CLI, network or SQL execution.
 * Only the explicitly called materializer writes a new isolated temporary package.
 */
import { readFile,mkdtemp,mkdir,writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash,randomUUID,randomBytes } from 'node:crypto';
import { renderCohortArtifact,validateCohort } from './a02-cohort-artifacts.mjs';
import { createInMemoryCredentialProvider } from './a02-private-input.mjs';
const projectRef='gllsiklbvqpxzucvkehw';
const baseline=['20261115000000','20261115000100','20261115000200','20261115000300','20261115000400','20261115000500','20261115000600','20261116000700'];
const fail=()=>{throw Error('A02_PACKAGE_BLOCKED');};
const hash=text=>createHash('sha256').update(text).digest('hex');
const clone=input=>{try{return structuredClone(input);}catch{fail();}};

export function nominateSyntheticCohort({now=Date.now(),lifetimeMs=600000,uuid=randomUUID}={}) {
  if(!Number.isSafeInteger(lifetimeMs)||lifetimeMs<60000||lifetimeMs>900000||typeof uuid!=='function')fail();
  // New UUIDs are nominations ONLY, not evidence of database absence or Auth users.
  return validateCohort({projectRef,A:uuid(),B:uuid(),U:uuid(),expiresAt:new Date(now+lifetimeMs).toISOString()},now);
}

/** New synthetic secrets only. No env/argv/file/storage reads or output.
 * Caller explicitly approves the domain; this is an assertion, not ownership proof.
 * Pass provider to future Auth Admin creation and bootstrap IN THE SAME process.
 */
export function syntheticCredentialProvider(input,{approvedDomain,domainOwnershipConfirmed,bytes=randomBytes}={}) {
  const cohort=validateCohort(input,Date.parse(input?.expiresAt)-1);
  if(domainOwnershipConfirmed!==true||typeof approvedDomain!=='string'||approvedDomain.length>190
    ||!/^([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(approvedDomain)||typeof bytes!=='function')fail();
  const values={};
  for(const label of ['A','B','U']){
    const password=bytes(32);
    if(!Buffer.isBuffer(password)||password.length!==32)fail();
    values[label]={email:`a02-${label.toLowerCase()}-${cohort[label]}@${approvedDomain}`,password:password.toString('base64url')};
    password.fill(0); // temporary bytes only; JS strings/GC are NOT guaranteed erased
  }
  return createInMemoryCredentialProvider(values);
}

const config=`#:schema https://supabase.com/schemas/config/v1.json
# ISOLATED DEVELOPMENT A02 PACKAGE. No linked project; explicit --remote required.
project_id = "contratpro-a02-gllsiklbvqpxzucvkehw"
[db]
major_version = 17
[db.migrations]
enabled = true
schema_paths = []
[db.seed]
enabled = false
sql_paths = []
`;

/** One pending stage only. Include exact archived applied bytes to satisfy native history.
 * appliedTemporary: [] for install; [install] for disable/remove; [install,disable]
 * for removal after disable. Each receipt is {kind,version,sql,sha256}.
 * Caller must independently bind receipts to reviewed committed Development history.
 */
export async function prepareA02NativePackage(input,{now=Date.now()}={}) {
  input=clone(input);
  if(!input||Object.keys(input).sort().join()!=='appliedTemporary,cohort,stage,version'
    ||!['install','disable','remove'].includes(input.stage)||!/^\d{14}$/.test(input.version)
    ||!Array.isArray(input.appliedTemporary))fail();
  const expected=input.stage==='install'?[]:input.stage==='disable'?['install']:input.appliedTemporary.length===2?['install','disable']:['install'];
  if(input.appliedTemporary.map(item=>item?.kind).join()!==expected.join())fail();
  const files={'supabase/config.toml':config};
  const approved=JSON.parse(await readFile(new URL('../docs/deployment-0007/manifest.json',import.meta.url),'utf8'));
  if(approved.projectRef!==projectRef||approved.migrations.length!==8
    ||approved.migrations.map(entry=>entry.file.match(/\/(\d{14})_/)?.[1]).join()!==baseline.join())fail();
  const history=[];
  for(const entry of approved.migrations){
    if(!/^supabase\/migrations\/\d{14}_[a-z0-9_]+\.sql$/.test(entry.file))fail();
    const sql=await readFile(new URL(`../${entry.file}`,import.meta.url),'utf8');
    if(hash(sql)!==entry.sha256)fail();
    files[entry.file]=sql;history.push(entry.file.match(/\/(\d{14})_/)[1]);
  }
  let previous=history.at(-1);
  for(const receipt of input.appliedTemporary){
    if(!receipt||Object.keys(receipt).sort().join()!=='kind,sha256,sql,version'||!/^\d{14}$/.test(receipt.version)
      ||receipt.version<=previous||typeof receipt.sql!=='string'||hash(receipt.sql)!==receipt.sha256)fail();
    // Bind archived bytes to this fixed template/cohort; source drift blocks, never rewrites history.
    const rendered=await renderCohortArtifact(receipt.kind,input.cohort,{
      now:receipt.kind==='install'?Date.parse(input.cohort?.expiresAt)-1:now,allowExpiredRemoval:true});
    if(rendered!==receipt.sql)fail();
    files[`supabase/migrations/${receipt.version}_a02_fixture_${receipt.kind}.sql`]=receipt.sql;
    history.push(receipt.version);previous=receipt.version;
  }
  if(input.version<=previous)fail();
  const sql=await renderCohortArtifact(input.stage,input.cohort,{now,allowExpiredRemoval:input.stage!=='install'});
  const pending=`supabase/migrations/${input.version}_a02_fixture_${input.stage}.sql`;
  files[pending]=sql;
  const manifest={status:'BLOCKED_PENDING_LIVE_EVIDENCE_AND_APPROVAL',projectRef,environment:'development',cliVersion:'3.1.0',
    stage:input.stage,cohort:clone(input.cohort),expectedRemoteBefore:history,requiredPending:[input.version],pending,
    files:Object.fromEntries(Object.entries(files).map(([name,text])=>[name,hash(text)])),
    activationAuthorized:false,liveExecutionAuthorized:false};
  return {files,manifest};
}

/** Explicit OFFLINE file creation only; no caller-selected directory or execution. */
export async function materializeA02NativePackage(input,options) {
  const prepared=await prepareA02NativePackage(input,options);
  const root=await mkdtemp(join(tmpdir(),'contratpro-a02-package-'));
  await mkdir(join(root,'supabase'));
  await mkdir(join(root,'supabase','migrations'));
  for(const [name,content] of Object.entries(prepared.files)) {
    await writeFile(join(root,name),content,{flag:'wx',mode:0o600});
  }
  // Manifest last: an interrupted package without its manifest is never deployable.
  await writeFile(join(root,'a02-package-manifest.json'),JSON.stringify(prepared.manifest,null,2),{flag:'wx',mode:0o600});
  return {root,manifest:prepared.manifest};
}
