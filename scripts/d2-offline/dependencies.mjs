// Reuses accepted local D1 catalogue metadata only; no new evidence collection or SQL.
import {readFile,writeFile,mkdir} from 'node:fs/promises';import {resolve} from 'node:path';import {buildPlan,root} from './candidates.mjs';import {csv} from '../d1-readonly-session.mjs';
import {parse} from 'pgsql-parser';
const capture='C:/Users/lenovo/AppData/Local/ContratPro-D1-evidence/d1-initial-20261127T084944Z-427397da94bd4e239d26d116778a2a2a';
const table=async name=>{const rows=csv(await readFile(resolve(capture,name+'.csv'),'utf8'));return rows.slice(1).map(r=>Object.fromEntries(rows[0].map((h,i)=>[h,r[i]])));};
const columns=await table('Q2-columns'),functions=await table('Q4-function-metadata');
const available=new Map([...columns.map(r=>[r.nspname+'.'+r.relname,'D1-catalogue']),...functions.map(r=>[r.nspname+'.'+r.proname,'D1-catalogue']),['platform.admin_identities','D1-Q13-name-only']]);
const columnModel=new Map();for(const r of columns.filter(r=>r.relkind==='r')){const name=r.nspname+'.'+r.relname;if(!columnModel.has(name))columnModel.set(name,new Set());if(r.attname)columnModel.get(name).add(r.attname);}
columnModel.set('platform.admin_identities',null); // Q13 establishes names, not column shape.
const plan=await buildPlan(),report=[];
for(const m of plan.manifest.migrations){const source=await readFile(resolve(root,m.source),'utf8'),declared=new Set([...m.expectedObjects.tables,...m.expectedObjects.functions]);
 const refs=[...new Set([...source.matchAll(/\b((?:app_private|identity|tenancy|platform|auth|storage|public)\.[a-z_][a-z0-9_]*)/gi)].map(x=>x[1]))];
 const prior=refs.filter(r=>available.has(r)&&!declared.has(r)),unknown=refs.filter(r=>!available.has(r)&&!declared.has(r));
 const renameOrigins=m.expectedObjects.renames.map(r=>({from:r.from,to:r.to,priorKnown:available.has(r.from)}));
 if(renameOrigins.some(r=>!r.priorKnown))throw Error('Rename predecessor absent from known catalogue/sequence');
 const ddlConflicts=[];for(const {stmt}of (await parse(source)).stmts){if(stmt.CreateStmt){const s=stmt.CreateStmt,name=s.relation.schemaname+'.'+s.relation.relname;if(columnModel.has(name))ddlConflicts.push({relation:name,reason:'CREATE TABLE collides with known predecessor'});columnModel.set(name,new Set((s.tableElts??[]).filter(x=>x.ColumnDef).map(x=>x.ColumnDef.colname)));}if(stmt.AlterTableStmt){const s=stmt.AlterTableStmt,name=s.relation.schemaname+'.'+s.relation.relname;for(const c of s.cmds??[]){const cmd=c.AlterTableCmd;if(cmd?.subtype==='AT_AddColumn'){const col=cmd.def.ColumnDef.colname;if(!columnModel.has(name)||columnModel.get(name)===null)ddlConflicts.push({relation:name,column:col,reason:'predecessor column shape not available'});else{if(columnModel.get(name).has(col))ddlConflicts.push({relation:name,column:col,reason:'ADD COLUMN collides with known predecessor'});columnModel.get(name).add(col);}}}}}
 report.push({logical:m.logical,predecessor:m.dependencies[0],requiredPrefix:m.expectedHistory,priorReferences:prior.map(name=>({name,origin:available.get(name)})),declaredHere:[...declared],renameOrigins,unresolvedLexicalReferences:unknown,ddlConflicts,scope:'name/rename and top-level CREATE/ADD COLUMN closure only; not complete type/argument/DO/dynamic-SQL or native semantic validation'});
 for(const name of declared)available.set(name,m.logical);
}
await mkdir(resolve(root,'.verification/d2'),{recursive:true});await writeFile(resolve(root,'.verification/d2/dependencies.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({migrations:report.length,predecessorChainVerified:report.every((r,i)=>r.predecessor===String(12+i).padStart(4,'0')&&r.requiredPrefix.length===13+i),unresolved:report.filter(r=>r.unresolvedLexicalReferences.length).map(r=>({version:r.logical,names:r.unresolvedLexicalReferences})),ddlConflicts:report.filter(r=>r.ddlConflicts.length).map(r=>({version:r.logical,conflicts:r.ddlConflicts})),sqlExecuted:false,privateRowsEmitted:0},null,2));
