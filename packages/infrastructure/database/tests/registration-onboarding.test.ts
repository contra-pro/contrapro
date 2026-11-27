import {readFileSync,readdirSync} from 'node:fs';import {PGlite} from '@electric-sql/pglite';import {expect,it} from 'vitest';import {parse} from 'pgsql-parser';import {parsePlPgSQL} from 'libpg-query';
const root=new URL('../../../../',import.meta.url),read=(p:string)=>readFileSync(new URL(p,root),'utf8'),source=read('supabase/migration-drafts/20261127002700_registration_onboarding.sql');
it('0027 is guarded, parses and contains no published legal documents or metadata authority',async()=>{expect(source).toContain("RAISE EXCEPTION 'LOCAL DESIGN ONLY");expect(source.trim()).toMatch(/ROLLBACK;$/);expect(await parse(source)).toBeDefined();expect(await parsePlPgSQL(source)).toBeDefined();expect(source).not.toContain('INSERT INTO app_private.legal_documents');expect(source).not.toContain('raw_user_meta_data');});
it('executes self-profile, resume, atomic owner bootstrap, changed retries, legal versions and tenant denial in disposable PostgreSQL',async()=>{
 const db=new PGlite(),id=(n:number)=>`90000000-0000-4000-8000-${String(n).padStart(12,'0')}`,sub=id(1),uid=id(2),foreign=id(3);let created:string='';
 const asUser=async(sql:string,args:unknown[]=[],subject=sub)=>{await db.exec('BEGIN; SET LOCAL ROLE authenticated;');try{await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[subject]);const result=await db.query<{value:unknown}>(sql,args);await db.exec('COMMIT;');return result.rows[0]?.value;}catch(e){await db.exec('ROLLBACK;');throw e;}};
 try{
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE ROLE authenticator;CREATE ROLE contratpro_migration_owner NOINHERIT;CREATE ROLE contratpro_runtime NOINHERIT;CREATE ROLE contratpro_platform_runtime NOINHERIT;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$SELECT 'authenticated'::text$$;CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$SELECT '{}'::jsonb$$;GRANT USAGE ON SCHEMA auth TO PUBLIC;`);
 for(const f of readdirSync(new URL('supabase/migrations/',root)).sort())await db.exec(`BEGIN;${read('supabase/migrations/'+f)}COMMIT;`);
 // Minimal existing A1 branding relation for this focused composition test. Full A1–A6 regressions run separately.
 await db.exec("CREATE TABLE app_private.agency_branding(agency_id uuid PRIMARY KEY REFERENCES tenancy.agencies(id),profile jsonb NOT NULL DEFAULT '{}',revision integer NOT NULL DEFAULT 0);ALTER TABLE app_private.agency_branding ENABLE ROW LEVEL SECURITY;ALTER TABLE app_private.agency_branding FORCE ROW LEVEL SECURITY;");
 await db.exec(source.replace(/DO \$guard\$[\s\S]*?END \$guard\$;/,'').replace(/ROLLBACK;\s*$/,'COMMIT;'));
 for(const [s,u]of [[sub,uid],[foreign,id(4)]]){await db.query('INSERT INTO auth.users VALUES($1)',[s]);await db.query("INSERT INTO identity.users(id,state) VALUES($1,'active')",[u]);await db.query('INSERT INTO identity.supabase_users VALUES($1,$2)',[s,u]);}
 const person={firstName:'Amina',lastName:'Exemple',callingCode:'+212',phone:'+212612345678'};
 expect(await asUser("SELECT public.contratpro_account_profile('get') AS value")).toBeNull();
 await asUser("SELECT public.contratpro_account_profile('save',$1,$2) AS value",[person,id(10)]);
 expect(await asUser("SELECT public.contratpro_account_profile('get') AS value",[],foreign)).toBeNull();
 await expect(asUser('SELECT * FROM app_private.personal_profiles')).rejects.toMatchObject({code:'42501'});
 await expect(asUser("SELECT public.contratpro_account_profile('consent',$1,$2) AS value",[{termsVersion:'invented',privacyVersion:'invented'},id(11)])).rejects.toMatchObject({code:'22023'});
 // Synthetic legal fixtures only, never deployment seed data.
 await db.exec("INSERT INTO app_private.legal_documents VALUES('terms','test-only',repeat('a',64),true),('privacy','test-only',repeat('b',64),true);");
 await asUser("SELECT public.contratpro_account_profile('consent',$1,$2) AS value",[{termsVersion:'test-only',privacyVersion:'test-only'},id(12)]);
 expect((await db.query<{n:number}>('SELECT count(*)::int n FROM app_private.legal_acceptances WHERE accepted_at IS NOT NULL')).rows[0]?.n).toBe(2);
 const data={profile:{name:'Atlas Test',phone:'+212612345678',email:'test@example.invalid',city:'Rabat',address:'Synthetic address',ice:'001234567890123',ifNumber:'000123',rc:'00042'},details:{legalName:'Atlas Test SARL',structure:'company',country:'MA',website:'',postalCode:'00100',rcCity:'Rabat',representativeName:'Amina Exemple',representativeRole:'Manager'},defaultLocale:'fr',timeZone:'Africa/Casablanca'};
 const call=(action:string,revision:number,body=data,request=id(20),subject=sub)=>asUser('SELECT public.contratpro_onboarding($1,$2,$3,$4) AS value',[action,body,request,revision],subject);
 expect(await call('draft',0)).toMatchObject({revision:1});expect(await asUser("SELECT public.contratpro_onboarding('load') AS value")).toMatchObject({data,requestId:id(20)});
 const answer=await call('finalize',1) as {agencyId:string};created=answer.agencyId;
 expect(await call('finalize',1)).toEqual(answer);
 await expect(call('finalize',1,{...data,details:{...data.details,legalName:'Changed'}})).rejects.toMatchObject({code:'22023'});
 expect((await db.query<{n:number}>('SELECT count(*)::int n FROM tenancy.agencies WHERE id=$1',[created])).rows[0]?.n).toBe(1);
 expect((await db.query<{n:number}>('SELECT count(*)::int n FROM tenancy.memberships WHERE agency_id=$1 AND user_id=$2',[created,uid])).rows[0]?.n).toBe(1);
 expect(await asUser("SELECT public.contratpro_onboarding('agency','{}',NULL,0,$1) AS value",[created])).toMatchObject({details:data.details});
 await expect(asUser("SELECT public.contratpro_onboarding('agency','{}',NULL,0,$1) AS value",[created],foreign)).rejects.toMatchObject({code:'42501'});
 expect((await db.query<{v:string}>('SELECT if_number v FROM tenancy.agencies WHERE id=$1',[created])).rows[0]?.v).toBe('000123');
 // Queue duplicate finalization calls locally. This is not native multi-session concurrency proof.
 await db.exec('SET ROLE authenticated;');await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[sub]);const duplicate=await Promise.all([db.query('SELECT public.contratpro_onboarding($1,$2,$3,1) value',['finalize',data,id(20)]),db.query('SELECT public.contratpro_onboarding($1,$2,$3,1) value',['finalize',data,id(20)])]);expect(duplicate[0]!.rows).toEqual(duplicate[1]!.rows);await db.exec('RESET ROLE;');
 const freshRequest=id(30);await asUser("SELECT public.contratpro_onboarding('new',$1,$2) AS value",[data,freshRequest]);
 await db.exec("CREATE FUNCTION app_private.test_onboarding_failure() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'Synthetic rollback';END$$;CREATE TRIGGER test_onboarding_failure BEFORE INSERT ON app_private.agency_business_details FOR EACH ROW EXECUTE FUNCTION app_private.test_onboarding_failure();");
 await expect(call('finalize',0,data,freshRequest)).rejects.toMatchObject({code:'P0001'});
 expect((await db.query<{n:number}>('SELECT count(*)::int n FROM tenancy.agencies')).rows[0]?.n).toBe(1);
 expect((await db.query<{n:number}>('SELECT count(*)::int n FROM tenancy.memberships')).rows[0]?.n).toBe(1);
 await db.exec('DROP TRIGGER test_onboarding_failure ON app_private.agency_business_details;');
 const next=await call('finalize',0,data,freshRequest) as {agencyId:string};expect(next.agencyId).not.toBe(created);expect(await call('finalize',1)).toEqual(answer);
 }finally{await db.close();}
},60000);
