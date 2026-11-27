import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {resolve} from 'node:path';
import {parse} from 'pgsql-parser';import {parsePlPgSQL} from 'libpg-query';
import {buildPlan,sourceBody,segments,root,sha} from './candidates.mjs';
test('sixteen native-test candidates retain exact source statements and bind source/order without connecting',async()=>{
 const plan=await buildPlan();assert.equal(plan.files.length,16);assert.equal(plan.manifest.sqlExecuted,false);assert.equal(plan.manifest.managedReleaseApproved,false);
 for(const [i,file]of plan.files.entries()){
  const m=plan.manifest.migrations[i],source=await readFile(resolve(root,m.source)),sourceAst=await parse(source.toString()),candidateAst=await parse(file.text),candidate=segments(Buffer.from(file.text),candidateAst);
  assert.equal(m.logical,String(i+13).padStart(4,'0'));assert.equal(m.sourceSha256,sha(source));assert.equal(m.candidateSha256,sha(file.text));assert.equal(m.expectedHistory.length,13+i);
  for(const p of sourceBody(source,sourceAst,i+13).retained){assert(candidate.some(c=>c.text.includes(p.text)),`${m.logical} retained statement lost`);}
  assert.deepEqual(candidate.filter(c=>c.kind==='TransactionStmt').map(c=>c.stmt.TransactionStmt.kind),['TRANS_STMT_BEGIN','TRANS_STMT_COMMIT']);
  assert(!file.text.includes("RAISE EXCEPTION 'LOCAL DESIGN ONLY"));
  for(const invariant of ["current_database()<>'contratpro_d2_native'","inet_server_port() IS DISTINCT FROM 54329","'170011'","'synthetic-offline'",'D2 exact predecessor history mismatch','D2 final history mismatch','D2 existing baseline row changed or missing','D2 authority restoration mismatch','ON COMMIT DROP','statement_timeout=\'30s\''])assert(file.text.includes(invariant),`${m.logical} missing guard ${invariant}`);
 }
});
test('SQL parses; PL/pgSQL either parses or retains the identical source catalogue-dependent diagnostic',async t=>{
 const plan=await buildPlan();let full=0,catalogue=0;
 for(const [i,f]of plan.files.entries()){
  await parse(f.text);
  try{await parsePlPgSQL(f.text);full++;}
  catch(candidateError){const source=await readFile(resolve(root,plan.manifest.migrations[i].source),'utf8');let sourceError;try{await parsePlPgSQL(source);}catch(e){sourceError=e;}
   assert(sourceError,'Candidate introduced a PL/pgSQL diagnostic');assert.equal(candidateError.message,sourceError.message);
   assert(/is not a known variable|does not exist|could not find tuple structure|is not a scalar variable/.test(sourceError.message),'Unclassified source diagnostic');catalogue++;t.diagnostic(`${plan.manifest.migrations[i].logical}: native catalogue required; ${sourceError.message}`);
  }
 }
 t.diagnostic(`SQL 16/16; full PL/pgSQL ${full}/16; identical catalogue-dependent source diagnostics ${catalogue}/16; no SQL executed`);
});
test('compiler refuses changed or nontrivial design guards and nested source transactions',async()=>{
 const bytes=Buffer.from("BEGIN;DO $guard$ BEGIN RAISE EXCEPTION 'LOCAL DESIGN ONLY: expected'; PERFORM 1; END $guard$;ROLLBACK;");
 const ast=await parse(bytes.toString());assert.throws(()=>sourceBody(bytes,ast,13));
 const altered=Buffer.from("BEGIN;DO $guard$ BEGIN RAISE EXCEPTION 'LOCAL DESIGN ONLY: expected'; END $guard$;SAVEPOINT extra;ROLLBACK;");const changedAst=await parse(altered.toString());assert.throws(()=>sourceBody(altered,changedAst,13));
});
test('UTF8 source offsets preserve Arabic signature notice exactly',async()=>{
 const plan=await buildPlan(),last=plan.files.at(-1).text;assert(last.includes('يرافق الرسم اسمي المكتوب'));assert(!last.includes('\uFFFD'));
 const s=Buffer.from("-- عربي\nBEGIN;\nSELECT 'عربي';\nROLLBACK;");const p=segments(s,await parse(s.toString()));assert(p.some(x=>x.text==="SELECT 'عربي'"));
});
