-- D2 NATIVE SYNTHETIC TEST CANDIDATE ONLY. NOT A MANAGED DEPLOYMENT ARTIFACT.
-- Source: supabase/migration-drafts/20261125002300_signing_reminders_recovery.sql; raw SHA256 19f78076867002e71ea25b039ecf944d4d34876ac9b685302c0709074bd05ed1
-- contratpro-d2-0013-0028-v1; historical draft retained unchanged; native acceptance pending.
BEGIN;
SET LOCAL search_path=pg_catalog,pg_temp;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='30s';
SET LOCAL idle_in_transaction_session_timeout='10s';
DO $d2_target$ BEGIN
 IF current_database()<>'contratpro_d2_native' OR current_user<>'postgres' OR session_user<>'postgres'
 OR current_setting('server_version_num')<>'170011' OR inet_server_port() IS DISTINCT FROM 54329
 OR inet_server_addr() IS NULL OR NOT(inet_server_addr()=ANY(ARRAY['127.0.0.1'::inet,'::1'::inet]))
 OR current_setting('contratpro.d2_profile',true) IS DISTINCT FROM 'synthetic-offline'
 OR current_setting('contratpro.d2_plan_id',true) IS DISTINCT FROM 'contratpro-d2-0013-0028-v1'
 OR COALESCE(current_setting('contratpro.d2_baseline',true),'') NOT IN('candidate-synthetic','provenance-reproduced')
 THEN RAISE EXCEPTION 'D2 isolated native target/baseline binding mismatch';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=current_user AND NOT rolsuper AND rolbypassrls AND rolcreaterole AND rolcreatedb AND rolreplication AND rolinherit AND rolcanlogin) THEN RAISE EXCEPTION 'D2 administrative login model mismatch';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_stat_ssl WHERE pid=pg_catalog.pg_backend_pid() AND ssl) THEN RAISE EXCEPTION 'D2 native TLS required';END IF;
 IF NOT pg_catalog.pg_try_advisory_xact_lock(1129337680,202611) THEN RAISE EXCEPTION 'D2 migration contender';END IF;
END $d2_target$;
LOCK TABLE supabase_migrations.schema_migrations IN SHARE ROW EXCLUSIVE MODE;
DO $d2_history$ BEGIN
 IF ARRAY(SELECT version FROM supabase_migrations.schema_migrations ORDER BY version) IS DISTINCT FROM ARRAY['20261115000000','20261115000100','20261115000200','20261115000300','20261115000400','20261115000500','20261115000600','20261116000700','20261118000800','20261118000900','20261118001000','20261119001100','20261119001200','20261120001300','20261122001400','20261122001500','20261124001600','20261124001700','20261124001800','20261124001900','20261124002000','20261125002100','20261125002200']::text[]
 THEN RAISE EXCEPTION 'D2 exact predecessor history mismatch';END IF;
END $d2_history$;

CREATE TEMP TABLE d2_preservation(relation_name text,payload jsonb) ON COMMIT DROP;
DO $d2_preserve$
DECLARE rel text; BEGIN
 FOREACH rel IN ARRAY ARRAY['auth.users','storage.buckets','storage.objects','identity.users','identity.supabase_users','tenancy.agencies','tenancy.memberships','tenancy.roles','tenancy.permissions','tenancy.role_permissions','tenancy.membership_roles','tenancy.membership_invitations','tenancy.agency_settings','tenancy.audit_events','tenancy.clients','tenancy.vehicles','app_private.client_creation_receipts','platform.admin_identities'] LOOP
  IF pg_catalog.to_regclass(rel) IS NULL THEN RAISE EXCEPTION 'D2 missing preservation relation';END IF;
  EXECUTE format('INSERT INTO pg_temp.d2_preservation SELECT %L,to_jsonb(t) FROM %s t',rel,rel::regclass);
 END LOOP;
END $d2_preserve$;



CREATE TEMP TABLE d2_authority(role_name name PRIMARY KEY, own_edge jsonb, create_public boolean, create_private boolean) ON COMMIT DROP;
CREATE FUNCTION pg_temp.d2_authorize(wanted name) RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $d2$
DECLARE role_oid oid; edge jsonb; BEGIN
 IF wanted::text<>ALL(ARRAY['contratpro_rental_writer','contratpro_delivery_worker']::text[]) THEN RAISE EXCEPTION 'D2 role outside manifest';END IF;
 IF EXISTS(SELECT 1 FROM pg_temp.d2_authority WHERE role_name=wanted) THEN RETURN;END IF;
 SELECT oid INTO STRICT role_oid FROM pg_catalog.pg_roles WHERE rolname=wanted
 AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolreplication AND NOT rolinherit;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_auth_members WHERE roleid=role_oid AND member='postgres'::regrole AND admin_option) THEN RAISE EXCEPTION 'D2 lacks existing ADMIN authority';END IF;
 SELECT jsonb_build_object('admin',admin_option,'inherit',inherit_option,'set',set_option) INTO edge FROM pg_catalog.pg_auth_members
 WHERE roleid=role_oid AND member='postgres'::regrole AND grantor='postgres'::regrole;
 INSERT INTO pg_temp.d2_authority VALUES(wanted,edge,
 pg_catalog.has_schema_privilege(role_oid,'public','CREATE'),pg_catalog.has_schema_privilege(role_oid,'app_private','CREATE'));
 EXECUTE format('GRANT %I TO postgres WITH INHERIT TRUE, SET TRUE GRANTED BY postgres',wanted);
 IF NOT pg_catalog.has_schema_privilege(role_oid,'public','CREATE') THEN EXECUTE format('GRANT CREATE ON SCHEMA public TO %I',wanted);END IF;
 IF NOT pg_catalog.has_schema_privilege(role_oid,'app_private','CREATE') THEN EXECUTE format('GRANT CREATE ON SCHEMA app_private TO %I',wanted);END IF;
END $d2$;
REVOKE ALL ON FUNCTION pg_temp.d2_authorize(name) FROM PUBLIC;

SELECT pg_temp.d2_authorize('contratpro_rental_writer'::name);
SELECT pg_temp.d2_authorize('contratpro_delivery_worker'::name);
-- Retained source statements; parser-classified design stop/outer BEGIN/ROLLBACK excluded.
SET LOCAL search_path=pg_catalog,pg_temp;

SET LOCAL row_security=on;

CREATE TABLE app_private.reminder_policies(agency_id uuid PRIMARY KEY REFERENCES tenancy.agencies(id),revision integer NOT NULL,enabled boolean NOT NULL,manual_enabled boolean NOT NULL,intervals jsonb NOT NULL,max_count integer NOT NULL CHECK(max_count BETWEEN 1 AND 20));

CREATE TABLE app_private.reminder_slots(agency_id uuid NOT NULL,session_id uuid NOT NULL,token_hash text NOT NULL REFERENCES app_private.signing_invitations(token_hash),ordinal integer NOT NULL,
 seed_job uuid NOT NULL REFERENCES app_private.delivery_jobs(id),policy_revision integer NOT NULL,state text NOT NULL DEFAULT 'claimed' CHECK(state IN('claimed','materialized','failed')),lease uuid NOT NULL,lease_until timestamptz NOT NULL,attempts integer NOT NULL DEFAULT 1,
 PRIMARY KEY(agency_id,token_hash,ordinal),FOREIGN KEY(agency_id,session_id) REFERENCES app_private.signing_sessions(agency_id,id));

CREATE TABLE app_private.delivery_recoveries(agency_id uuid NOT NULL,request_id uuid NOT NULL,job_id uuid NOT NULL REFERENCES app_private.delivery_jobs(id),actor uuid NOT NULL,input jsonb NOT NULL,result jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(agency_id,request_id),FOREIGN KEY(agency_id,actor) REFERENCES tenancy.memberships(agency_id,id));

DO $tables$ DECLARE t text;BEGIN
 FOREACH t IN ARRAY ARRAY['reminder_policies','reminder_slots','delivery_recoveries'] LOOP
  EXECUTE format('ALTER TABLE app_private.%I ENABLE ROW LEVEL SECURITY',t);EXECUTE format('ALTER TABLE app_private.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON app_private.%I FROM PUBLIC,anon,authenticated,service_role',t);
  EXECUTE format('GRANT SELECT,INSERT ON app_private.%I TO contratpro_rental_writer,contratpro_delivery_worker',t);
  EXECUTE format('CREATE POLICY a3_agency ON app_private.%I TO contratpro_rental_writer USING(agency_id=nullif(current_setting(''contratpro.signing_agency'',true),'''')::uuid) WITH CHECK(agency_id=nullif(current_setting(''contratpro.signing_agency'',true),'''')::uuid)',t);
  EXECUTE format('CREATE POLICY a3_worker ON app_private.%I TO contratpro_delivery_worker USING(true) WITH CHECK(true)',t);
 END LOOP;
END $tables$;

GRANT UPDATE ON app_private.reminder_policies TO contratpro_rental_writer;

GRANT UPDATE(revision) ON app_private.reminder_policies TO contratpro_delivery_worker;

GRANT UPDATE ON app_private.reminder_slots TO contratpro_rental_writer,contratpro_delivery_worker;

CREATE TRIGGER recovery_immutable BEFORE UPDATE OR DELETE ON app_private.delivery_recoveries FOR EACH ROW EXECUTE FUNCTION app_private.rental_receipt_immutable();

ALTER FUNCTION app_private.delivery_valid(app_private.delivery_jobs) RENAME TO delivery_valid_before_a3;

CREATE FUNCTION app_private.delivery_valid(j app_private.delivery_jobs) RETURNS boolean LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
BEGIN
 IF NOT app_private.delivery_valid_before_a3(j) THEN RETURN false;END IF;
 IF j.purpose='reminder' THEN
  RETURN EXISTS(SELECT 1 FROM app_private.reminder_policies rp WHERE rp.agency_id=j.agency_id AND CASE WHEN j.event_key LIKE 'automatic-reminder:%' THEN rp.enabled ELSE rp.manual_enabled END AND
   (SELECT count(*) FROM app_private.delivery_jobs q WHERE q.agency_id=j.agency_id AND q.token_hash=j.token_hash AND q.purpose='reminder' AND (q.not_before,q.id)<=(j.not_before,j.id))<=rp.max_count)
   AND NOT EXISTS(SELECT 1 FROM app_private.delivery_jobs q WHERE q.agency_id=j.agency_id AND q.token_hash=j.token_hash AND q.id<>j.id AND (q.state='uncertain' OR q.state='processing' AND q.armed_at IS NOT NULL));
 END IF;RETURN true;
END $f$;

ALTER FUNCTION app_private.delivery_command(uuid,uuid,text,jsonb) RENAME TO delivery_command_before_a3;

CREATE FUNCTION app_private.delivery_command(aid uuid,actor uuid,action text,p jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE policy app_private.reminder_policies;j app_private.delivery_jobs;seed app_private.delivery_jobs;s app_private.signing_sessions;slot app_private.reminder_slots;r record;item jsonb;result jsonb;prior app_private.delivery_recoveries;n integer;sid uuid;BEGIN
 IF jsonb_typeof(p) IS DISTINCT FROM 'object' OR pg_column_size(p)>250000 OR current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
 IF action='reconciliation-context' THEN RETURN app_private.delivery_command_before_a3(aid,actor,'reconcile-context',p);
 ELSIF action IN('purge','purge-expired') THEN
  DELETE FROM app_private.delivery_payloads WHERE job_id IN(SELECT q.id FROM app_private.delivery_jobs q WHERE (action='purge-expired' OR q.agency_id=aid AND q.session_id=(p->>'sessionId')::uuid) AND (q.expires_at<=clock_timestamp() OR q.state IN('delivered','bounced','cancelled') AND NOT(q.purpose='invitation' AND EXISTS(SELECT 1 FROM app_private.reminder_policies WHERE agency_id=q.agency_id AND enabled))) LIMIT 1000);RETURN 'true';
 ELSIF action='reminder-history' THEN
  PERFORM set_config('contratpro.signing_agency',aid::text,true);
  PERFORM 1 FROM app_private.signing_sessions WHERE agency_id=aid AND id=(p->>'sessionId')::uuid;IF NOT FOUND THEN RAISE EXCEPTION 'Missing' USING ERRCODE='P0002';END IF;
  SELECT COALESCE(jsonb_agg(v),'[]') INTO result FROM (SELECT ordinal,attempts,policy_revision AS "policyRevision",CASE WHEN state='claimed' AND attempts>=5 AND lease_until<=clock_timestamp() THEN 'failed' ELSE state END AS state FROM app_private.reminder_slots WHERE agency_id=aid AND session_id=(p->>'sessionId')::uuid ORDER BY lease_until DESC,ordinal DESC LIMIT 100) v;RETURN result;
 ELSIF action IN('reminder-policy','reminder-policy-save') THEN
  PERFORM set_config('contratpro.signing_agency',aid::text,true);
  SELECT * INTO policy FROM app_private.reminder_policies WHERE agency_id=aid FOR UPDATE;
  IF action='reminder-policy-save' THEN
   IF actor IS NULL OR COALESCE(policy.revision,0) IS DISTINCT FROM (p->>'revision')::integer THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
   IF jsonb_typeof(p->'enabled') IS DISTINCT FROM 'boolean' OR jsonb_typeof(p->'manualEnabled') IS DISTINCT FROM 'boolean' OR jsonb_typeof(p->'intervals') IS DISTINCT FROM 'array' OR jsonb_array_length(p->'intervals') NOT BETWEEN 1 AND 20 OR COALESCE((p->>'maxCount')::integer,0) NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
   n:=0;FOR item IN SELECT value FROM jsonb_array_elements(p->'intervals') LOOP
    IF jsonb_typeof(item)<>'number' OR item::text !~ '^[0-9]+$' OR item::text::integer<=n OR item::text::integer>10080 THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;n:=item::text::integer;
   END LOOP;
   INSERT INTO app_private.reminder_policies VALUES(aid,1,(p->>'enabled')::boolean,(p->>'manualEnabled')::boolean,p->'intervals',(p->>'maxCount')::integer)
    ON CONFLICT(agency_id) DO UPDATE SET revision=reminder_policies.revision+1,enabled=EXCLUDED.enabled,manual_enabled=EXCLUDED.manual_enabled,intervals=EXCLUDED.intervals,max_count=EXCLUDED.max_count RETURNING * INTO policy;
   INSERT INTO tenancy.audit_events(agency_id,actor_membership_id,action,request_id,metadata) VALUES(aid,actor,'delivery.reminder-policy',gen_random_uuid(),jsonb_build_object('revision',policy.revision,'enabled',policy.enabled,'manualEnabled',policy.manual_enabled,'intervals',policy.intervals,'maxCount',policy.max_count));
   -- Policy edits retire pending reminders; already armed effects stay uncertain.
   UPDATE app_private.delivery_jobs SET obsolete=true,retryable=false,state=CASE WHEN state='processing' AND armed_at IS NOT NULL THEN 'uncertain' ELSE 'cancelled' END WHERE agency_id=aid AND purpose='reminder' AND state IN('queued','failed','processing');
  END IF;
  IF policy.agency_id IS NULL THEN RETURN 'null';END IF;
  RETURN jsonb_build_object('revision',policy.revision,'enabled',policy.enabled,'manualEnabled',policy.manual_enabled,'intervals',policy.intervals,'maxCount',policy.max_count);
 ELSIF action='reminder-claim' THEN
  FOR r IN SELECT q.id,q.agency_id,q.session_id FROM app_private.delivery_jobs q JOIN app_private.reminder_policies rp ON rp.agency_id=q.agency_id AND rp.enabled
   WHERE q.purpose='invitation' AND NOT q.obsolete AND q.expires_at>clock_timestamp() AND (q.state IN('accepted','delivered') OR q.channel='manual-whatsapp' AND q.manual_status='reported-sent')
   AND NOT EXISTS(SELECT 1 FROM app_private.reminder_slots rs WHERE rs.agency_id=q.agency_id AND rs.token_hash=q.token_hash AND rs.state='claimed' AND rs.lease_until>clock_timestamp())
   AND (SELECT count(*) FROM app_private.delivery_jobs dj WHERE dj.agency_id=q.agency_id AND dj.token_hash=q.token_hash AND dj.purpose='reminder')<rp.max_count
   AND NOT EXISTS(SELECT 1 FROM app_private.delivery_jobs dj WHERE dj.agency_id=q.agency_id AND dj.token_hash=q.token_hash AND (dj.state='uncertain' OR dj.state='processing' AND dj.armed_at IS NOT NULL))
   AND (EXISTS(SELECT 1 FROM app_private.reminder_slots rs WHERE rs.agency_id=q.agency_id AND rs.token_hash=q.token_hash AND rs.state='claimed' AND rs.lease_until<=clock_timestamp() AND (rs.attempts>=5 OR rs.ordinal>jsonb_array_length(rp.intervals) OR q.not_before+make_interval(mins=>(rp.intervals->>(rs.ordinal-1))::integer)<=clock_timestamp())) OR
    q.not_before+make_interval(mins=>(rp.intervals->>(SELECT COALESCE(max(rs.ordinal),0) FROM app_private.reminder_slots rs WHERE rs.agency_id=q.agency_id AND rs.token_hash=q.token_hash))::integer)<=clock_timestamp())
   ORDER BY q.not_before,q.id LIMIT 100 LOOP
   PERFORM set_config('contratpro.signing_agency',r.agency_id::text,true);
   PERFORM 1 FROM app_private.signing_sessions WHERE agency_id=r.agency_id AND id=r.session_id FOR UPDATE SKIP LOCKED;IF NOT FOUND THEN CONTINUE;END IF;
   SELECT * INTO seed FROM app_private.delivery_jobs WHERE id=r.id;
   IF NOT app_private.delivery_valid(seed) OR EXISTS(SELECT 1 FROM app_private.delivery_jobs WHERE agency_id=seed.agency_id AND token_hash=seed.token_hash AND (state='uncertain' OR state='processing' AND armed_at IS NOT NULL)) THEN CONTINUE;END IF;
   SELECT * INTO policy FROM app_private.reminder_policies WHERE agency_id=r.agency_id AND enabled;
   SELECT * INTO slot FROM app_private.reminder_slots WHERE agency_id=r.agency_id AND token_hash=seed.token_hash AND state='claimed' ORDER BY ordinal LIMIT 1 FOR UPDATE;
   IF slot.lease_until>clock_timestamp() THEN CONTINUE;END IF;
   IF slot.state='claimed' AND (slot.attempts>=5 OR slot.ordinal>jsonb_array_length(policy.intervals)) THEN UPDATE app_private.reminder_slots SET state='failed' WHERE agency_id=slot.agency_id AND token_hash=slot.token_hash AND ordinal=slot.ordinal;CONTINUE;END IF;
   IF slot.state='claimed' THEN
    UPDATE app_private.reminder_slots SET lease=gen_random_uuid(),lease_until=clock_timestamp()+interval '2 minutes',attempts=attempts+1,policy_revision=policy.revision WHERE agency_id=slot.agency_id AND token_hash=slot.token_hash AND ordinal=slot.ordinal RETURNING * INTO slot;
   ELSE
    SELECT COALESCE(max(ordinal),0)+1 INTO n FROM app_private.reminder_slots WHERE agency_id=r.agency_id AND token_hash=seed.token_hash;
    IF n>jsonb_array_length(policy.intervals) OR (SELECT count(*) FROM app_private.delivery_jobs WHERE agency_id=r.agency_id AND token_hash=seed.token_hash AND purpose='reminder')>=policy.max_count OR seed.not_before+make_interval(mins=>(policy.intervals->>(n-1))::integer)>clock_timestamp() THEN CONTINUE;END IF;
    INSERT INTO app_private.reminder_slots VALUES(r.agency_id,r.session_id,seed.token_hash,n,seed.id,policy.revision,'claimed',gen_random_uuid(),clock_timestamp()+interval '2 minutes',1) RETURNING * INTO slot;
   END IF;
   RETURN jsonb_build_object('agencyId',r.agency_id,'sessionId',r.session_id,'tokenHash',seed.token_hash,'ordinal',slot.ordinal,'lease',slot.lease,'seed',app_private.delivery_view(seed),'envelope',(SELECT envelope FROM app_private.delivery_payloads WHERE job_id=seed.id),'context',app_private.delivery_context(r.agency_id,r.session_id));
  END LOOP;RETURN 'null';
 ELSIF action='reminder-failed' THEN
  UPDATE app_private.reminder_slots SET lease_until=clock_timestamp() WHERE agency_id=aid AND token_hash=p->>'tokenHash' AND ordinal=(p->>'ordinal')::integer AND lease=(p->>'lease')::uuid AND state='claimed';RETURN 'true';
 ELSIF action IN('reminder-publish','queue') AND (action='reminder-publish' OR EXISTS(SELECT 1 FROM jsonb_array_elements(p->'jobs') x WHERE x->>'purpose'='reminder')) THEN
  sid:=(p->>'sessionId')::uuid;PERFORM set_config('contratpro.signing_agency',aid::text,true);
  SELECT * INTO STRICT s FROM app_private.signing_sessions WHERE agency_id=aid AND id=sid FOR UPDATE;
  SELECT * INTO policy FROM app_private.reminder_policies WHERE agency_id=aid FOR SHARE;
  IF jsonb_array_length(p->'jobs')<>1 OR policy.agency_id IS NULL OR (action='queue' AND (actor IS NULL OR NOT policy.manual_enabled)) OR (action='reminder-publish' AND NOT policy.enabled) THEN RAISE EXCEPTION 'Reminder policy unavailable' USING ERRCODE='22023';END IF;
  item:=p->'jobs'->0;
  SELECT * INTO j FROM app_private.delivery_jobs WHERE id=(item->>'id')::uuid;
  IF j.id IS NOT NULL THEN
   IF j.agency_id<>aid OR j.session_id<>sid OR j.intent_hash IS DISTINCT FROM item->>'intentHash' THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;RETURN app_private.delivery_view(j);
  END IF;
  SELECT * INTO seed FROM app_private.delivery_jobs WHERE agency_id=aid AND session_id=sid AND token_hash=item->>'tokenHash' AND purpose='invitation' AND channel=item->>'channel' LIMIT 1;
  IF seed.id IS NULL OR NOT app_private.delivery_valid(seed) OR item->>'purpose'<>'reminder' OR item->>'checksum' IS DISTINCT FROM seed.checksum OR (item->>'expiresAt')::timestamptz IS DISTINCT FROM seed.expires_at OR item->'envelope'->>'expiresAt' IS DISTINCT FROM item->>'expiresAt' OR item->>'intentHash' !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid reminder binding' USING ERRCODE='22023';END IF;
  IF EXISTS(SELECT 1 FROM app_private.delivery_jobs WHERE agency_id=aid AND token_hash=seed.token_hash AND (state='uncertain' OR state='processing' AND armed_at IS NOT NULL)) OR (SELECT count(*) FROM app_private.delivery_jobs WHERE agency_id=aid AND token_hash=seed.token_hash AND purpose='reminder')>=policy.max_count THEN RAISE EXCEPTION 'Reminder blocked' USING ERRCODE='40001';END IF;
  IF action='reminder-publish' THEN
   SELECT * INTO slot FROM app_private.reminder_slots WHERE agency_id=aid AND token_hash=seed.token_hash AND ordinal=(p->>'ordinal')::integer FOR UPDATE;
   IF slot.lease IS DISTINCT FROM (p->>'lease')::uuid OR slot.lease_until<=clock_timestamp() OR slot.state<>'claimed' OR slot.policy_revision IS DISTINCT FROM policy.revision OR item->>'eventKey' IS DISTINCT FROM 'automatic-reminder:'||seed.token_hash||':'||slot.ordinal::text THEN RAISE EXCEPTION 'Lost lease' USING ERRCODE='40001';END IF;
  ELSIF item->>'eventKey' NOT LIKE 'reminder:'||seed.token_hash||':%' THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
  IF (SELECT count(*) FROM app_private.delivery_jobs WHERE agency_id=aid AND not_before>clock_timestamp()-interval '1 hour')>=100 THEN RAISE EXCEPTION 'Queue rate exceeded' USING ERRCODE='22023';END IF;
  INSERT INTO app_private.delivery_jobs(id,agency_id,session_id,event_key,purpose,channel,token_hash,checksum,intent_hash,expires_at) VALUES((item->>'id')::uuid,aid,sid,item->>'eventKey','reminder',seed.channel,seed.token_hash,seed.checksum,item->>'intentHash',seed.expires_at) RETURNING * INTO j;
  INSERT INTO app_private.delivery_payloads VALUES(j.id,aid,item->'envelope');
  IF action='reminder-publish' THEN UPDATE app_private.reminder_slots SET state='materialized' WHERE agency_id=aid AND token_hash=seed.token_hash AND ordinal=slot.ordinal;END IF;
  PERFORM app_private.signing_event(aid,sid,'reminder-queued',jsonb_build_object('jobId',j.id,'automatic',action='reminder-publish','actor',actor));RETURN app_private.delivery_view(j);
 ELSIF action='webhook' AND p ? 'jobId' THEN
  SELECT * INTO j FROM app_private.delivery_jobs WHERE id=(p->>'jobId')::uuid;
  IF j.id IS NOT NULL THEN
   PERFORM set_config('contratpro.signing_agency',j.agency_id::text,true);
   IF j.session_id IS NOT NULL THEN PERFORM 1 FROM app_private.signing_sessions WHERE agency_id=j.agency_id AND id=j.session_id FOR UPDATE;END IF;
   SELECT * INTO j FROM app_private.delivery_jobs WHERE id=j.id FOR UPDATE;
   IF j.provider_id IS NOT NULL AND j.provider_id IS DISTINCT FROM p->>'providerId' THEN RAISE EXCEPTION 'Conflicting provider correlation' USING ERRCODE='40001';END IF;
   IF j.provider_id IS NULL AND j.armed_at IS NOT NULL AND j.channel='email' AND j.state IN('processing','uncertain') THEN UPDATE app_private.delivery_jobs SET provider_id=p->>'providerId' WHERE id=j.id;END IF;
  END IF;
 ELSIF action='manual-resolve' THEN
  PERFORM set_config('contratpro.signing_agency',aid::text,true);
  SELECT * INTO prior FROM app_private.delivery_recoveries WHERE agency_id=aid AND request_id=(p->>'requestId')::uuid;
  IF prior.request_id IS NOT NULL THEN IF prior.input IS DISTINCT FROM p OR prior.actor<>actor THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;RETURN prior.result;END IF;
  SELECT * INTO j FROM app_private.delivery_jobs WHERE agency_id=aid AND id=(p->>'jobId')::uuid;
  IF j.session_id IS NULL THEN RAISE EXCEPTION 'Missing' USING ERRCODE='P0002';END IF;
  PERFORM 1 FROM app_private.signing_sessions WHERE agency_id=aid AND id=j.session_id FOR UPDATE;
  SELECT * INTO j FROM app_private.delivery_jobs WHERE id=j.id FOR UPDATE;
  IF actor IS NULL OR j.state<>'uncertain' OR COALESCE(p->>'disposition','') NOT IN('retain-uncertain','retire-no-resend') OR COALESCE(p->>'evidenceRef','') !~ '^[A-Za-z0-9][A-Za-z0-9 ._:/-]{2,119}$' THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
  IF p->>'disposition'='retire-no-resend' THEN UPDATE app_private.delivery_jobs SET obsolete=true,retryable=false WHERE id=j.id;END IF;
  PERFORM app_private.signing_event(aid,j.session_id,'delivery-manual-reconciliation',jsonb_build_object('jobId',j.id,'actor',actor,'disposition',p->>'disposition','evidenceRef',p->>'evidenceRef','deliveryConfirmed',false));
  result:=app_private.delivery_view(j);INSERT INTO app_private.delivery_recoveries(agency_id,request_id,job_id,actor,input,result) VALUES(aid,(p->>'requestId')::uuid,j.id,actor,p,result);RETURN result;
 ELSIF action='recover-final-event' THEN
  PERFORM set_config('contratpro.signing_agency',aid::text,true);
  SELECT * INTO STRICT s FROM app_private.signing_sessions WHERE agency_id=aid AND id=(p->>'sessionId')::uuid FOR UPDATE;
  IF actor IS NULL OR s.state<>'completed' THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
  UPDATE app_private.delivery_events SET state='pending',attempts=0,error_code=NULL,lease=NULL,lease_until=NULL WHERE agency_id=aid AND session_id=s.id AND state='failed' AND expires_at>clock_timestamp();
  PERFORM app_private.signing_event(aid,s.id,'final-delivery-recovery-requested',jsonb_build_object('actor',actor));RETURN 'true';
 END IF;
 IF action='queue' AND EXISTS(SELECT 1 FROM jsonb_array_elements(p->'jobs') x WHERE x->>'purpose'='final-document' AND NOT EXISTS(SELECT 1 FROM app_private.delivery_jobs d WHERE d.id=(x->>'id')::uuid)) THEN
  PERFORM set_config('contratpro.signing_agency',aid::text,true);
  PERFORM 1 FROM app_private.signing_sessions WHERE agency_id=aid AND id=(p->>'sessionId')::uuid FOR UPDATE;
  IF EXISTS(SELECT 1 FROM app_private.delivery_jobs WHERE agency_id=aid AND session_id=(p->>'sessionId')::uuid AND purpose='final-document' AND state='uncertain' AND NOT obsolete) THEN RAISE EXCEPTION 'Resolve uncertain final delivery before creating another' USING ERRCODE='40001';END IF;
 END IF;
 result:=app_private.delivery_command_before_a3(aid,actor,action,p);
 IF action='list' THEN result:=result||jsonb_build_object('recoveries',(SELECT COALESCE(jsonb_agg(v),'[]') FROM (SELECT job_id AS "jobId",input->>'evidenceRef' AS reference,input->>'disposition' AS disposition,created_at AS at FROM app_private.delivery_recoveries WHERE agency_id=aid AND job_id IN(SELECT id FROM app_private.delivery_jobs WHERE agency_id=aid AND session_id=(p->>'sessionId')::uuid) ORDER BY created_at DESC LIMIT 100) v));END IF;
 RETURN result;
END $f$;

ALTER FUNCTION app_private.signing_command(uuid,uuid,text,text,jsonb) RENAME TO signing_command_before_a3;

CREATE FUNCTION app_private.signing_command(aid uuid,actor uuid,token text,action text,p jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE s app_private.signing_sessions;op app_private.signing_provider_operations;obj app_private.signing_objects;receipt app_private.signing_receipts;proof jsonb;stage_kind text;result jsonb;requested_action text:=action;BEGIN
 IF action NOT IN('revoke-invitation','external-stage','external-complete','provider-read','evidence') THEN RETURN app_private.signing_command_before_a3(aid,actor,token,action,p);END IF;
 IF actor IS NULL OR token IS NOT NULL OR jsonb_typeof(p) IS DISTINCT FROM 'object' OR pg_column_size(p)>100000 OR current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
 PERFORM set_config('contratpro.signing_agency',aid::text,true);
 PERFORM pg_advisory_xact_lock(hashtextextended('documents:'||aid::text,0));
 SELECT * INTO STRICT s FROM app_private.signing_sessions WHERE agency_id=aid AND id=(p->>'sessionId')::uuid FOR UPDATE;
 IF action='evidence' THEN
  IF s.assurance='simple' THEN RETURN app_private.signing_command_before_a3(aid,actor,token,action,p);END IF;
  RETURN jsonb_build_object('ok',true,'value',jsonb_build_object('session',app_private.signing_view(s),'signatureArtifacts','{}'::jsonb,
   'providerProofs',(SELECT COALESCE(jsonb_agg(intent ORDER BY kind),'[]') FROM app_private.signing_objects WHERE agency_id=aid AND session_id=s.id AND retained),
   'events',(SELECT COALESCE(jsonb_agg(jsonb_build_object('sequence',sequence,'previousHash',previous_hash,'hash',hash,'event',event) ORDER BY sequence),'[]') FROM app_private.signing_events WHERE agency_id=aid AND session_id=s.id),
   'limitations','Provider proof summaries and hashes only. Raw certificate/evidence retention requires the approved provider profile.'));
 END IF;
 IF actor<>s.agency_member_id THEN RAISE EXCEPTION 'Wrong signer' USING ERRCODE='42501';END IF;
 IF action='provider-read' THEN
  SELECT * INTO STRICT op FROM app_private.signing_provider_operations WHERE agency_id=aid AND session_id=s.id AND id=(p->>'operationId')::uuid;
  RETURN jsonb_build_object('ok',true,'value',jsonb_build_object('id',op.id,'transactionId',op.transaction_id,'providerId',op.provider_id,'version',s.version,'operation',op.operation));
 END IF;
 SELECT * INTO receipt FROM app_private.signing_receipts WHERE agency_id=aid AND session_id=s.id AND request_id=(p->>'requestId')::uuid AND signing_receipts.action=requested_action;
 IF receipt.request_id IS NOT NULL THEN IF receipt.input IS DISTINCT FROM p OR receipt.actor<>actor::text THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;RETURN receipt.result;END IF;
 IF s.version IS DISTINCT FROM (p->>'version')::integer OR s.state IN('completed','expired','declined','cancelled','failed') OR s.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
 IF action='revoke-invitation' THEN
  IF s.state<>'awaiting_client' THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
  UPDATE app_private.signing_invitations SET revoked=true,verified_until=NULL WHERE agency_id=aid AND session_id=s.id AND NOT revoked;
  PERFORM app_private.signing_transition(aid,s.id,'awaiting_client',jsonb_build_object('actor',actor,'reason','invitation-revoked'));
 ELSE
  proof:=p->'proof';
  SELECT * INTO op FROM app_private.signing_provider_operations WHERE agency_id=aid AND session_id=s.id AND id=(p->>'operationId')::uuid FOR UPDATE;
  IF s.assurance='simple' OR op.id IS NULL OR op.provider_id IS DISTINCT FROM s.provider_id OR op.state NOT IN('accepted','unknown') OR proof->>'providerId' IS DISTINCT FROM s.provider_id OR proof->>'originalChecksum' IS DISTINCT FROM s.original->>'checksum' OR proof->>'assurance' IS DISTINCT FROM s.assurance OR proof->>'party' IS DISTINCT FROM op.operation->>'party' OR
   (op.transaction_id IS NOT NULL AND op.transaction_id IS DISTINCT FROM proof->>'transactionId') OR COALESCE(proof->>'transactionId','')='' OR proof->>'signedChecksum' IS DISTINCT FROM p->>'checksum' OR proof->>'previousChecksum' IS DISTINCT FROM s.intermediate->>'checksum' OR
   proof->'valid' IS DISTINCT FROM 'true'::jsonb OR proof->'identityVerified' IS DISTINCT FROM 'true'::jsonb OR proof->'consentVerified' IS DISTINCT FROM 'true'::jsonb OR proof->'sequenceVerified' IS DISTINCT FROM 'true'::jsonb OR proof->'trustVerified' IS DISTINCT FROM 'true'::jsonb OR COALESCE(proof->>'evidenceChecksum','') !~ '^[a-f0-9]{64}$' OR COALESCE(proof->>'profileVersion','') !~ '^[A-Za-z0-9._-]{1,80}$' THEN RAISE EXCEPTION 'Unverified provider result' USING ERRCODE='22023';END IF;
  IF (proof->>'party'='agency' AND s.agency_signature IS NOT NULL) OR (proof->>'party'='client' AND s.agency_signature IS NULL) THEN RAISE EXCEPTION 'Agency first' USING ERRCODE='40001';END IF;
  stage_kind:=CASE WHEN proof->>'party'='agency' THEN 'agency' ELSE 'final' END;
  IF p->>'checksum' !~ '^[a-f0-9]{64}$' OR p->>'key' IS DISTINCT FROM aid::text||'/issued/'||s.id::text||'/'||(p->>'checksum')||'.pdf' THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
  IF action='external-stage' THEN
   UPDATE app_private.signing_provider_operations SET transaction_id=proof->>'transactionId',state='accepted' WHERE id=op.id AND transaction_id IS NULL;
   INSERT INTO app_private.signing_objects VALUES(aid,s.id,stage_kind,p->>'key',p->>'checksum',proof,false) ON CONFLICT DO NOTHING;
   SELECT * INTO obj FROM app_private.signing_objects WHERE agency_id=aid AND session_id=s.id AND signing_objects.kind=stage_kind;
   IF obj.intent IS DISTINCT FROM proof OR obj.checksum IS DISTINCT FROM p->>'checksum' THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
  ELSE
   SELECT * INTO obj FROM app_private.signing_objects WHERE agency_id=aid AND session_id=s.id AND signing_objects.kind=stage_kind;
   IF obj.key IS DISTINCT FROM p->>'key' OR obj.intent IS DISTINCT FROM proof THEN RAISE EXCEPTION 'Unstaged result' USING ERRCODE='40001';END IF;
   result:=proof||jsonb_build_object('method','provider','operationId',op.id,'artifactChecksum',proof->>'evidenceChecksum','at',clock_timestamp());
   IF stage_kind='agency' THEN UPDATE app_private.signing_sessions SET agency_signature=result,intermediate=jsonb_build_object('key',obj.key,'checksum',obj.checksum) WHERE agency_id=aid AND id=s.id;
    PERFORM app_private.signing_transition(aid,s.id,'agency_signed',jsonb_build_object('providerProof',proof,'operationId',op.id));
   ELSE UPDATE app_private.signing_sessions SET client_signature=result,final=jsonb_build_object('key',obj.key,'checksum',obj.checksum) WHERE agency_id=aid AND id=s.id;
    PERFORM app_private.signing_transition(aid,s.id,'completed',jsonb_build_object('providerProof',proof,'operationId',op.id));END IF;
   UPDATE app_private.signing_objects SET retained=true WHERE agency_id=aid AND session_id=s.id AND signing_objects.kind=stage_kind;
  END IF;
 END IF;
 SELECT * INTO s FROM app_private.signing_sessions WHERE agency_id=aid AND id=s.id;
 result:=jsonb_build_object('ok',true,'value',app_private.signing_view(s));
 INSERT INTO app_private.signing_receipts VALUES(aid,s.id,(p->>'requestId')::uuid,action,actor::text,p,result);RETURN result;
END $f$;

REVOKE ALL ON FUNCTION app_private.signing_command(uuid,uuid,text,text,jsonb),app_private.signing_command_before_a3(uuid,uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;

GRANT EXECUTE ON FUNCTION app_private.signing_command(uuid,uuid,text,text,jsonb),app_private.signing_command_before_a3(uuid,uuid,text,text,jsonb) TO contratpro_rental_writer;

CREATE OR REPLACE FUNCTION public.contratpro_delivery_agency(p_payload text,p_mac text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE p jsonb;aid uuid;actor uuid;BEGIN
 IF octet_length(p_payload)>250000 OR p_mac IS DISTINCT FROM app_private.delivery_mac(p_payload) THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
 p:=p_payload::jsonb;aid:=(p->>'agencyId')::uuid;actor:=app_private.delivery_allowed(aid);
 IF COALESCE(p->>'action','') NOT IN('context','list','dashboard','prepare-final','queue','material','manual','retry','cancel','revoke','purge','reminder-policy','reminder-policy-save','reminder-history','manual-resolve','recover-final-event','reconciliation-context') THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
 PERFORM set_config('contratpro.signing_agency',aid::text,true);RETURN app_private.delivery_command(aid,actor,p->>'action',p->'input');END $f$;

CREATE OR REPLACE FUNCTION public.contratpro_delivery_worker(p_payload text,p_mac text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE p jsonb;BEGIN
 IF octet_length(p_payload)>250000 OR p_mac IS DISTINCT FROM app_private.delivery_mac(p_payload) THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
 p:=p_payload::jsonb;IF COALESCE(p->>'action','') NOT IN('claim-event','claim','arm','result','reconcile-context','reconciled','webhook','prepare-final','queue','context','materialize-done','materialize-failed','download','purge','purge-expired','reminder-claim','reminder-publish','reminder-failed') THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
 RETURN app_private.delivery_command((p->>'agencyId')::uuid,NULL,p->>'action',p->'input');END $f$;

DO $acl$ DECLARE signature text;BEGIN
 FOREACH signature IN ARRAY ARRAY['app_private.delivery_valid(app_private.delivery_jobs)','app_private.delivery_valid_before_a3(app_private.delivery_jobs)','app_private.delivery_command(uuid,uuid,text,jsonb)','app_private.delivery_command_before_a3(uuid,uuid,text,jsonb)'] LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO contratpro_rental_writer,contratpro_delivery_worker',signature);
 END LOOP;
END $acl$;
-- Postconditions are in the same transaction as source changes and history.

DO $d2_restore$
DECLARE r record; observed jsonb; BEGIN
 FOR r IN SELECT * FROM pg_temp.d2_authority ORDER BY role_name LOOP
  IF NOT r.create_public THEN EXECUTE format('REVOKE CREATE ON SCHEMA public FROM %I',r.role_name);END IF;
  IF NOT r.create_private THEN EXECUTE format('REVOKE CREATE ON SCHEMA app_private FROM %I',r.role_name);END IF;
  IF r.own_edge IS NULL THEN EXECUTE format('REVOKE %I FROM postgres GRANTED BY postgres RESTRICT',r.role_name);
  ELSE EXECUTE format('GRANT %I TO postgres WITH INHERIT %s, SET %s GRANTED BY postgres',r.role_name,r.own_edge->>'inherit',r.own_edge->>'set');END IF;
  SELECT jsonb_build_object('admin',admin_option,'inherit',inherit_option,'set',set_option) INTO observed FROM pg_catalog.pg_auth_members
   WHERE roleid=r.role_name::regrole AND member='postgres'::regrole AND grantor='postgres'::regrole;
  IF observed IS DISTINCT FROM r.own_edge OR pg_catalog.has_schema_privilege(r.role_name,'public','CREATE') IS DISTINCT FROM r.create_public
   OR pg_catalog.has_schema_privilege(r.role_name,'app_private','CREATE') IS DISTINCT FROM r.create_private THEN RAISE EXCEPTION 'D2 authority restoration mismatch';END IF;
 END LOOP;
END $d2_restore$;
DROP FUNCTION pg_temp.d2_authorize(name);


DO $d2_preservation_post$
DECLARE rel text; missing boolean; BEGIN
 FOR rel IN SELECT DISTINCT relation_name FROM pg_temp.d2_preservation LOOP
  EXECUTE format('SELECT EXISTS(SELECT 1 FROM pg_temp.d2_preservation p WHERE p.relation_name=%L AND NOT EXISTS(SELECT 1 FROM %s t WHERE to_jsonb(t) @> p.payload))',rel,rel::regclass) INTO missing;
  IF missing THEN RAISE EXCEPTION 'D2 existing baseline row changed or missing';END IF;
 END LOOP;
END $d2_preservation_post$;

DO $d2_objects_post$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.reminder_policies'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.reminder_slots'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.delivery_recoveries'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;

 IF EXISTS(SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace,
 LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
 WHERE (n.nspname||'.'||p.proname)=ANY(ARRAY['app_private.delivery_valid_before_a3','app_private.delivery_valid','app_private.delivery_command_before_a3','app_private.delivery_command','app_private.signing_command_before_a3','app_private.signing_command','public.contratpro_delivery_agency','public.contratpro_delivery_worker']::text[]) AND p.prosecdef AND a.grantee=0 AND a.privilege_type='EXECUTE') THEN RAISE EXCEPTION 'D2 definer PUBLIC execute leak';END IF;
END $d2_objects_post$;

DO $d2_security_post$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=ANY(ARRAY['contratpro_rental_writer','contratpro_delivery_worker']::text[])
 AND (rolcanlogin OR rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication OR rolinherit)) THEN RAISE EXCEPTION 'D2 writer role widened';END IF;
END $d2_security_post$;
INSERT INTO supabase_migrations.schema_migrations(version) VALUES('20261125002300');
DO $d2_post$ BEGIN
 IF ARRAY(SELECT version FROM supabase_migrations.schema_migrations ORDER BY version) IS DISTINCT FROM ARRAY['20261115000000','20261115000100','20261115000200','20261115000300','20261115000400','20261115000500','20261115000600','20261116000700','20261118000800','20261118000900','20261118001000','20261119001100','20261119001200','20261120001300','20261122001400','20261122001500','20261124001600','20261124001700','20261124001800','20261124001900','20261124002000','20261125002100','20261125002200','20261125002300']::text[]
 THEN RAISE EXCEPTION 'D2 final history mismatch';END IF;
END $d2_post$;
COMMIT;
