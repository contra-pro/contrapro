// Offline only: derive a new package, never modify a prior pinned package or cluster.
import assert from 'node:assert/strict';
import {readFile,writeFile,readdir,lstat,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..'),old=resolve(root,'scripts/d2-native-0022'),out=resolve(root,'scripts/d2-native-checkpoint');
const session='C:/Users/lenovo/AppData/Local/ContratPro-D2-native/pg17-54329',sha=b=>createHash('sha256').update(b).digest('hex');
const priorHash='2915ced778459c381a0e6e7143dfc06c5f295daa58e0ef7ed71356a641a2d607',pb=await readFile(resolve(old,'package-manifest.json'));assert.equal(sha(pb),priorHash);const prior=JSON.parse(pb);
for(const f of prior.files)assert.equal(sha(await readFile(resolve(root,f.path))),f.sha256);
const receipt=JSON.parse(await readFile(session+'/acceptance-receipt-0022.json')),state=JSON.parse(await readFile(session+'/session-0022.json'));
assert.equal(receipt.phase,'checkpoint-readonly-validation');assert.equal(receipt.packageHash,priorHash);assert.equal(receipt.code,'ERR_ASSERTION');assert.equal(receipt.events.length,0);assert.equal(state.status,'STOPPED');assert.equal(state.pid,0);assert.equal(state.packageHash,priorHash);
// Previous immutable evidence must not have changed. Data pages legitimately changed at clean shutdown.
for(const f of prior.frozen.filter(f=>!f.path.startsWith('data/')||f.path.startsWith('data/log/')))assert.equal(sha(await readFile(session+'/'+f.path)),f.sha256);
const frozen=[];async function snap(n){const st=await lstat(session+'/'+n);assert(!st.isSymbolicLink());if(st.isDirectory())for(const c of(await readdir(session+'/'+n)).sort())await snap(n+'/'+c);else if(st.isFile())frozen.push({path:n,bytes:st.size,sha256:sha(await readFile(session+'/'+n))});}
assert(!(await readdir(session+'/data')).includes('postmaster.pid'));for(const n of(await readdir(session)).filter(n=>n!=='server.key').sort())await snap(n);
await mkdir(out);const files=[];async function put(n,b){await writeFile(resolve(out,n),b,{flag:'wx'});files.push({path:'scripts/d2-native-checkpoint/'+n,sha256:sha(b)});}
for(const n of ['resources.mjs','resource-manifest.json','baseline.mjs','baseline-sources.json','provider-fixture.sql','receipt-model.sql','scenarios.mjs'])await put(n,await readFile(resolve(old,n)));
let cp=await readFile(resolve(old,'checkpoint.mjs'),'utf8');
cp=cp.replace("'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);","'application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/png'],'0021 bucket MIME contract');");
cp=cp.replace(" await db.query('COMMIT');"," const scenarioState=await readScenarioState(db);await db.query('COMMIT');return scenarioState;");
const marker="export async function hydrateScenarioState(admin){";cp=cp.slice(0,cp.indexOf(marker))+await readFile(resolve(root,'scripts/d2-checkpoint-state.mjs'),'utf8');await put('checkpoint.mjs',cp);
let driver=await readFile(resolve(old,'orchestrate.mjs'),'utf8');driver=driver.replaceAll('d2-native-0022','d2-native-checkpoint').replaceAll('session-0022.json','session-checkpoint.json').replaceAll('acceptance-receipt-0022.json','acceptance-receipt-checkpoint.json').replaceAll('D2-NATIVE-0022','D2-NATIVE-CHECKPOINT');
driver=driver.replace('await verifyCheckpoint(boot,plan.files[0].expectedHistory);','const scenarioState=await verifyCheckpoint(boot,plan.files[0].expectedHistory);');
driver=driver.replace('context.state=await hydrateScenarioState(admin);','context.state=scenarioState;');await put('orchestrate.mjs',driver);
let ps=await readFile(resolve(old,'session.ps1'),'utf8');for(const [a,b]of [['session-0022.json','session-checkpoint.json'],['startup-0022.log','startup-checkpoint.log'],['D2-0022-BIND','D2-CHECKPOINT-BIND'],['D2-0022-START','D2-CHECKPOINT-START'],['D2-0022-STOP','D2-CHECKPOINT-STOP'],['D2-NATIVE-0022','D2-NATIVE-CHECKPOINT']])ps=ps.replaceAll(a,b);await put('session.ps1',ps);
await put('binding.mjs',await readFile(resolve(root,'scripts/d2-checkpoint-binding.mjs')));
const m={...prior,profile:'accepted-0021-checkpoint-mime-correction',priorPackageSha256:priorHash,frozen,files:[...files,...prior.files.filter(f=>!f.path.startsWith('scripts/'))],priorFailure:{receiptSha256:sha(await readFile(session+'/acceptance-receipt-0022.json')),errorMessageSha256:receipt.errorMessageSha256},fixturePolicy:'All outstanding scenario prerequisites read in same READ ONLY snapshot before credential refresh; no fixture renewal; minimum 30-minute validity for 20-minute execution deadline'};
const text=JSON.stringify(m,null,2)+'\n';await writeFile(resolve(out,'package-manifest.json'),text,{flag:'wx'});console.log(JSON.stringify({packageSha256:sha(text),frozenFiles:frozen.length,candidatesUnchanged:true,sqlExecuted:false}));
