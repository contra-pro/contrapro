import { spawn } from 'node:child_process';

export const LIMIT = 4096;
export function sanitize(value) {
  return String(value ?? '')
    .replace(/\b(?:postgres(?:ql)?|https?):\/\/[^\s"'<>]+/gi, '[REDACTED_URL]')
    .replace(/\bBearer\s+[^\s"',;]+/gi, 'Bearer [REDACTED]')
    .replace(/\beyJ[A-Za-z0-9_.-]+/g, '[REDACTED_JWT]')
    .replace(/\b(?:sb_(?:secret|publishable)_[A-Za-z0-9_-]+|sk-[A-Za-z0-9_-]+)/g, '[REDACTED_KEY]')
    .replace(/\b([A-Z_]*(?:PASSWORD|SECRET|TOKEN|KEY|COOKIE|AUTHORIZATION)[A-Z_]*|passwd)\s*[:=]\s*(?:"[^"]*(?:"|$)|'[^']*(?:'|$)|[^\s,;]+)/gi, '$1=[REDACTED]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '?')
    .slice(0, LIMIT);
}
export function diagnostic(error) {
  const result = { name:sanitize(error?.name ?? 'Error'), message:sanitize(error?.message ?? error) };
  for (const key of ['code','errno','syscall','exitCode','signal','stdout','stderr','stdoutTruncated','stderrTruncated','timedOut','terminationRequested','outputMayBeIncomplete','completionEvent']) {
    if (error?.[key] !== undefined) result[key] = typeof error[key]==='string' ? sanitize(error[key]) : error[key];
  }
  if(Array.isArray(error?.identityComparisons)) result.identityComparisons=error.identityComparisons.slice(0,8).map(comparison=>
    Object.fromEntries(['field','expected','actual','normalization','stage'].map(key=>[key,sanitize(comparison?.[key])])));
  return result;
}
export function recordFailure(report, phase, stage, error) {
  const failure={ phase,stage,...diagnostic(error) };
  report.status='FAIL';
  if (!report.failure) report.failure=failure;
  else report.cleanupFailures.push(failure);
}
export async function stage(report, phase, name, work) {
  report.phase=phase; report.stage=name;
  try { return await work(); }
  catch(error) { recordFailure(report,phase,name,error); throw error; }
}
export async function cleanup(report, name, work) {
  try { await work(); return true; }
  catch(error) { recordFailure(report,'teardown',name,error); return false; }
}

// Buffers are bounded BEFORE conversion/redaction. Keep one bounded prefix/stream;
// retained diagnostics are sanitized only at the output boundary, preventing a
// credential split across chunks from escaping redaction.
export function command(executable,args,environment,spawnProcess=spawn,{timeoutMs=30000,drainMs=50,killGraceMs=1000}={}) {
  if(![timeoutMs,drainMs,killGraceMs].every(v=>Number.isFinite(v)&&v>0)) return Promise.reject(new Error('INVALID_PROCESS_TIMEOUT'));
  return new Promise((resolve,reject)=>{
    const stdout=[],stderr=[];
    let outSize=0,errSize=0,outTruncated=false,errTruncated=false,spawnError;
    let child,settled=false,exited=false,timedOut=false,terminationRequested=false;
    let processTimer,drainTimer,killTimer,exitCode=null,exitSignal=null;
    const collect=(chunks,isOut,data)=>{
      const b=Buffer.from(data); const used=isOut?outSize:errSize;
      if(b.length>LIMIT-used) { if(isOut) outTruncated=true; else errTruncated=true; }
      const part=b.subarray(0,Math.max(0,LIMIT-used)); if(part.length) chunks.push(part);
      if(isOut) outSize+=part.length; else errSize+=part.length;
    };
    const finish=(code,signal,completionEvent)=>{
      if(settled) return;
      settled=true;
      clearTimeout(processTimer); clearTimeout(drainTimer); clearTimeout(killTimer);
      const outputMayBeIncomplete=Boolean(child&&(!child.stdout.readableEnded||!child.stderr.readableEnded));
      // Close only this spawn's reader handles, NOT a descendant server process.
      child?.stdout.destroy(); child?.stderr.destroy();
      const details={ exitCode:code,signal,completionEvent,timedOut,terminationRequested,outputMayBeIncomplete,
        stdout:sanitize(Buffer.concat(stdout).toString()),stderr:sanitize(Buffer.concat(stderr).toString()),stdoutTruncated:outTruncated,stderrTruncated:errTruncated };
      if(spawnError || code!==0 || timedOut) {
        const error=new Error(spawnError?.message ?? `Child process exited with code ${code}${signal?` signal ${signal}`:''}`, {cause:spawnError});
        if(spawnError?.code) error.code=spawnError.code;
        if(spawnError?.errno !== undefined) error.errno=spawnError.errno;
        if(spawnError?.syscall) error.syscall=spawnError.syscall;
        if(timedOut) { error.code='ETIMEDOUT'; error.message=`Child process exceeded ${timeoutMs}ms deadline`; }
        Object.assign(error,details); reject(error);
      } else resolve(details);
    };
    try { child=spawnProcess(executable,args,{env:environment,windowsHide:true,stdio:['ignore','pipe','pipe']}); }
    catch(error) { spawnError=error; finish(null,null,'error'); return; }
    child.stdout.on('data',data=>collect(stdout,true,data));
    child.stderr.on('data',data=>collect(stderr,false,data));
    child.on('error',error=>{ if(!settled) { spawnError=error; finish(exitCode,exitSignal,'error'); } });
    child.on('exit',(code,signal)=>{
      exited=true; exitCode=code; exitSignal=signal; clearTimeout(processTimer);
      // Node 'exit' proves direct child termination; 'close' additionally waits on
      // stdio, which a background descendant may retain indefinitely on Windows.
      if(!settled) drainTimer=setTimeout(()=>finish(code,signal,'exit'),drainMs);
    });
    child.on('close',(code,signal)=>finish(exited?exitCode:code,exited?exitSignal:signal,'close'));
    processTimer=setTimeout(()=>{
      if(settled||exited) return;
      timedOut=true;
      // Kill only the exact directly spawned process; never taskkill a process tree.
      try { terminationRequested=child.kill('SIGTERM'); }
      catch(error) { spawnError=error; }
      if(!settled) killTimer=setTimeout(()=>finish(exitCode,exitSignal,'timeout'),killGraceMs);
    },timeoutMs);
  });
}
