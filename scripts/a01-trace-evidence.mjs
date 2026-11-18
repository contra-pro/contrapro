import { open, readdir } from "node:fs/promises";
import { join } from "node:path";

const sequence = [["POST", "/fr/auth/provision", 503], ["POST", "/ar/auth/provision", 503],
  ["POST", "/fr/auth/provision", 403], ["POST", "/ar/auth/provision", 403],
  ["POST", "/fr/auth/provision", 403], ["POST", "/ar/auth/provision", 400],
  ["GET", "/fr/auth/provision", 405], ["GET", "/ar/auth/provision", 405]];
const fail = () => { throw Error("A01_TRACE_UNVERIFIED"); };

/** Server trace, not HTTP output or an operator boolean. No raw data is returned. */
export function verifyTrace(events, { run, startedAt, endedAt }) {
  if (!Array.isArray(events) || events.length > 1024 || !Number.isSafeInteger(startedAt) || !Number.isSafeInteger(endedAt) || endedAt < startedAt) fail();
  if (events.some(event => event?.kind === "unscoped-outbound"
    && (!Number.isSafeInteger(event.time) || (event.time >= startedAt && event.time <= endedAt)))) fail();
  const matching = events.filter(event => event?.run === run);
  if (matching.length !== 16 || new Set(matching.map(event => event.boot)).size !== 1) fail();
  for (let index = 1; index <= 8; index++) {
    const rows = matching.filter(event => event.index === index);
    const [start, end] = rows;
    const [method, path, status] = sequence[index - 1];
    if (rows.length !== 2 || start.kind !== "start" || end.kind !== "end" || start.safe !== true
      || start.method !== method || start.path !== path || end.status !== status
      || Object.keys(start).sort().join() !== "boot,index,kind,method,path,run,safe,time"
      || Object.keys(end).sort().join() !== "boot,index,kind,run,status,time"
      || !Number.isSafeInteger(start.time) || !Number.isSafeInteger(end.time)
      || start.time < startedAt || end.time > endedAt || end.time < start.time
      || (index > 1 && start.time < matching.find(event => event.index === index - 1 && event.kind === "end")?.time)) fail();
  }
  return { noProvisioningRpc: true };
}

export async function readTrace(directory) {
  const names = await readdir(directory);
  if (!names.length || names.length > 16 || names.some(name => !/^\d+-[a-f0-9-]+\.ndjson$/.test(name))) fail();
  const events = [];
  for (const name of names) {
    const file = await open(join(directory, name), "r");
    try {
      const bytes = Buffer.alloc(65537); const { bytesRead } = await file.read(bytes);
      if (bytesRead > 65536) fail();
      const lines = bytes.subarray(0, bytesRead).toString("utf8").split("\n");
      if (lines.pop() !== "") fail();
      events.push(...lines.filter(Boolean).map(line => JSON.parse(line)));
    } finally { await file.close(); }
  }
  return events;
}
