// Explicit invocation only. Importing this file does not start a server.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, lstat, realpath, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { createHash } from 'node:crypto';
import { ACK, validateArguments, executableCopy, verifyServer } from './safety.mjs';
import { command as capturedCommand, recordFailure, cleanup, stage } from './diagnostics.mjs';
import { requireReadiness, stopOwnedCluster } from './lifecycle.mjs';

function childEnvironment() {
  // Never pass database URLs, PG*, app configuration or credentials to children.
  return Object.fromEntries(['SystemRoot','WINDIR','TEMP','TMP','PATH','HOME','USERPROFILE','LANG'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
}
async function command(executable, args, capture = false) {
  const timeoutMs=args.includes('start')||args.includes('stop')?30000:args.includes('--version')?10000:120000;
  const result=await capturedCommand(executable,args,childEnvironment(),undefined,{timeoutMs});
  return capture?result.stdout:result;
}
async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0,'127.0.0.1',resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
const identity = `SELECT current_setting('server_version_num') AS version,
 current_setting('data_directory') AS directory, host(inet_server_addr()) AS address, inet_server_port() AS port,
 current_database() AS database, session_user`;

async function workflow(args,state) {
  const { report,connections }=state;
  report.stage='validate-arguments';
  const config = validateArguments(args); // No connection string accepted, ever.
  state.config=config;
  report.stage='workspace-preflight';
  const parent = await realpath(path.dirname(config.workspace));
  if (path.resolve(parent) !== path.dirname(config.workspace)) throw new Error('SYMLINK_PARENT_REJECTED');
  try { await lstat(config.workspace); throw new Error('WORKSPACE_MUST_NOT_EXIST'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const extension = process.platform === 'win32' ? '.exe' : '';
  const initdb = path.join(config.pgBin, `initdb${extension}`);
  const pgctl = path.join(config.pgBin, `pg_ctl${extension}`);
  state.pgctl=pgctl;
  for (const binary of [initdb, pgctl]) {
    report.stage=`version-${path.basename(binary)}`;
    const version = await command(binary, ['--version'], true);
    if (!/\(PostgreSQL\) 17\./.test(version)) throw new Error('POSTGRESQL_17_REQUIRED');
  }
  // mkdir without recursive is the exclusive ownership claim; never adopt a directory.
  report.stage='create-workspace';
  await mkdir(config.workspace);
  state.owned=true;
  const marker = { disposableId: config.id, acknowledgement: ACK, createdBy: 'contratpro-rental-pg17', database: config.database };
  state.marker=marker;
  report.stage='write-owner-marker';
  await writeFile(path.join(config.workspace,'harness-owner.json'),JSON.stringify(marker),{ flag:'wx' });
  const data = path.join(config.workspace,'data');
  state.data=data;
  report.stage='select-port';
  const port = await stage(report,'setup','select-port',freePort);
  report.stage='initdb';
  await stage(report,'setup','initdb',()=>command(initdb,['-D',data,'-U','postgres','--auth-local=trust','--auth-host=trust','--encoding=UTF8','--no-locale']));
  // Initdb's trust authentication is only for synthetic fixture data on loopback.
  report.stage='write-cluster-config';
  await writeFile(path.join(data,'pg_hba.conf'),'host all all 127.0.0.1/32 trust\n',{ flag:'w' });
  await writeFile(path.join(data,'postgresql.auto.conf'),`listen_addresses='127.0.0.1'\nport=${port}\nlogging_collector=off\nlog_statement='none'\nlog_min_error_statement=panic\n`);
  let admin;
  const draftURL = new URL('../../../../../supabase/migration-drafts/20261120001300_rental_contracts.sql',import.meta.url);
  state.draftURL=draftURL;
  report.stage='read-draft';
  const original = await readFile(draftURL,'utf8');
  const sourceHash = createHash('sha256').update(original).digest('hex');
  state.sourceHash=sourceHash;
  report.draftSha256=sourceHash;
    report.stage='start-cluster';
    state.startAttempted=true;
    report.startupCommand=await command(pgctl,['-D',data,'-l',path.join(config.workspace,'postgres.log'),'-w','-t','20','start']);
    state.started=true;
    report.phase='setup'; report.stage='verify-server-readiness';
    const { Client } = await import('pg');
    const connect = async (database = config.database) => {
      const c = new Client({ host:'127.0.0.1',port,user:'postgres',database,ssl:false,
        // pg treats an empty password/options as environment fallback. Truthy explicit
        // values prevent PGPASSWORD/PGOPTIONS/pgpass use without modifying environment.
        password:()=>{ throw new Error('UNEXPECTED_PASSWORD_AUTHENTICATION'); },
        options:'-c timezone=UTC',application_name:'contratpro-rental-local-harness',connectionTimeoutMillis:5000,query_timeout:10000 });
      connections.add(c);
      await c.connect();
      verifyServer((await c.query(identity)).rows[0],data,database,port);
      await c.query("SET statement_timeout='10s'; SET lock_timeout='8s'; SET idle_in_transaction_session_timeout='30s';");
      return c;
    };
    const bootstrap = await requireReadiness(()=>connect('postgres'));
    report.readiness='verified-server-identity';
    report.phase='execution';
    // Identifier is derived solely from a validated UUID, not caller SQL.
    report.stage='create-disposable-database';
    await bootstrap.query(`CREATE DATABASE "${config.database}"`);
    admin = await connect();
    const { baseline } = await import('./baseline.mjs');
    report.stage='baseline';
    report.baseline = await baseline(admin);
    report.stage='apply-rental-copy';
    await admin.query(executableCopy(original));
    const { runCases } = await import('./scenarios.mjs');
    report.stage='scenarios';
    await runCases({ admin, connect, report });
    report.status='PASS';
}

export async function main(args) {
  const report={status:'NOT_COMPLETED',phase:'setup',stage:'validate-arguments',cases:[],cleanupFailures:[],localAuthorityModel:'local bootstrap superuser; NOT Supabase deployment proof'};
  const state={report,connections:new Set(),owned:false,startAttempted:false,started:false};
  try { await workflow(args,state); }
  catch(error) { if(!report.failure) recordFailure(report,report.phase,report.stage,error); }
  finally {
    for(const c of state.connections) await cleanup(report,'close-connection',()=>c.end());
    if(state.owned) {
      const markerValid=await cleanup(report,'verify-owner-marker',async()=>{
        const actual=JSON.parse(await readFile(path.join(state.config.workspace,'harness-owner.json'),'utf8'));
        if(JSON.stringify(actual)!==JSON.stringify(state.marker)) throw new Error('OWNERSHIP_MARKER_CHANGED');
      });
      // A failed pg_ctl start can still leave a server. Inspect ONLY this owned
      // cluster's pid marker; never stop an unrelated service or retry startup.
      if(markerValid && state.startAttempted) await cleanup(report,'shutdown-cluster',async()=>{
        report.shutdown=await stopOwnedCluster({
          verifyOwnership:async()=>{
            const actual=JSON.parse(await readFile(path.join(state.config.workspace,'harness-owner.json'),'utf8'));
            if(JSON.stringify(actual)!==JSON.stringify(state.marker)) throw new Error('OWNERSHIP_MARKER_CHANGED');
          },
          pidExists:async()=>{
            try { await lstat(path.join(state.data,'postmaster.pid')); return true; }
            catch(error) { if(error.code==='ENOENT') return false; throw error; }
          },
          stop:()=>command(state.pgctl,['-D',state.data,'-w','-t','20','stop','-m','fast']),
        });
      });
      if(state.sourceHash) await cleanup(report,'verify-draft-integrity',async()=>{
        if(createHash('sha256').update(await readFile(state.draftURL,'utf8')).digest('hex')!==state.sourceHash) throw new Error('ORIGINAL_DRAFT_CHANGED');
      });
      // Never write into an existing/adopted workspace or overwrite prior artifacts.
      await cleanup(report,'write-results',()=>writeFile(path.join(state.config.workspace,'results.json'),JSON.stringify(report,null,2),{flag:'wx'}));
    }
  }
  // Report even failures before exclusive workspace creation; no unsafe file path.
  console.log(JSON.stringify(report));
  if(report.status!=='PASS') process.exitCode=1;
  return report;
}
if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => {
    const report={status:'FAIL',cleanupFailures:[]};
    recordFailure(report,'teardown','unexpected-reporting-error',error);
    console.error(JSON.stringify(report)); process.exitCode=1;
  });
}
