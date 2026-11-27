import {readFile} from 'node:fs/promises';import {resolve} from 'node:path';import {repository,sha} from './resources.mjs';
export const id=n=>`d2000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
export const people=[{sub:id(1),user:id(101),agency:id(201),member:id(301),role:id(401)},{sub:id(2),user:id(102),agency:id(202),member:id(302),role:id(402)}];
export async function baselinePlan(){const inventory=JSON.parse(await readFile(new URL('./baseline-sources.json',import.meta.url),'utf8'));const source=[];for(const expected of inventory){const bytes=await readFile(resolve(repository,expected.path));if(sha(bytes)!==expected.sha256)throw Error('Synthetic baseline local source changed');source.push({...expected,text:bytes.toString()});}return {profile:'independent-synthetic-model-not-0009-variant',historicalProvenance:false,source,provider:await readFile(new URL('./provider-fixture.sql',import.meta.url),'utf8'),receipt:await readFile(new URL('./receipt-model.sql',import.meta.url),'utf8')};}
export async function installBaseline(db,plan,history){
 await db.query('BEGIN');try{await db.query(plan.provider);await db.query('COMMIT');}catch(e){await db.query('ROLLBACK');throw e;}
 for(const item of plan.source){await db.query('BEGIN');try{await db.query(item.text);await db.query("INSERT INTO supabase_migrations.schema_migrations(version,name) VALUES($1,'D2_SYNTHETIC_LOCAL_SOURCE_CONTRACT_NOT_DEPLOYED_BYTES')",[item.path.split('/').at(-1).slice(0,14)]);await db.query('COMMIT');}catch(e){await db.query('ROLLBACK');throw e;}}
 await db.query('BEGIN');try{
  await db.query(plan.receipt);
  for(const version of history.slice(9))await db.query("INSERT INTO supabase_migrations.schema_migrations(version,name) VALUES($1,'D2_SYNTHETIC_MODEL_MARKER_NOT_DEPLOYED_SOURCE_PROOF')",[version]);
  for(const p of people){await db.query('INSERT INTO auth.users(id) VALUES($1)',[p.sub]);await db.query("INSERT INTO identity.users(id,state) VALUES($1,'active')",[p.user]);await db.query('INSERT INTO identity.supabase_users(supabase_user_id,user_id) VALUES($1,$2)',[p.sub,p.user]);await db.query("INSERT INTO tenancy.agencies(id,name,state) VALUES($1,'D2 SYNTHETIC ONLY','active')",[p.agency]);await db.query('INSERT INTO tenancy.memberships(id,agency_id,user_id) VALUES($1,$2,$3)',[p.member,p.agency,p.user]);await db.query("INSERT INTO tenancy.roles(id,agency_id,key,name) VALUES($1,$2,'owner','D2 synthetic owner')",[p.role,p.agency]);await db.query('INSERT INTO tenancy.membership_roles(agency_id,membership_id,role_id) VALUES($1,$2,$3)',[p.agency,p.member,p.role]);}
  await refreshPermissions(db);await db.query('COMMIT');
 }catch(e){await db.query('ROLLBACK');throw e;}
}
export async function refreshPermissions(db){for(const p of people)await db.query('INSERT INTO tenancy.role_permissions(agency_id,role_id,permission_key) SELECT $1,$2,key FROM tenancy.permissions ON CONFLICT DO NOTHING',[p.agency,p.role]);}
