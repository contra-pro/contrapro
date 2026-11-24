import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";
import { createHmac } from "node:crypto";

it("billing: durable catalog, independent platform authority, lifecycle and atomic quotas", async () => {
  const db = new PGlite(), root = new URL("../../../../", import.meta.url);
  const read = (f: string) => readFileSync(new URL(f, root), "utf8");
  const id = (n: number) => `50000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
  const subject=id(1), user=id(2), agency=id(3), other=id(4), foreign=id(5), admin=id(6);
  let request=100;
  const call = async (action:string,input:object={},platform=false,sub=subject,aid=agency) => {
    await db.exec("BEGIN; SET LOCAL ROLE authenticated;");
    try {
      await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[sub]);
      const result=await db.query<{value:unknown}>(platform?"SELECT public.contratpro_billing_platform($1,$2::jsonb) AS value":"SELECT public.contratpro_billing_agency($3,$1,$2::jsonb) AS value",platform?[action,JSON.stringify(input)]:[action,JSON.stringify(input),aid]);
      await db.exec("COMMIT");return result.rows[0]?.value;
    } catch(error) {await db.exec("ROLLBACK"); if(error instanceof Error)error.message+=` [${action}] ${(error as {where?:string}).where??''}`;throw error;}
  };
  const command=(action:string,input:object={},platform=false,sub=subject,aid=agency)=>call(action,{requestId:id(request++),reason:"Synthetic test evidence",...input},platform,sub,aid);
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE ROLE authenticator;
      CREATE ROLE contratpro_migration_owner NOINHERIT; CREATE ROLE contratpro_runtime NOINHERIT; CREATE ROLE contratpro_platform_runtime NOINHERIT;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT 'authenticated'::text $$;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$ SELECT '{"aal":"aal2"}'::jsonb $$; GRANT USAGE ON SCHEMA auth TO PUBLIC;
      CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      CREATE TABLE storage.objects(bucket_id text,name text,metadata jsonb); ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      GRANT USAGE ON SCHEMA storage TO authenticated; GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated;`);
    for(const f of readdirSync(new URL("supabase/migrations/",root)).sort()) await db.exec(`BEGIN; ${read(`supabase/migrations/${f}`)} COMMIT;`);
    await db.exec(`BEGIN; ${read("supabase/migration-drafts/20261118000800_vehicles.sql")} COMMIT;`);
    const receipt=read("supabase/migration-drafts/contratpro_0009_production_candidate_v3.sql");
    await db.exec(receipt.slice(receipt.indexOf("CREATE FUNCTION app_private.receipt_auth_uid()"),receipt.indexOf("-- Dedicated least-privilege owner:")));
    for(const f of ["20261120001300_rental_contracts.sql","20261122001400_vehicle_module.sql","20261122001500_rental_mvp.sql","20261124001600_contract_documents.sql","20261124001700_signing_engine.sql","20261124001800_delivery_orchestration.sql","20261124001900_google_sheets.sql","20261124002000_billing.sql"]){
      const source=read(`supabase/migration-drafts/${f}`).replace(/DO \$guard\$[\s\S]*?END \$guard\$;/,"").replace(/ROLLBACK;\s*$/,"COMMIT;");
      try{await db.exec(f.includes("0014")?`BEGIN; ${source} COMMIT;`:source);}catch(e){throw Error(`${f}: ${(e as Error).message} ${(e as {where?:string}).where??''}`);}
    }
    // Provisioning below is synthetic and only in this disposable database.
    for(const [sub,uid,aid] of [[subject,user,agency],[foreign,id(7),other]]){
      await db.query("INSERT INTO auth.users VALUES($1)",[sub]);await db.query("INSERT INTO identity.users(id,state) VALUES($1,'active')",[uid]);
      await db.query("INSERT INTO identity.supabase_users(supabase_user_id,user_id) VALUES($1,$2)",[sub,uid]);
      await db.query("INSERT INTO tenancy.agencies(id,name,state) VALUES($1,'Synthetic agency','active')",[aid]);
      // The first agency member is bootstrapped and still counts against later plans.
      await db.query("INSERT INTO tenancy.memberships(id,agency_id,user_id) VALUES($1,$2,$3)",[id(request++),aid,uid]);
    }
    await expect(call("dashboard")).rejects.toMatchObject({code:"42501"});
    const role=id(9);
    await db.query("INSERT INTO tenancy.roles(id,agency_id,key,name) VALUES($1,$2,'owner','Owner')",[role,agency]);
    await db.query("INSERT INTO tenancy.membership_roles SELECT agency_id,id,$1 FROM tenancy.memberships WHERE agency_id=$2",[role,agency]);
    await db.query("INSERT INTO tenancy.role_permissions VALUES($1,$2,'billing.view'),($1,$2,'billing.manage')",[agency,role]);
    await expect(call("dashboard",{},false,foreign)).rejects.toMatchObject({code:"42501"});
    await expect(call("dashboard",{},true)).rejects.toMatchObject({code:"42501"});
    await db.query("INSERT INTO platform.admin_identities(id,state) VALUES($1,'active')",[id(10)]);
    await db.query("INSERT INTO app_private.billing_admin_subjects VALUES($1,$2)",[admin,id(10)]);
    const plan={id:id(11),plan_key:"synthetic_only",version:1,name:"TEST ONLY",description_fr:"Essai automatisé",description_ar:"اختبار فقط",interval:"month",amount_minor:"9007199254740993",currency:"MAD",trial_days:2,features:["contracts","vehicles","team","templates","documents","signatures","email","sheets","storage"],limits:{contracts:"1",vehicles:"1",templates:"1",storage:"100"}};
    await command("catalog",{plan},true,admin);
    await expect(command("catalog",{plan:{...plan,id:id(12),version:3}},true,admin)).rejects.toMatchObject({code:"40001"});
    await command("catalog",{plan:{...plan,id:id(12),version:2,interval:"year",amount_minor:"42"}},true,admin);
    await expect(db.query("UPDATE app_private.billing_plans SET amount_minor=1 WHERE id=$1",[plan.id])).rejects.toMatchObject({code:"42501"});
    const trial=await command("trial",{planId:plan.id}) as {subscription:{revision:number;state:string}};
    expect(trial.subscription.state).toBe("trialing");
    await expect(command("trial",{planId:plan.id})).rejects.toMatchObject({code:"40001"});
    const races=await Promise.allSettled(Array.from({length:8},(_,n)=>db.query("SELECT app_private.billing_reserve($1,'templates',$2,1)",[agency,`template-${n}`])));
    expect(races.filter(r=>r.status==="fulfilled")).toHaveLength(1);
    expect((await db.query("SELECT used::text,reserved::text FROM app_private.billing_usage WHERE metric='templates'")).rows).toEqual([{used:"0",reserved:"1"}]);
    const winner=races.findIndex(r=>r.status==="fulfilled");await db.query("SELECT app_private.billing_settle($1,'templates',$2,false)",[agency,`template-${winner}`]);
    await db.exec("BEGIN");await db.query("SELECT app_private.billing_reserve($1,'storage','failed-upload',50)",[agency]);await db.exec("ROLLBACK");
    expect((await db.query("SELECT count(*)::int n FROM app_private.billing_reservations WHERE metric='storage'")).rows).toEqual([{n:0}]);
    // Real DB routines, not an in-memory quota imitation. One transaction rolls back all failed usage.
    await db.query("SELECT app_private.billing_reserve($1,'contracts','logical-contract',1)",[agency]);
    await db.query("SELECT app_private.billing_settle($1,'contracts','logical-contract',true)",[agency]);
    await db.query("SELECT app_private.billing_reserve($1,'contracts','logical-contract',1)",[agency]);
    await expect(db.query("SELECT app_private.billing_reserve($1,'contracts','second-contract',1)",[agency])).rejects.toMatchObject({code:"PBL01"});
    expect((await db.query("SELECT used::text,reserved::text FROM app_private.billing_usage WHERE metric='contracts'")).rows).toEqual([{used:"1",reserved:"0"}]);
    await db.exec("SET TIME ZONE 'Pacific/Honolulu'");
    await expect(db.query("SELECT app_private.billing_reserve($1,'contracts','timezone-cannot-reset',1)",[agency])).rejects.toMatchObject({code:"PBL01"});
    await db.exec("SET TIME ZONE 'UTC'");
    await db.query("SELECT app_private.billing_reserve($1,'vehicles','car',1)",[agency]);
    await db.query("SELECT app_private.billing_settle($1,'vehicles','car',false)",[agency]);
    await db.query("SELECT app_private.billing_reserve($1,'vehicles','other-car',1)",[agency]);
    await db.query("SELECT app_private.billing_settle($1,'vehicles','other-car',true)",[agency]);
    await db.query("SELECT app_private.billing_settle($1,'vehicles','other-car',false)",[agency]);
    expect((await db.query("SELECT used::text,reserved::text FROM app_private.billing_usage WHERE metric='vehicles'")).rows).toEqual([{used:"0",reserved:"0"}]);
    const changed=await command("change",{planId:id(12),revision:1}) as {subscription:{revision:number};payments:{id:string;state:string;amount_minor:string}[]};
    expect(changed.payments[0]).toMatchObject({state:"pending",amount_minor:"42"});
    await expect(command("confirm",{paymentId:changed.payments[0]!.id})).rejects.toMatchObject({code:"42501"});
    await command("reference",{paymentId:changed.payments[0]!.id,reference:"synthetic-ref"});
    await db.query("INSERT INTO platform.admin_identities(id,state) VALUES($1,'active')",[id(820)]);
    await db.query("INSERT INTO app_private.billing_admin_subjects VALUES($1,$2)",[subject,id(820)]);
    await expect(command("confirm",{paymentId:changed.payments[0]!.id},true,subject)).rejects.toMatchObject({code:"42501"});
    await command("confirm",{paymentId:changed.payments[0]!.id},true,admin);
    expect((await call("dashboard") as {subscription:{state:string}}).subscription.state).toBe("trialing"); // future renewal cannot truncate trial
    await expect(command("change",{planId:plan.id,revision:changed.subscription.revision})).rejects.toMatchObject({code:"40001"});
    await command("suspend",{agencyId:agency,revision:changed.subscription.revision},true,admin);
    await command("reactivate",{agencyId:agency,revision:changed.subscription.revision+1},true,admin);
    expect((await db.query("SELECT activation_state FROM app_private.billing_payments WHERE id=$1",[changed.payments[0]!.id])).rows).toEqual([{activation_state:"pending"}]);
    await command("cancel",{revision:changed.subscription.revision+2});
    expect((await db.query("SELECT activation_state FROM app_private.billing_payments WHERE id=$1",[changed.payments[0]!.id])).rows).toEqual([{activation_state:"cancelled"}]);
    await db.query("UPDATE app_private.billing_subscriptions SET period_start=clock_timestamp()-interval '3 days',trial_end=clock_timestamp()-interval '1 second',period_end=clock_timestamp()-interval '1 second' WHERE agency_id=$1",[agency]);
    await db.query("SELECT app_private.billing_refresh($1)",[agency]);
    expect((await call("dashboard") as {subscription:{state:string}}).subscription.state).toBe("cancelled");
    await expect(db.query("SELECT app_private.billing_reserve($1,'templates','new',1)",[agency])).rejects.toMatchObject({code:"PBL02"});
    expect((await db.query("SELECT count(*)::int n FROM tenancy.agencies")).rows).toEqual([{n:2}]);
    await expect(command("transition",{agencyId:agency,revision:4,target:"active"},true,admin)).rejects.toMatchObject({code:"40001"});
    const dashboard=JSON.stringify(await call("dashboard",{},true,admin));expect(dashboard).not.toMatch(/client_name|agency_signature|client_signature|identityNumber|profile_snapshot|body_hash/);
    const gatewaySecret="c".repeat(64);await db.query("INSERT INTO app_private.billing_gateway_key(secret) VALUES($1)",[gatewaySecret]);
    const gateway=async(input:object,valid=true)=>{
      const payload=JSON.stringify(input),mac=createHmac("sha256",Buffer.from(gatewaySecret,"hex")).update(payload).digest("hex");
      await db.exec("BEGIN; SET LOCAL ROLE anon");try{const r=await db.query<{value:unknown}>("SELECT public.contratpro_billing_gateway($1,$2) value",[payload,valid?mac:"f".repeat(64)]);await db.exec("COMMIT");return r.rows[0]?.value;}catch(e){await db.exec("ROLLBACK");if(e instanceof Error)e.message+=` ${(e as {where?:string}).where??''}`;throw e;}
    };
    const beforeRequest=(await call("dashboard") as {subscription:{revision:number}}).subscription;
    const requested=await command("request",{planId:plan.id,revision:beforeRequest.revision}) as {payments:{id:string;state:string}[];subscription:{revision:number}};
    const pid=requested.payments.find(p=>p.state==="pending")!.id;
    await expect(gateway({action:"prepare",provider:"synthetic-only",kind:"checkout",paymentId:pid,operationId:id(800)},false)).rejects.toMatchObject({code:"42501"});
    expect(await gateway({action:"prepare",provider:"synthetic-only",kind:"checkout",paymentId:pid,operationId:id(800)})).toMatchObject({send:true});
    expect(await gateway({action:"prepare",provider:"synthetic-only",kind:"checkout",paymentId:pid,operationId:id(800)})).toMatchObject({send:false});
    const event={action:"event",provider:"synthetic-only",paymentId:pid,eventId:"paid-1",providerPaymentId:"test-provider-payment",sequence:"2",status:"confirmed",amountMinor:plan.amount_minor,currency:"MAD"};
    expect(await gateway(event)).toBe("applied");expect(await gateway(event)).toBe("applied");
    await expect(gateway({...event,currency:"EUR"})).rejects.toMatchObject({code:"40001"});
    expect(await gateway({...event,eventId:"older",sequence:"1",status:"failed"})).toBe("stale");
    expect((await call("dashboard") as {subscription:{state:string}}).subscription.state).toBe("active");
    expect(await gateway({...event,eventId:"refund",sequence:"3",status:"refunded"})).toBe("applied");
    expect(await gateway({...event,eventId:"late-paid",sequence:"4"})).toBe("terminal");
    // New period isolates periodic quotas, while logical-contract replay still consumes no extra unit.
    await db.query("SELECT app_private.billing_reserve($1,'contracts','period-two',1)",[agency]);
    await db.query("SELECT app_private.billing_settle($1,'contracts','period-two',true)",[agency]);
    await db.query("SELECT app_private.billing_reserve($1,'contracts','logical-contract',1)",[agency]);
    expect((await db.query("SELECT count(*)::int n FROM app_private.billing_usage WHERE metric='contracts'")).rows).toEqual([{n:2}]);
    // Real business RPC creation retries hit the same authoritative quota trigger.
    await db.query("INSERT INTO tenancy.roles(id,agency_id,key,name) VALUES($1,$2,'owner','Owner')",[id(810),other]);
    await db.query("INSERT INTO tenancy.membership_roles SELECT agency_id,id,$1 FROM tenancy.memberships WHERE agency_id=$2",[id(810),other]);
    await db.query("INSERT INTO tenancy.role_permissions VALUES($1,$2,'agency.manage'),($1,$2,'billing.view'),($1,$2,'billing.manage')",[other,id(810)]);
    await command("trial",{planId:plan.id},false,foreign,other);
    const foreignChange=await command("change",{planId:plan.id,revision:1},false,foreign,other) as {payments:{id:string}[]};
    await expect(command("reference",{paymentId:foreignChange.payments[0]!.id,reference:" synthetic-ref "},false,foreign,other)).rejects.toMatchObject({code:"23505"});
    const asForeign=async(sql:string,params:unknown[])=>{await db.exec("BEGIN;SET LOCAL ROLE authenticated");try{await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[foreign]);const r=await db.query<{value:unknown}>(sql,params);await db.exec("COMMIT");return r.rows[0]?.value;}catch(e){await db.exec("ROLLBACK");if(e instanceof Error)e.message+=` ${(e as {where?:string}).where??''}`;throw e;}};
    const client=await asForeign("SELECT public.contratpro_client_create($1,$2,$3::jsonb) value",[other,id(811),JSON.stringify({firstName:"Synthetic",lastName:"Driver",phone:"+212600000000",email:"",nationality:"",identityType:"none",identityNumber:"",licenceNumber:"",licenceIssueDate:"",licenceExpiryDate:"",address:"",city:"",notes:""})]);
    const carInput=JSON.stringify({registration:"BILLING-TEST",make:"Synthetic",model:"Fixture",year:"2026",mileage:"0"});
    const car=await asForeign("SELECT public.contratpro_vehicle_create($1,$2,$3::jsonb) value",[other,id(812),carInput]);
    expect(await asForeign("SELECT public.contratpro_vehicle_create($1,$2,$3::jsonb) value",[other,id(812),carInput])).toBe(car);
    const rentalInput=JSON.stringify({clientId:client,vehicleId:car,start:"2026-12-01T09:00:00Z",end:"2026-12-02T09:00:00Z",dailyRateMinor:10000});
    const rental=await asForeign("SELECT public.contratpro_rental_create($1,$2,$3::jsonb) value",[other,id(813),rentalInput]);
    expect(await asForeign("SELECT public.contratpro_rental_create($1,$2,$3::jsonb) value",[other,id(813),rentalInput])).toEqual(rental);
    await expect(asForeign("SELECT public.contratpro_rental_create($1,$2,$3::jsonb) value",[other,id(814),rentalInput])).rejects.toMatchObject({code:"PBL01"});
    expect((await db.query("SELECT used::text FROM app_private.billing_usage WHERE agency_id=$1 AND metric='contracts'",[other])).rows).toEqual([{used:"1"}]);
    await expect(call("document",{id:pid},false,foreign,other)).rejects.toMatchObject({code:"P0002"});
    await db.query("UPDATE app_private.billing_subscriptions SET period_start=clock_timestamp()-interval '3 days',period_end=clock_timestamp()-interval '1 second',trial_end=clock_timestamp()-interval '1 second' WHERE agency_id=$1",[other]);
    expect((await call("dashboard",{},false,foreign,other) as {subscription:{state:string}}).subscription.state).toBe("expired");
    expect((await db.query("SELECT count(*)::int n FROM tenancy.rental_contracts WHERE agency_id=$1",[other])).rows).toEqual([{n:1}]);
    let current=(await call("dashboard") as {subscription:{revision:number}}).subscription;
    await command("suspend",{agencyId:agency,revision:current.revision},true,admin);
    await expect(db.query("SELECT app_private.billing_reserve($1,'storage','blocked',1)",[agency])).rejects.toMatchObject({code:"PBL02"});
    current=(await call("dashboard") as {subscription:{revision:number}}).subscription;
    await command("reactivate",{agencyId:agency,revision:current.revision},true,admin);
    current=(await call("dashboard") as {subscription:{revision:number}}).subscription;
    await command("transition",{agencyId:agency,revision:current.revision,target:"past_due"},true,admin);
    current=(await call("dashboard") as {subscription:{revision:number}}).subscription;
    await command("transition",{agencyId:agency,revision:current.revision,target:"grace_period",graceEnd:"2099-01-01T00:00:00Z"},true,admin);
    await db.query("SELECT app_private.billing_reserve($1,'storage','grace-allowed',1)",[agency]);
    await db.query("UPDATE app_private.billing_subscriptions SET grace_end=clock_timestamp()-interval '1 second' WHERE agency_id=$1",[agency]);
    expect((await call("dashboard") as {subscription:{state:string}}).subscription.state).toBe("expired");
    await command("catalog",{plan:{...plan,id:id(830),version:3,features:["contracts"]}},true,admin);
    await db.query("UPDATE app_private.billing_subscriptions SET state='active',plan_id=$2,period_start=clock_timestamp(),period_end=clock_timestamp()+interval '1 month' WHERE agency_id=$1",[other,id(830)]);
    await expect(db.query("SELECT app_private.billing_reserve($1,'documents','disabled-feature',1)",[other])).rejects.toMatchObject({code:"PBL02"});
    await command("archive",{planId:plan.id,archived:true},true,admin);
    expect((await call("dashboard") as {plans:{id:string;archived:boolean}[]}).plans).toContainEqual(expect.objectContaining({id:plan.id,archived:true}));
    await expect(asForeign("SELECT * FROM app_private.billing_subscriptions",[])).rejects.toMatchObject({code:"42501"});
    await expect(asForeign("SELECT app_private.billing_reserve($1,'contracts','forged',1)",[agency])).rejects.toMatchObject({code:"42501"});
    await db.exec("CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$ SELECT '{\"aal\":\"aal1\"}'::jsonb $$");
    await expect(call("dashboard",{},true,admin)).rejects.toMatchObject({code:"42501"});
  } finally {await db.close();}
},120000);
