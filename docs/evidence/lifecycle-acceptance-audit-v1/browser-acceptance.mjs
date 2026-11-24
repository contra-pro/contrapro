import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
const out = 'C:/Users/lenovo/contratpro/docs/evidence/lifecycle-acceptance-audit-v1';
await fs.mkdir(out, { recursive: true });
const profile = 'C:/Users/lenovo/AppData/Local/Temp/contratpro-a4-profile-'+Date.now();
await fs.mkdir(profile);
const child = spawn('C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-background-networking', '--disable-component-update', '--disable-sync',
  '--disable-default-apps', '--metrics-recording-only', '--disable-domain-reliability',
  '--disable-features=Translate,MediaRouter,OptimizationHints', '--lang=fr-FR',
  '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank',
], { windowsHide: true, stdio: ['ignore','ignore','pipe'] });
let stderr = ''; child.stderr.on('data', d => { stderr = (stderr + d).slice(-8192); });
let ws; let session; let seq=0; const pending=new Map(); const scripts=new Map();
const report={out, browserPid:child.pid, viewports:[], console:[], exceptions:[], requests:[], blocked:[], calls:[], checks:{}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function send(method, params={}, sid=session) {
  return new Promise((resolve,reject)=>{
    const id=++seq; const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout: '+method));},15000);
    pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v);},reject:e=>{clearTimeout(timer);reject(e);}});
    ws.send(JSON.stringify({id,method,params,...(sid?{sessionId:sid}:{})}));
  });
}
async function evaluate(expression) {
  const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails) throw new Error('Browser evaluation failed: '+JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
async function until(expression) {
  const start=Date.now();
  while(Date.now()-start<12000){if(await evaluate(expression))return;await sleep(80);}
  throw new Error('Browser condition timeout');
}
async function screenshot(name,width) {
  const metrics=await send('Page.getLayoutMetrics');
  const height=Math.ceil(metrics.cssContentSize.height);
  const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,
    clip:{x:0,y:0,width,height,scale:1}});
  const path=out+'/'+name+'.png';await fs.writeFile(path,Buffer.from(r.data,'base64'));return path;
}
async function viewport(width) {
  await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
  await sleep(80);
}
async function key(key,code=key,modifiers=0) {
  await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,modifiers,windowsVirtualKeyCode:key==='Enter'?13:key==='Tab'?9:undefined,...(key==='Enter'?{text:'\r',unmodifiedText:'\r'}:{})});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,modifiers,windowsVirtualKeyCode:key==='Enter'?13:key==='Tab'?9:undefined});
}
async function setField(name,value) {
  await evaluate(`(()=>{const e=document.querySelector('[name="${name}"]');const p=e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await sleep(30);
}
async function fill() {
  for(const [name,value] of Object.entries({clientId:'44444444-4444-4444-4444-444444444444',vehicleId:'55555555-5555-5555-5555-555555555555',startDate:'2026-01-01',startTime:'09:00',startOffset:'+01:00',endDate:'2026-01-02',endTime:'09:00:00.000001',endOffset:'+01:00',dailyRate:'123,45',deposit:'500'}))await setField(name,value);
}
async function scenario(value) {
  await evaluate(`(()=>{const e=document.getElementById('scenario');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('change',{bubbles:true}));})()`);await sleep(40);
}
try {
  let active;
  for(let n=0;n<80;n++){try{active=(await fs.readFile(profile+'/DevToolsActivePort','utf8')).trim().split('\n');break;}catch{await sleep(200);}}
  if(!active)throw new Error('Isolated Chrome debugging endpoint unavailable');
  ws=new WebSocket(`ws://127.0.0.1:${active[0]}${active[1]}`);
  await new Promise((res,rej)=>{ws.addEventListener('open',res,{once:true});ws.addEventListener('error',rej,{once:true});});
  ws.addEventListener('message',event=>{
    const msg=JSON.parse(event.data);
    if(msg.id){const p=pending.get(msg.id);if(p){pending.delete(msg.id);msg.error?p.reject(new Error(msg.error.message)):p.resolve(msg.result);}return;}
    if(msg.method==='Debugger.scriptParsed')scripts.set(msg.params.url,msg.params.scriptId);
    if(msg.method==='Runtime.exceptionThrown')report.exceptions.push(msg.params.exceptionDetails.text);
    if(msg.method==='Log.entryAdded')report.console.push({level:msg.params.entry.level,text:msg.params.entry.text.replace(/(\?token=)[^\s'"&]+/g,'$1[redacted]')});
    if(msg.method==='Network.requestWillBeSent')report.requests.push({url:msg.params.request.url,type:msg.params.type});
    if(msg.method==='Fetch.requestPaused'){
      const url=msg.params.request.url;
      if(url.startsWith('http://127.0.0.1:4179/'))void send('Fetch.continueRequest',{requestId:msg.params.requestId});
      else {report.blocked.push(url);void send('Fetch.failRequest',{requestId:msg.params.requestId,errorReason:'BlockedByClient'});}
    }
    if(msg.method==='Debugger.paused')void (async()=>{
      try{const r=await send('Debugger.evaluateOnCallFrame',{callFrameId:msg.params.callFrames[0].callFrameId,expression:'({body,creationKey})',returnByValue:true});if(r.result?.value)report.calls.push(r.result.value);}
      finally{await send('Debugger.resume');}
    })();
  });
  report.browser=await send('Browser.getVersion',{},null);
  const target=await send('Target.createTarget',{url:'about:blank'},null);
  session=(await send('Target.attachToTarget',{targetId:target.targetId,flatten:true},null)).sessionId;
  await send('Page.enable');await send('Runtime.enable');await send('Log.enable');await send('Network.enable');await send('Debugger.enable');
  await send('Fetch.enable',{patterns:[{urlPattern:'*'}]});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__printRequests=[];window.print=()=>{window.__printRequests.push({text:document.querySelector('[data-contract-sheet]')?.textContent,agency:document.querySelector('[data-contract-export]')?.textContent});};`});
  await send('Page.navigate',{url:'http://127.0.0.1:4179/studio.html'});
  await until(`!!document.querySelector('h1')`);
  await send('Page.bringToFront');



  async function clickText(text){await evaluate(`(()=>{const e=[...document.querySelectorAll('button')].find(e=>e.textContent===${JSON.stringify(text)});if(!e)throw Error('Missing button');e.click();})()`);await sleep(80);}
  async function change(selector,value){await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});const prototype=e.tagName==='SELECT'?HTMLSelectElement.prototype:e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);await sleep(80);}
  async function save(){await evaluate(`document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))`);await until(`document.querySelector('form [role="status"]')?.textContent.includes('enregistrée')`);}
  async function createAndSelect(index){
    await clickText('Créer une location');await until(`!!document.querySelector('[name="clientId"]')`);await fill();
    await evaluate(`document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))`);
    await until(`document.querySelector('[role="status"]')?.textContent.includes('Simulation terminée')`);
    await evaluate(`[...document.querySelectorAll('button')].find(e=>e.textContent.includes('Documents simulés')).click()`);await until(`!!document.querySelector('[class*=documentSelector] select')`);
    await change('[class*=documentSelector] select',String(index));await until(`!!document.querySelector('[data-lifecycle-state]')`);
    if(index===0){
      report.checks.draft=await evaluate(`({state:document.querySelector('[data-lifecycle-state]').dataset.lifecycleState,canFinalize:!document.querySelector('[data-lifecycle-action="finalized"]').disabled,canPending:!document.querySelector('[data-lifecycle-action="signing-pending"]').disabled,canSigned:!document.querySelector('[data-lifecycle-action="signed"]').disabled,hasPrint:!!document.querySelector('[data-contract-print-action]')})`);
      report.checks.keyboard=[];
      for(const width of [320,1440]){
        await viewport(width);await evaluate(`document.querySelector('[name="lifecycle-driver-name"]').focus()`);
        const route=[];for(let n=0;n<4;n++){await key('Tab');route.push(await evaluate(`({name:document.activeElement.name,action:document.activeElement.dataset.lifecycleAction,tag:document.activeElement.tagName,outline:getComputedStyle(document.activeElement).outlineStyle})`));}
        if(route[0].name!=='lifecycle-pickup'||route[1].name!=='lifecycle-return'||route[2].action!=='finalized'||route[3].tag!=='SUMMARY')throw Error('Keyboard route regression');
        report.checks.keyboard.push({width,route});await screenshot('draft-keyboard-'+width,width);
      }
      await evaluate(`document.querySelector('[name="lifecycle-driver-name"]').focus()`);await key('a','KeyA',2);await send('Input.insertText',{text:'Conducteur fictif audit'});await sleep(80);
      if(!await evaluate(`document.querySelector('[data-lifecycle-action="finalized"]').disabled`))throw Error('Dirty draft finalized');
      await key('Tab');await key('Tab');await key('Tab');
      if(!await evaluate(`document.activeElement.type==='submit'`))throw Error('Save not keyboard accessible');
      await key('Enter');await until(`!document.querySelector('[data-lifecycle-action="finalized"]').disabled`);
      await viewport(320);await evaluate(`document.querySelector('[data-lifecycle-action="finalized"]').focus()`);await key('Enter');
    }else{await evaluate(`document.querySelector('[data-lifecycle-action="finalized"]').click()`);}
    await until(`!!document.querySelector('[data-contract-print-action]')`);
    if(index===0)report.checks.finalized=await evaluate(`({state:document.querySelector('[data-lifecycle-state]').dataset.lifecycleState,fieldsDisabled:document.querySelector('[data-contract-lifecycle] fieldset').disabled,canFinalize:!document.querySelector('[data-lifecycle-action="finalized"]').disabled,canPending:!document.querySelector('[data-lifecycle-action="signing-pending"]').disabled,canSigned:!document.querySelector('[data-lifecycle-action="signed"]').disabled,text:document.querySelector('[data-contract-sheet]').textContent})`);
    await evaluate(`document.fonts.ready`);await sleep(120);
  }
  async function exportPdf(name){
    const before=await evaluate(`({text:document.querySelector('[data-contract-sheet]').textContent,calls:window.__printRequests.length,state:document.querySelector('[data-lifecycle-state]').dataset.lifecycleState})`);
    for(let attempt=0;attempt<3;attempt++){
      await viewport(attempt===0?320:1440);await evaluate(`document.querySelector('[data-contract-print-action]').focus()`);await key('Enter');
      const state=await evaluate(`document.querySelector('[data-lifecycle-state]').dataset.lifecycleState`);
      if(state!==before.state)throw Error('Print mutated lifecycle');
    }
    const after=await evaluate(`({text:document.querySelector('[data-contract-sheet]').textContent,calls:window.__printRequests.length,state:document.querySelector('[data-lifecycle-state]').dataset.lifecycleState,status:document.querySelector('[data-pdf-status]').textContent})`);
    if(before.state!==after.state||before.text!==after.text||after.calls!==before.calls+3||!after.status.includes('Aucun téléchargement confirmé'))throw Error('Print action integrity failed');
    await send('Emulation.setEmulatedMedia',{media:'print'});await sleep(100);
    const layout=await evaluate(`(()=>{const s=document.querySelector('[data-contract-sheet]');return {height:s.getBoundingClientRect().height,width:s.getBoundingClientRect().width,sheets:document.querySelectorAll('[data-contract-sheet]').length,diagrams:s.querySelectorAll('svg').length,markers:s.querySelectorAll('[data-marker]').length,signatures:s.querySelectorAll('[data-signature-party]').length,footers:s.querySelectorAll('[data-legal-footer]').length,controlsHidden:getComputedStyle(document.querySelector('[data-contract-print-action]')).display==='none'||getComputedStyle(document.querySelector('[data-contract-print-action]').parentElement).display==='none',hiddenContent:[...s.querySelectorAll('*')].filter(e=>getComputedStyle(e).display==='none'||getComputedStyle(e).visibility==='hidden').length,text:s.textContent,conditions:s.querySelector('[data-contract-conditions] p').textContent}})()`);
    await screenshot(name+'-print',1440);
    const pdf=await send('Page.printToPDF',{preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false});await fs.writeFile(out+'/'+name+'.pdf',Buffer.from(pdf.data,'base64'));
    await send('Emulation.setEmulatedMedia',{media:''});return {before,after,layout};
  }
  report.templates=[];
  let index=0;
  for(const template of ['classic','luxury','modern','detailed','bilingual']){
    await viewport(1440);
    if(index)await clickText('Paramètres agence');
    await change('form select',template);await save();await createAndSelect(index++);
    const screens=[];
    for(const width of [320,1440]){await viewport(width);await sleep(120);screens.push(await evaluate(`({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,pagination:document.querySelector('[data-pagination]').dataset.pagination})`));await screenshot(template+'-'+width,width);}
    const exported=await exportPdf(template);report.templates.push({template,screens,...exported});
    await viewport(320);await evaluate(`document.querySelector('[data-lifecycle-action="signing-pending"]').focus()`);await key('Enter');await until(`document.querySelector('[data-lifecycle-state]').dataset.lifecycleState==='signing-pending'`);
    await screenshot(template+'-pending-320',320);await viewport(1440);
    const pendingText=await evaluate(`document.querySelector('[data-contract-sheet]').textContent`);
    if(pendingText!==exported.layout.text)throw Error('Pending changed frozen snapshot');
    if(template==='classic'||template==='bilingual'){
      await screenshot(template+'-pending',1440);
      const pending=await exportPdf(template+'-pending');
      report.checks[template+'Pending']={state:pending.after.state,unchanged:pending.layout.text===exported.layout.text};
    }
    const pendingState=await evaluate(`document.querySelector('[data-lifecycle-state]').dataset.lifecycleState`);
    await evaluate(`(()=>{for(let i=0;i<3;i++)for(const button of document.querySelectorAll('[data-lifecycle-action]'))button.click();})()`);
    if(await evaluate(`!document.querySelector('[data-lifecycle-action="signed"]').disabled||document.querySelector('[data-lifecycle-state]').dataset.lifecycleState!==${JSON.stringify(pendingState)}`))throw Error('Repeated disabled action advanced state');
  }
  // Agency B has neither the selected agency's settings nor its historical snapshots.
  await change('main > div select','1');
  await evaluate(`[...document.querySelectorAll('button')].find(e=>e.textContent.includes('Documents simulés')).click()`);await sleep(80);
  report.checks.agencyB=await evaluate(`({hasAction:!!document.querySelector('[data-contract-print-action]'),hasSheet:!!document.querySelector('[data-contract-sheet]'),text:document.body.textContent})`);
  if(report.checks.agencyB.hasAction||report.checks.agencyB.hasSheet)throw Error('Agency isolation failed');
  await change('main > div select','0');await clickText('Paramètres agence');
  await change('form fieldset:nth-of-type(2) input','UPDATED AGENCY ONLY');await change('form textarea','UPDATED CONDITIONS ONLY');await save();
  await evaluate(`[...document.querySelectorAll('button')].find(e=>e.textContent.includes('Documents simulés')).click()`);await change('[class*=documentSelector] select','0');
  const historical=await exportPdf('historical-classic');
  report.checks.historicalStable=historical.layout.text===report.templates[0].layout.text;
  if(!report.checks.historicalStable||historical.layout.text.includes('UPDATED AGENCY ONLY'))throw Error('Historical snapshot changed');
  await clickText('Paramètres agence');
  const longConditions=('FULL CONFIGURED CONDITIONS LINE.'+String.fromCharCode(10)).repeat(180);
  await change('form textarea',longConditions);await save();await createAndSelect(index);
  report.checks.longConditions=await evaluate(`({status:document.querySelector('[data-pagination]').dataset.pagination,conditions:document.querySelector('[data-contract-conditions] p').textContent})`);
  if(report.checks.longConditions.conditions!==longConditions||report.checks.longConditions.status!=='overflow')throw Error('Long conditions lost or overflow warning missing');
  await screenshot('long-conditions-warning',1440);report.longExport=await exportPdf('long-conditions');

  report.checks.staleFeedback=[];
  const moduleUrls={};
  for(const [name,suffix] of Object.entries({react:'/react.js',client:'/react-dom_client.js',component:'/contract-lifecycle-demo.tsx',lifecycle:'/contract-lifecycle.ts',settings:'/contract-settings.ts',repository:'/contract-settings-memory.ts'})){
    moduleUrls[name]=[...scripts.keys()].find(url=>url.includes(suffix));if(!moduleUrls[name])throw Error('Missing observed module '+name);
  }
  for(const width of [320,1440]){
    await viewport(width);
    await evaluate(`(async()=>{
      const urls=${JSON.stringify(moduleUrls)};
      const [React,client,component,lifecycle,settings,repository]=await Promise.all([urls.react,urls.client,urls.component,urls.lifecycle,urls.settings,urls.repository].map(url=>import(url)));
      const agencyId='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';const context={simulation:true,agencyId,role:'owner'};
      const config=settings.defaultContractSettings(agencyId,{name:'Audit fixture',ice:'',rc:'',ifNumber:'',address:'Synthetic address',city:'Casablanca',phone:'+212600000000',email:'demo@example.invalid'});
      const repo=repository.createMemoryContractSettingsRepository();await settings.saveContractSettings(repo,context,config);
      const service=lifecycle.createOfflineContractLifecycle(repo);
      const input={schemaVersion:3,demonstration:true,agencyId,rentalId:'dddddddd-dddd-dddd-dddd-dddddddddddd',number:null,primaryDriver:{fullName:'Audit fictif',cin:null,passportNumber:null,drivingLicenseNumber:null,city:null,nationality:null,licenceDates:null,address:null},secondaryDriver:null,vehicle:{make:null,model:null,registrationNumber:'AUDIT',vin:null},rental:{start:'Fixture start',end:'Fixture end',duration:'1 jour',pickup:'Fixture',returnLocation:'Fixture',dailyRateMinor:10000n,amountMinor:10000n,depositMinor:20000n,mileage:'Fixture',allowance:'Fixture'},inspection:{departure:null,return:null},signatures:{customer:'not-signed',agency:'not-signed'}};
      const created=await service.createDraft(context,input);if(!created.ok)throw Error('Stale harness creation failed');
      const main=document.querySelector('main');main.hidden=true;const host=document.createElement('div');host.className=main.className;host.id='audit-stale-harness';document.body.append(host);
      const root=(client.createRoot??client.default.createRoot)(host);let changed=0;
      root.render((React.createElement??React.default.createElement)(component.ContractLifecycleDemo,{entry:created.value,service,context,onChanged:()=>{changed++;}}));
      const newer=service.editDraft(context,input.rentalId,1,input);if(!newer.ok)throw Error('Stale harness update failed');
      window.__auditHarness={state:()=>({modelState:service.get(context,input.rentalId).state,revision:service.get(context,input.rentalId).revision,changed}),cleanup:()=>{root.unmount();host.remove();main.hidden=false;delete window.__auditHarness;}};
    })()`);
    await until(`!!document.querySelector('#audit-stale-harness [data-lifecycle-action="finalized"]')`);
    await evaluate(`document.querySelector('#audit-stale-harness [data-lifecycle-action="finalized"]').focus()`);await key('Enter');await key('Enter');
    const feedback=await evaluate(`({...window.__auditHarness.state(),width:innerWidth,scrollWidth:document.documentElement.scrollWidth,alert:document.querySelector('#audit-stale-harness [data-lifecycle-status][role="alert"]')?.textContent})`);
    if(feedback.revision!==2||feedback.modelState!=='draft'||feedback.changed!==0||!feedback.alert?.includes('Aucune relance automatique'))throw Error('Stale feedback failed');
    report.checks.staleFeedback.push(feedback);await screenshot('stale-feedback-'+width,width);await evaluate(`window.__auditHarness.cleanup()`);
  }
  report.completed=true;
} catch(error){report.failure=error.message;report.stderr=stderr;try{report.failureState=await evaluate(`document.body.innerText`);await screenshot('failure',1440);}catch{}}
finally{
  report.requests=report.requests.filter(r=>r.type==='Fetch'||r.type==='XHR');await fs.writeFile(out+'/results.json',JSON.stringify(report,null,2));
  if(ws?.readyState===1){try{await send('Browser.close',{},null);}catch{}ws.close();}else child.kill();
  console.log(JSON.stringify({out,completed:report.completed,failure:report.failure,templates:report.templates?.map(t=>({template:t.template,screens:t.screens,height:t.layout.height,actionStatus:t.after.status})),checks:{keyboard:report.checks.keyboard,staleFeedback:report.checks.staleFeedback,historicalStable:report.checks.historicalStable},exceptions:report.exceptions,requests:report.requests},null,2));
}
