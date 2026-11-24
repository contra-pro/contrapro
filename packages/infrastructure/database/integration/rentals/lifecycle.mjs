// Pure orchestration seams: tests supply fake probes; no database/process is started.
export async function requireReadiness(probe) {
  const result=await probe(); // exactly one attempt; caller supplies bounded connection
  if(!result) throw Object.assign(new Error('Server readiness not established'),{code:'READINESS_FAILED'});
  return result;
}
export async function stopOwnedCluster({verifyOwnership,pidExists,stop}) {
  await verifyOwnership(); // a missing/mismatched marker must NEVER authorize stop
  if(!await pidExists()) return 'already-stopped';
  await stop();
  if(await pidExists()) throw Object.assign(new Error('Owned server PID file remains after shutdown'),{code:'SHUTDOWN_NOT_CONFIRMED'});
  return 'stopped';
}
