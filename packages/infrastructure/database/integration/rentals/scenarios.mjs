import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// All IDs/data here are synthetic and are never included in results.json.
export async function runCases({ admin, connect, report }) {
  const row = async (c, sql, values=[]) => (await c.query(sql,values)).rows[0];
  const begin = async (subject, role='authenticated') => {
    const c=await connect();
    await c.query('BEGIN ISOLATION LEVEL READ COMMITTED');
    await c.query(`SET LOCAL ROLE ${role==='anon'?'anon':'authenticated'}`);
    await c.query("SELECT set_config('rental_harness.subject',$1,true)",[subject??'']);
    return c;
  };
  const as = async (subject, work, role) => {
    const c=await begin(subject,role);
    try { const value=await work(c); await c.query('COMMIT'); return value; }
    catch (e) { await c.query('ROLLBACK'); throw e; }
    finally { await c.end(); }
  };
  const expectCode = async (code, work) => {
    await assert.rejects(work,e => e.code===code);
  };
  const test = async (name, work) => {
    try { await work(); report.cases.push({ name,status:'PASS' }); }
    catch (e) { report.cases.push({ name,status:'FAIL',sqlstate:/^[A-Z0-9]{5}$/.test(e.code??'')?e.code:undefined }); throw e; }
  };
  const person = async () => {
    const subject=randomUUID(), user=randomUUID();
    await admin.query('INSERT INTO auth.users(id) VALUES($1)',[subject]);
    await admin.query("INSERT INTO identity.users(id,state) VALUES($1,'active')",[user]);
    await admin.query('INSERT INTO identity.supabase_users(supabase_user_id,user_id) VALUES($1,$2)',[subject,user]);
    return { subject,user };
  };
  const vehicle = async g => as(g.owner.subject,async c => (await row(c,
    'SELECT public.contratpro_vehicle_create($1::uuid,$2::uuid,$3::jsonb) AS id',
    [g.agency,randomUUID(),JSON.stringify({ registration:randomUUID().slice(0,12),make:'Fixture',model:'Test',year:String(new Date().getUTCFullYear()),mileage:'0' })])).id);
  const graph = async () => {
    const owner=await person();
    const agency=await as(owner.subject,async c => (await row(c,
      'SELECT * FROM public.contratpro_create_agency($1::jsonb,$2::text,$3::uuid)',
      [JSON.stringify({name:'HARNESS ONLY',ice:'',ifNumber:'',rc:'',address:'Synthetic',city:'Synthetic',phone:'+212600000000',email:'fixture@example.invalid'}),'fr',randomUUID()])).agency_id);
    const staff=await person();
    await admin.query("INSERT INTO tenancy.memberships(agency_id,user_id,state) VALUES($1,$2,'active')",[agency,staff.user]);
    const g={ owner,staff,agency };
    g.client=await as(owner.subject,async c => (await row(c,
      'SELECT public.contratpro_client_create($1::uuid,$2::uuid,$3::jsonb) AS id',
      [agency,randomUUID(),JSON.stringify({firstName:'Synthetic',lastName:'Fixture',phone:'+212600000000',email:'',nationality:'',identityType:'none',identityNumber:'',licenceNumber:'',licenceIssueDate:'',licenceExpiryDate:'',address:'',city:'',notes:''})])).id);
    g.vehicle=await vehicle(g);
    return g;
  };
  const iso = offset => new Date(Date.now()+offset*3600000).toISOString();
  const create = async (c,g,start=iso(24),end=iso(48),key=randomUUID(),overrides={}) => (await row(c,
    'SELECT public.contratpro_rental_create($1::uuid,$2::uuid,$3::jsonb) AS result',
    [g.agency,key,JSON.stringify({clientId:g.client,vehicleId:g.vehicle,start,end,dailyRateMinor:10000,...overrides})])).result;
  const change = async (c,op,g,r,extra,request=randomUUID()) => {
    const allowed=['confirm','start','complete','cancel','extend'];
    assert.ok(allowed.includes(op));
    const suffix=op==='complete'?', $5::boolean':op==='extend'?', $5::jsonb':'';
    const args=[g.agency,r.id,r.version,request];
    if (op==='complete') args.push(extra);
    if (op==='extend') args.push(JSON.stringify({end:extra}));
    return (await row(c,`SELECT public.contratpro_rental_${op}($1::uuid,$2::uuid,$3::integer,$4::uuid${suffix}) AS result`,args)).result;
  };
  const detail = async (g,r,subject=g.owner.subject) => as(subject,async c => (await row(c,
    'SELECT public.contratpro_rental_detail($1::uuid,$2::uuid) AS result',[g.agency,r.id])).result);
  const make = async (g,start,end,key,overrides) => as(g.owner.subject,c => create(c,g,start,end,key,overrides));
  const mutate = async (op,g,r,extra,request) => as(g.owner.subject,c => change(c,op,g,r,extra,request));
  const snapshot = async g => (await row(admin,`SELECT jsonb_build_object(
    'contracts',(SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY id),'[]') FROM tenancy.rental_contracts c WHERE agency_id=$1),
    'numbers',(SELECT coalesce(jsonb_agg(to_jsonb(n) ORDER BY year),'[]') FROM app_private.rental_numbers n WHERE agency_id=$1),
    'receipts',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY contract_id),'[]') FROM app_private.rental_creation_receipts r WHERE agency_id=$1),
    'confirmations',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY contract_id),'[]') FROM app_private.rental_confirmation_receipts r WHERE agency_id=$1),
    'audit',(SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY id),'[]') FROM tenancy.audit_events a WHERE agency_id=$1)) AS result`,[g.agency])).result;
  const race = async (subject,leftWork,rightWork,{rollbackLeft=false}={}) => {
    const left=await begin(subject),right=await begin(subject);
    try {
      const lp=(await row(left,'SELECT pg_backend_pid() AS pid')).pid;
      const rp=(await row(right,'SELECT pg_backend_pid() AS pid')).pid;
      const first=await leftWork(left);
      // Catch immediately: no unhandled rejection while the barrier observes locks.
      const second=rightWork(right).then(value=>({ok:true,value}),error=>({ok:false,code:error.code}));
      const deadline=Date.now()+5000;
      let blocked=false;
      while(Date.now()<deadline) {
        blocked=(await row(admin,'SELECT $1::integer=ANY(pg_blocking_pids($2::integer)) AS blocked',[lp,rp])).blocked;
        if(blocked) break;
        await new Promise(resolve=>setTimeout(resolve,10));
      }
      assert.equal(blocked,true,'contender must demonstrably wait on the first transaction');
      await left.query(rollbackLeft?'ROLLBACK':'COMMIT');
      const outcome=await second;
      await right.query(outcome.ok?'COMMIT':'ROLLBACK');
      return { first,second:outcome };
    } finally {
      for(const c of [left,right]) { try { await c.query('ROLLBACK'); } finally { await c.end(); } }
    }
  };

  await test('pg17-execution-owner-acl-force-rls',async()=>{
    const tables=await admin.query(`SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid IN(
      'tenancy.rental_contracts'::regclass,'app_private.rental_numbers'::regclass,
      'app_private.rental_creation_receipts'::regclass,'app_private.rental_confirmation_receipts'::regclass)`);
    assert.equal(tables.rowCount,4);
    assert.ok(tables.rows.every(r=>r.relrowsecurity&&r.relforcerowsecurity));
    const f=await row(admin,`SELECT bool_and(p.proowner='contratpro_rental_writer'::regrole AND p.prosecdef
      AND p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on']) AS valid
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'contratpro_rental_%'`);
    assert.equal(f.valid,true);
    for(const sql of ['SELECT * FROM tenancy.rental_contracts',"INSERT INTO tenancy.rental_contracts DEFAULT VALUES",'SELECT app_private.rental_member(NULL)']) {
      await expectCode('42501',()=>as(null,c=>c.query(sql)));
    }
  });
  await test('owner-and-roleless-active-staff',async()=>{
    const g=await graph();
    await make(g);
    const r=await as(g.staff.subject,c=>create(c,g));
    assert.equal(r.state,'brouillon'); assert.equal(r.number,null);
    assert.equal((await detail(g,r,g.staff.subject)).state,'brouillon');
  });
  await test('force-rls-applies-to-non-bypass-table-owner',async()=>{
    const g=await graph(); await make(g);
    await admin.query('BEGIN');
    try {
      // Transaction-local ownership experiment, NOT the deployment owner model.
      await admin.query(`CREATE ROLE harness_force_probe NOLOGIN NOSUPERUSER NOBYPASSRLS;
        GRANT USAGE ON SCHEMA tenancy TO harness_force_probe;
        ALTER TABLE tenancy.rental_contracts OWNER TO harness_force_probe;
        SET LOCAL ROLE harness_force_probe;`);
      assert.equal((await row(admin,'SELECT count(*)::integer AS n FROM tenancy.rental_contracts')).n,0);
    } finally { await admin.query('RESET ROLE; ROLLBACK'); }
    assert.equal((await detail(g,(await make(g)))).state,'brouillon');
  });
  await test('revoked-disabled-suspended-anonymous',async()=>{
    const g=await graph();
    await admin.query("UPDATE tenancy.memberships SET state='revoked' WHERE agency_id=$1 AND user_id=$2",[g.agency,g.staff.user]);
    await expectCode('42501',()=>as(g.staff.subject,c=>create(c,g)));
    await admin.query("UPDATE identity.users SET state='disabled' WHERE id=$1",[g.owner.user]);
    await expectCode('42501',()=>make(g));
    await admin.query("UPDATE identity.users SET state='active' WHERE id=$1",[g.owner.user]);
    await admin.query("UPDATE tenancy.agencies SET state='suspended' WHERE id=$1",[g.agency]);
    await expectCode('42501',()=>make(g));
    await expectCode('42501',()=>as(null,c=>create(c,g),'anon'));
  });
  await test('cross-tenant-references-and-detail',async()=>{
    const a=await graph(),b=await graph();
    await expectCode('22023',()=>make(a,undefined,undefined,undefined,{clientId:b.client}));
    await expectCode('22023',()=>make(a,undefined,undefined,undefined,{vehicleId:b.vehicle}));
    const r=await make(a);
    await expectCode('42501',()=>detail(a,r,b.owner.subject));
    assert.equal(await detail(b,r),null);
  });
  await test('date-money-validation-and-exact-days',async()=>{
    const g=await graph();
    const start=iso(24);
    for(const [end,overrides] of [[start,{}],[iso(12),{}],[iso(48),{dailyRateMinor:0.5}],[iso(48),{depositMinor:-1}],[iso(48),{dailyRateMinor:1000000000001}]]) {
      await expectCode('22023',()=>make(g,start,end,undefined,overrides));
    }
    const r=await make(g,start,new Date(new Date(start).getTime()+86400001).toISOString());
    const d=await detail(g,r);
    assert.equal(d.billable_days,2); assert.equal(d.total_minor,20000); assert.equal(d.deposit_minor,0);
  });
  await test('creation-idempotency-and-conflicting-key',async()=>{
    const g=await graph(),key=randomUUID(),s=iso(24),e=iso(48);
    const r=await make(g,s,e,key),before=await snapshot(g);
    assert.deepEqual(await make(g,s,e,key),r);
    assert.deepEqual(await snapshot(g),before);
    await expectCode('40001',()=>make(g,s,e,key,{dailyRateMinor:10001}));
    assert.deepEqual(await snapshot(g),before);
  });
  await test('confirmation-replay-stale-version-and-audit',async()=>{
    const g=await graph(),r=await make(g),key=randomUUID();
    const confirmed=await mutate('confirm',g,r,undefined,key),before=await snapshot(g);
    assert.ok(confirmed.number); assert.equal(confirmed.version,2);
    assert.deepEqual(await mutate('confirm',g,r,undefined,key),confirmed);
    assert.deepEqual(await snapshot(g),before);
    await expectCode('40001',()=>mutate('cancel',g,r));
    assert.equal(before.audit.filter(a=>a.action==='rentals.confirm').length,1);
  });
  await test('concurrent-numbering-distinct-vehicles',async()=>{
    const g=await graph(),other={...g,vehicle:await vehicle(g)};
    const a=await make(g),b=await make(other);
    const outcome=await race(g.owner.subject,c=>change(c,'confirm',g,a),c=>change(c,'confirm',g,b));
    assert.equal(outcome.second.ok,true);
    assert.notEqual(outcome.first.number,outcome.second.value.number);
  });
  await test('number-width-and-bigint-capacity',async()=>{
    const g=await graph();
    const year=(await row(admin,"SELECT extract(year FROM clock_timestamp() AT TIME ZONE 'Africa/Casablanca')::integer AS y")).y;
    await admin.query('INSERT INTO app_private.rental_numbers VALUES($1,$2,9998)',[g.agency,year]);
    for(const expected of ['9999','10000','10001']) {
      const v={...g,vehicle:await vehicle(g)},r=await make(v),c=await mutate('confirm',g,r);
      assert.equal(c.number,`CTR-${year}-${expected}`);
    }
    await admin.query('UPDATE app_private.rental_numbers SET last_value=9223372036854775807 WHERE agency_id=$1',[g.agency]);
    const v={...g,vehicle:await vehicle(g)},r=await make(v),before=await snapshot(g);
    await expectCode('22023',()=>mutate('confirm',g,r));
    assert.deepEqual(await snapshot(g),before);
  });
  await test('concurrent-overlapping-confirmations',async()=>{
    const g=await graph(),s=iso(24),e=iso(48),a=await make(g,s,e),b=await make(g,s,e);
    const outcome=await race(g.owner.subject,c=>change(c,'confirm',g,a),c=>change(c,'confirm',g,b));
    assert.deepEqual(outcome.second,{ok:false,code:'23P01'});
    assert.equal((await detail(g,b)).state,'brouillon');
  });
  await test('confirmation-versus-extension',async()=>{
    const g=await graph(),a=await mutate('confirm',g,await make(g,iso(24),iso(48))),b=await make(g,iso(72),iso(96));
    const outcome=await race(g.owner.subject,c=>change(c,'extend',g,a,iso(84)),c=>change(c,'confirm',g,b));
    assert.deepEqual(outcome.second,{ok:false,code:'23P01'});
  });
  await test('concurrent-extensions-stale-version',async()=>{
    const g=await graph(),a=await mutate('confirm',g,await make(g));
    const outcome=await race(g.owner.subject,c=>change(c,'extend',g,a,iso(60)),c=>change(c,'extend',g,a,iso(72)));
    assert.deepEqual(outcome.second,{ok:false,code:'40001'});
    const d=await detail(g,a); assert.equal(d.version,3); assert.equal(d.daily_rate_minor,10000);
  });
  await test('different-contract-concurrent-extension-conflict',async()=>{
    const g=await graph(),a=await mutate('confirm',g,await make(g,iso(24),iso(48))),b=await mutate('confirm',g,await make(g,iso(72),iso(96)));
    const outcome=await race(g.owner.subject,c=>change(c,'extend',g,b,iso(120)),c=>change(c,'extend',g,a,iso(84)));
    assert.deepEqual(outcome.second,{ok:false,code:'23P01'});
    assert.equal((await detail(g,a)).version,a.version);
  });
  await test('start-versus-start-and-explicit-return',async()=>{
    const g=await graph(),a=await mutate('confirm',g,await make(g,iso(-1),iso(1)));
    const outcome=await race(g.owner.subject,c=>change(c,'start',g,a),c=>change(c,'start',g,a));
    assert.deepEqual(outcome.second,{ok:false,code:'40001'});
    await expectCode('22023',()=>mutate('cancel',g,outcome.first));
    await expectCode('22023',()=>mutate('complete',g,outcome.first,false));
    const done=await mutate('complete',g,outcome.first,true),d=await detail(g,done);
    assert.equal(done.state,'termine'); assert.ok(d.returned_at);
    assert.equal((await snapshot(g)).audit.filter(a=>a.action==='rentals.returned').length,1);
  });
  await test('ongoing-extension-and-denied-terminal-extension',async()=>{
    const g=await graph(),draft=await make(g,iso(-1),iso(1));
    await expectCode('22023',()=>mutate('extend',g,draft,iso(2)));
    const ongoing=await mutate('start',g,await mutate('confirm',g,draft));
    const extended=await mutate('extend',g,ongoing,iso(2));
    assert.equal(extended.state,'en_cours');
    const done=await mutate('complete',g,extended,true);
    await expectCode('22023',()=>mutate('extend',g,done,iso(3)));
  });
  await test('overdue-start-versus-completion-preserves-future-reservation',async()=>{
    const g=await graph(),a=await mutate('confirm',g,await make(g,iso(-4),iso(-2))),b=await mutate('confirm',g,await make(g,iso(-1),iso(1)));
    // Explicit test-only fault/state fixture: an unreturned vehicle after its end.
    // No clock patch or production RPC substitution. Only bootstrap may inject it.
    await admin.query("UPDATE tenancy.rental_contracts SET state='en_cours',version=version+1 WHERE id=$1",[a.id]);
    const ongoing={...a,version:a.version+1},before=await detail(g,b);
    assert.equal(before.overdueConflict,true); assert.equal(before.physicalUnavailable,true);
    await expectCode('23P01',()=>mutate('start',g,b));
    assert.deepEqual(await detail(g,b),before);
    const outcome=await race(g.owner.subject,c=>change(c,'complete',g,ongoing,true),c=>change(c,'start',g,b));
    assert.equal(outcome.second.ok,true);
    assert.equal(outcome.second.value.state,'en_cours');
  });
  await test('immutable-issued-number-and-receipts',async()=>{
    const g=await graph(),r=await mutate('confirm',g,await make(g));
    await expectCode('42501',()=>admin.query('UPDATE tenancy.rental_contracts SET number_serial=number_serial+1 WHERE id=$1',[r.id]));
    await expectCode('42501',()=>admin.query('DELETE FROM app_private.rental_confirmation_receipts WHERE contract_id=$1',[r.id]));
  });
  await test('full-rollback-after-audit-failure',async()=>{
    const g=await graph(),r=await make(g),before=await snapshot(g);
    await admin.query(`CREATE FUNCTION public.harness_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.action IN('rentals.confirm','rentals.created') THEN RAISE EXCEPTION 'INJECTED'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER harness_fail_audit BEFORE INSERT ON tenancy.audit_events FOR EACH ROW EXECUTE FUNCTION public.harness_fail_audit();`);
    try {
      await expectCode('P0001',()=>make(g)); assert.deepEqual(await snapshot(g),before);
      await expectCode('P0001',()=>mutate('confirm',g,r)); assert.deepEqual(await snapshot(g),before);
    }
    finally { await admin.query('DROP TRIGGER harness_fail_audit ON tenancy.audit_events; DROP FUNCTION public.harness_fail_audit()'); }
  });
  await test('rollback-releases-competing-reservation',async()=>{
    const g=await graph(),s=iso(24),e=iso(48),a=await make(g,s,e),b=await make(g,s,e);
    const outcome=await race(g.owner.subject,c=>change(c,'confirm',g,a),c=>change(c,'confirm',g,b),{rollbackLeft:true});
    assert.equal(outcome.second.ok,true);
    assert.equal((await detail(g,a)).state,'brouillon');
    assert.equal(outcome.first.number,outcome.second.value.number);
  });
}
