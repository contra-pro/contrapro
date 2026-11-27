// Driver contract trace only: scripted results, not a database or a native acceptance substitute.
import {test} from 'node:test';import assert from 'node:assert/strict';import {parse} from 'pgsql-parser';import {runStage} from './scenarios.mjs';import {people,id} from './baseline.mjs';
test('complete staged scenario trace validates exact generated SQL/parameter arity and session isolation',async t=>{
 const trace=[],profiles=new Map(),rentals=new Map();let signature='none',claimed=false,oauth=false,latestSub=people[0].sub;const subjects=new Map();
 const response=value=>({rows:[{value}]});
 async function query(client,sql,args=[]){trace.push({client,sql,args});await parse(sql);const refs=[...sql.matchAll(/\$(\d+)/g)].map(x=>Number(x[1]));assert.equal(refs.length?Math.max(...refs):0,args.length,sql);
  if(sql==='BEGIN'||sql==='COMMIT'||sql==='ROLLBACK'||sql==='SET LOCAL ROLE anon'||sql==='SET LOCAL ROLE authenticated')return {rows:[]};
  if(sql==='SET LOCAL ROLE postgres')throw {code:'42501'};
  if(sql.includes("set_config('request.jwt.claim.sub'")){subjects.set(client,args[0]);return {rows:[]};}
  if(client==='admin'){
   if(sql.includes('number_serial'))return {rows:[{number_serial:'1',version:2}]};
   if(sql.includes('agency_signature::text'))return {rows:[{h:'unchanged-evidence'}]};
   if(sql.includes('b1_capture_valid'))return {rows:[{ok:JSON.parse(args[0]).consent===true}]};
   if(sql.includes('count(*)'))return {rows:[{n:sql.includes('auth.users')?2:1}]};
   if(sql.startsWith('INSERT INTO'))return {rows:[]};
   throw Error('Unmodelled administrative query '+sql);
  }
  const foreign=subjects.get(client)===people[1].sub;
  if(sql.includes('SELECT * FROM app_private'))throw {code:'42501'};
  if(foreign&&args[0]===people[0].agency)throw {code:'42501'};
  if(sql.includes('contratpro_client_create'))return response(id(500));
  if(sql.includes('contratpro_vehicle_create'))return response(id(501));
  if(sql.includes('contratpro_rental_create')){if(!rentals.has(args[1]))rentals.set(args[1],{id:id(600+rentals.size)});return response(rentals.get(args[1]));}
  if(/contratpro_rental_(confirm|start|complete)/.test(sql))return response({});
  if(sql.includes('contratpro_documents')){const action=args[1];if(action==='artifact'&&foreign)throw {code:'P0002'};if(action==='finish')return response({id:id(700),checksum:'a'.repeat(64)});return response({});}
  if(sql.startsWith('INSERT INTO storage.objects')){if(foreign&&args[0].startsWith(people[0].agency+'/'))throw {code:'42501'};return response(true);}
  if(sql.includes('contratpro_signing_')){const payload=JSON.parse(args[0]),action=payload.action;if(action==='create'){signature='awaiting_agency';return response({ok:true,value:{state:signature}});}if(action==='invite'&&signature==='awaiting_agency')throw {code:'22023'};if(action==='agency-sign')signature='agency_signed';if(action==='invite')signature='awaiting_client';if(action==='client-sign')signature='client_signed';if(action==='finalize-prepare')signature='finalization_pending';if(action==='complete')signature='completed';return response({ok:true,value:{state:signature,challengeId:id(800)}});}
  if(sql.includes('contratpro_delivery_')){const p=JSON.parse(args[0]);if(p.action==='result')throw {code:'40001'};if(p.action==='claim'){if(claimed)return response(null);claimed=true;return response({lease:id(900)});}return response({});}
  if(sql.includes('contratpro_sheets_')){const p=JSON.parse(args[0]);assert.equal(p.agencyId,people[0].agency,'Sheets worker requires explicit agency, unlike global delivery claim');if(p.action==='claim')return response(null);if(p.action==='oauth-consume'){if(oauth)throw {code:'42501'};oauth=true;}return response({});}
  if(sql.includes('contratpro_billing_agency'))return response({subscription:{state:'active'}});
  if(sql.includes('contratpro_account_profile')){const sub=subjects.get(client);if(sql.includes("'save'")){profiles.set(sub,args[0]);return response(args[0]);}return response(profiles.get(sub)??null);}
  throw Error('Unmodelled scenario query '+sql);
 }
 const make=name=>({query:(sql,args)=>query(name,sql,args)}),context={admin:make('admin'),a:make('actor-A'),b:make('actor-B'),a2:make('actor-A2'),state:{counter:1000}};
 const stages=[];for(let v=13;v<=28;v++){const logical=String(v).padStart(4,'0');await runStage(logical,context);stages.push(logical);}
 assert.equal(stages.length,16);assert.equal(signature,'completed');assert(trace.some(x=>x.client==='actor-A2'));assert(trace.some(x=>x.client==='actor-B'));assert(trace.some(x=>x.sql==='ROLLBACK'));assert(trace.filter(x=>x.sql.includes('contratpro_rental_create')).length>=4);
 t.diagnostic(`${trace.length} exact scenario SQL invocations parsed and bind arity checked; scripted responses only, no database execution`);
});
