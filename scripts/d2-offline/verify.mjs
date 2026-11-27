// Offline package/document validation only. No application/test database imports.
import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';import {resolve} from 'node:path';import {checkPlan,root,output,sha} from './candidates.mjs';
const plan=await checkPlan(),dependencies=JSON.parse(await readFile(resolve(root,'.verification/d2/dependencies.json'),'utf8'));
if(dependencies.length!==16||dependencies.some((d,i)=>d.logical!==String(13+i).padStart(4,'0')||d.requiredPrefix.length!==13+i||d.unresolvedLexicalReferences.length||d.ddlConflicts.length||d.renameOrigins.some(r=>!r.priorKnown)))throw Error('Dependency/predecessor contract mismatch');
const docs=['docs/d2-offline-migration-preparation.md','docs/d2-candidate-contracts.md','docs/d2-native-postgresql-acceptance-plan.md','docs/d1-migration-reconciliation-worksheet.md','docs/mvp-completion-plan.md','docs/mvp-tracker.md'];
const scripts=(await readdir(resolve(root,'scripts/d2-offline'))).map(n=>'scripts/d2-offline/'+n);
const files=[...docs,...scripts,'supabase/migration-candidates/README.md',output+'/manifest.json',...plan.files.map(f=>output+'/'+f.file)];
const whitespace=[];for(const file of files){const text=await readFile(resolve(root,file),'utf8');text.split('\n').forEach((line,i)=>{if(/[\t ]+\r?$/.test(line))whitespace.push({file,line:i+1});});if(!text.endsWith('\n'))whitespace.push({file,line:'missing-final-newline'});}
if(whitespace.length){console.log(JSON.stringify({whitespace}));throw Error('Owned-file whitespace errors');}
const contract=await readFile(resolve(root,'docs/d2-candidate-contracts.md'),'utf8');if((contract.match(/^## \d{4} /gm)??[]).length!==16)throw Error('Missing per-version contract');
const record={status:'PASS',candidateCount:16,manifestSha256:sha(JSON.stringify(plan.manifest,null,2)+'\n'),sourceFingerprintsAndReproducibility:true,orderedDependencyNamesAndTopLevelColumnChecks:true,whitespaceFiles:files.length,contractSections:16,sqlExecuted:false,nativeAcceptance:'NOT_EXECUTED',managedReleaseApproved:false};
await mkdir(resolve(root,'.verification/d2'),{recursive:true});await writeFile(resolve(root,'.verification/d2/verification.json'),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify(record));
