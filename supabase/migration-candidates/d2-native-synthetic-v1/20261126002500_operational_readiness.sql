-- D2 NATIVE SYNTHETIC TEST CANDIDATE ONLY. NOT A MANAGED DEPLOYMENT ARTIFACT.
-- Source: supabase/migration-drafts/20261126002500_operational_readiness.sql; raw SHA256 3c8d300640b6fe77c8b01120d05f1d999a50fbc1ffcab9746a2a92cd3423f1ca
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
 IF ARRAY(SELECT version FROM supabase_migrations.schema_migrations ORDER BY version) IS DISTINCT FROM ARRAY['20261115000000','20261115000100','20261115000200','20261115000300','20261115000400','20261115000500','20261115000600','20261116000700','20261118000800','20261118000900','20261118001000','20261119001100','20261119001200','20261120001300','20261122001400','20261122001500','20261124001600','20261124001700','20261124001800','20261124001900','20261124002000','20261125002100','20261125002200','20261125002300','20261126002400']::text[]
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
 IF wanted::text<>ALL(ARRAY['contratpro_rental_writer','contratpro_billing_writer','contratpro_maintenance']::text[]) THEN RAISE EXCEPTION 'D2 role outside manifest';END IF;
 IF EXISTS(SELECT 1 FROM pg_temp.d2_authority WHERE role_name=wanted) THEN RETURN;END IF;
 SELECT oid INTO STRICT role_oid FROM pg_catalog.pg_roles WHERE rolname=wanted
 AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolreplication AND NOT rolinherit;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_auth_members WHERE roleid=role_oid AND member='postgres'::regrole AND admin_option) THEN RAISE EXCEPTION 'D2 lacks existing ADMIN authority';END IF;
 SELECT jsonb_build_object('admin',admin_option,'inherit',inherit_option,'set',set_option) INTO edge FROM pg_catalog.pg_auth_members
 WHERE roleid=role_oid AND member='postgres'::regrole AND grantor='postgres'::regrole;
 INSERT INTO pg_temp.d2_authority VALUES(wanted,edge,
 pg_catalog.has_schema_privilege(role_oid,'public','CREATE'),pg_catalog.has_schema_privilege(role_oid,'app_private','CREATE'));
 EXECUTE format('GRANT %I TO postgres WITH ADMIN TRUE, INHERIT TRUE, SET TRUE GRANTED BY postgres',wanted);
 IF NOT pg_catalog.has_schema_privilege(role_oid,'public','CREATE') THEN EXECUTE format('GRANT CREATE ON SCHEMA public TO %I',wanted);END IF;
 IF NOT pg_catalog.has_schema_privilege(role_oid,'app_private','CREATE') THEN EXECUTE format('GRANT CREATE ON SCHEMA app_private TO %I',wanted);END IF;
END $d2$;
REVOKE ALL ON FUNCTION pg_temp.d2_authorize(name) FROM PUBLIC;

SELECT pg_temp.d2_authorize('contratpro_rental_writer'::name);
SELECT pg_temp.d2_authorize('contratpro_billing_writer'::name);
-- Retained source statements; parser-classified design stop/outer BEGIN/ROLLBACK excluded.
SET LOCAL search_path=pg_catalog,pg_temp;

SET LOCAL row_security=on;

CREATE ROLE contratpro_maintenance NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT NOCREATEROLE NOCREATEDB NOREPLICATION;

SELECT pg_temp.d2_authorize('contratpro_maintenance'::name);

GRANT USAGE ON SCHEMA app_private,public,storage,tenancy TO contratpro_maintenance;

GRANT SELECT ON tenancy.rental_contracts TO contratpro_maintenance;

CREATE POLICY maintenance_rental_read ON tenancy.rental_contracts FOR SELECT TO contratpro_maintenance USING(true);

ALTER FUNCTION app_private.signing_supersede() SECURITY DEFINER;

ALTER FUNCTION app_private.signing_supersede() OWNER TO contratpro_rental_writer;

CREATE TABLE app_private.maintenance_key(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),secret text NOT NULL CHECK(secret~'^[a-f0-9]{64}$'));

CREATE TABLE app_private.maintenance_schedules(
 task text PRIMARY KEY CHECK(task IN('delivery','sheets','reconcile','inventory','lifecycle','health','rotation','cleanup','generation','finalization')),
 enabled boolean NOT NULL DEFAULT false,interval_seconds integer NOT NULL DEFAULT 300 CHECK(interval_seconds BETWEEN 30 AND 86400),
 due_at timestamptz NOT NULL DEFAULT clock_timestamp(),lease uuid,lease_until timestamptz,attempts integer NOT NULL DEFAULT 0,
 last_started timestamptz,last_finished timestamptz,last_outcome text CHECK(last_outcome IN('ok','disabled','failed')),CHECK(attempts BETWEEN 0 AND 8));

INSERT INTO app_private.maintenance_schedules(task) SELECT unnest(ARRAY['delivery','sheets','reconcile','inventory','lifecycle','health','rotation','cleanup','generation','finalization']);

CREATE TABLE app_private.maintenance_generation(agency_id uuid NOT NULL,request_id uuid NOT NULL,lease uuid,lease_until timestamptz,attempts integer NOT NULL DEFAULT 0,not_before timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(agency_id,request_id),FOREIGN KEY(agency_id,request_id) REFERENCES app_private.contract_generation_jobs(agency_id,request_id));

CREATE TABLE app_private.maintenance_finalization(agency_id uuid NOT NULL,session_id uuid NOT NULL,lease uuid,lease_until timestamptz,attempts integer NOT NULL DEFAULT 0,not_before timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(agency_id,session_id),FOREIGN KEY(agency_id,session_id) REFERENCES app_private.signing_sessions(agency_id,id));

CREATE TABLE app_private.maintenance_audit(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),at timestamptz NOT NULL DEFAULT clock_timestamp(),actor uuid,action text NOT NULL,detail jsonb NOT NULL CHECK(pg_column_size(detail)<4096));

CREATE TABLE app_private.maintenance_inventory(
 agency_id uuid NOT NULL,key text NOT NULL,classification text NOT NULL CHECK(classification IN('retained','pending','expired-preview','manual-review','missing')),
 observed_at timestamptz NOT NULL DEFAULT clock_timestamp(),quarantined_at timestamptz,state text NOT NULL DEFAULT 'observed' CHECK(state IN('observed','deleting','deleted')),
 lease uuid,lease_until timestamptz,attempts integer NOT NULL DEFAULT 0,deleted_at timestamptz,PRIMARY KEY(agency_id,key),CHECK(key LIKE agency_id::text||'/%'));

CREATE TABLE app_private.maintenance_policies(agency_id uuid PRIMARY KEY,retention_seconds integer NOT NULL CHECK(retention_seconds BETWEEN 86400 AND 315360000),quarantine_seconds integer NOT NULL CHECK(quarantine_seconds BETWEEN 86400 AND 315360000),delete_enabled boolean NOT NULL DEFAULT false,cursor text NOT NULL DEFAULT '',scanned_at timestamptz NOT NULL DEFAULT '-infinity');

CREATE TABLE app_private.maintenance_rotations(consumer text PRIMARY KEY CHECK(consumer IN('delivery','sheets')),target_key text NOT NULL CHECK(target_key~'^[A-Za-z0-9_-]{1,40}$'),enabled boolean NOT NULL DEFAULT false,changed bigint NOT NULL DEFAULT 0,last_changed timestamptz);

CREATE TABLE app_private.maintenance_backups(id uuid PRIMARY KEY,completed_at timestamptz NOT NULL,manifest_sha256 text NOT NULL CHECK(manifest_sha256~'^[a-f0-9]{64}$'),validated boolean NOT NULL DEFAULT false);

CREATE TABLE app_private.maintenance_incidents(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),task text NOT NULL REFERENCES app_private.maintenance_schedules(task),opened_at timestamptz NOT NULL DEFAULT clock_timestamp(),acknowledged_at timestamptz,actor uuid);

CREATE UNIQUE INDEX maintenance_open_incident ON app_private.maintenance_incidents(task) WHERE acknowledged_at IS NULL;

CREATE TABLE app_private.maintenance_reconciliation(kind text NOT NULL CHECK(kind IN('delivery','sheets')),id uuid NOT NULL,checked_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(kind,id));

CREATE TABLE app_private.maintenance_heartbeat(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),last_seen timestamptz);

INSERT INTO app_private.maintenance_heartbeat(singleton) VALUES(true);

DO $tables$ DECLARE t text;BEGIN
 FOREACH t IN ARRAY ARRAY['maintenance_key','maintenance_schedules','maintenance_audit','maintenance_inventory','maintenance_policies','maintenance_rotations','maintenance_backups','maintenance_generation','maintenance_finalization','maintenance_incidents','maintenance_reconciliation','maintenance_heartbeat'] LOOP
  EXECUTE format('ALTER TABLE app_private.%I ENABLE ROW LEVEL SECURITY',t);EXECUTE format('ALTER TABLE app_private.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON app_private.%I FROM PUBLIC,anon,authenticated,service_role',t);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE ON app_private.%I TO contratpro_maintenance',t);
  EXECUTE format('CREATE POLICY maintenance_internal ON app_private.%I TO contratpro_maintenance USING(true) WITH CHECK(true)',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['contract_objects','contract_artifacts','contract_template_versions','contract_previews','contract_confirmed_inputs','contract_generation_jobs','agency_logo_objects','signing_objects','signing_sessions','signing_invitations','delivery_jobs','delivery_events','delivery_payloads','sheets_jobs','sheets_connections','sheets_oauth','billing_provider_operations','billing_payments','billing_subscriptions'] LOOP
  EXECUTE format('GRANT SELECT ON app_private.%I TO contratpro_maintenance',t);
  EXECUTE format('CREATE POLICY maintenance_read ON app_private.%I FOR SELECT TO contratpro_maintenance USING(true)',t);
 END LOOP;
END $tables$;

REVOKE INSERT,UPDATE ON app_private.maintenance_key FROM contratpro_maintenance;

REVOKE UPDATE ON app_private.maintenance_audit FROM contratpro_maintenance;

CREATE TRIGGER maintenance_audit_immutable BEFORE UPDATE OR DELETE ON app_private.maintenance_audit FOR EACH ROW EXECUTE FUNCTION app_private.rental_receipt_immutable();

GRANT SELECT ON storage.objects TO contratpro_maintenance;

CREATE POLICY maintenance_storage_read ON storage.objects FOR SELECT TO contratpro_maintenance USING(bucket_id='contract-documents');

GRANT UPDATE(envelope) ON app_private.delivery_payloads,app_private.sheets_connections,app_private.sheets_oauth TO contratpro_maintenance;

CREATE POLICY maintenance_rotate ON app_private.delivery_payloads FOR UPDATE TO contratpro_maintenance USING(true) WITH CHECK(true);

CREATE POLICY maintenance_rotate ON app_private.sheets_connections FOR UPDATE TO contratpro_maintenance USING(true) WITH CHECK(true);

CREATE POLICY maintenance_rotate ON app_private.sheets_oauth FOR UPDATE TO contratpro_maintenance USING(true) WITH CHECK(true);

GRANT SELECT ON app_private.document_renderer_key TO contratpro_maintenance;

CREATE POLICY maintenance_renderer_read ON app_private.document_renderer_key FOR SELECT TO contratpro_maintenance USING(true);

GRANT EXECUTE ON FUNCTION app_private.document_renderer_mac(text) TO contratpro_maintenance;

GRANT INSERT ON app_private.contract_objects,app_private.contract_artifacts TO contratpro_maintenance;

GRANT UPDATE(state) ON app_private.contract_objects TO contratpro_maintenance;

CREATE POLICY maintenance_output ON app_private.contract_objects TO contratpro_maintenance USING(true) WITH CHECK(true);

CREATE POLICY maintenance_output ON app_private.contract_artifacts FOR INSERT TO contratpro_maintenance WITH CHECK(true);

CREATE FUNCTION app_private.maintenance_classify(aid uuid,k text) RETURNS text LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
BEGIN
 IF k NOT LIKE aid::text||'/%' THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
 IF k LIKE aid::text||'/issued/%' OR EXISTS(SELECT 1 FROM app_private.signing_objects WHERE agency_id=aid AND key=k)
 OR EXISTS(SELECT 1 FROM app_private.agency_logo_objects WHERE agency_id=aid AND key=k)
 OR EXISTS(SELECT 1 FROM app_private.contract_template_versions WHERE agency_id=aid AND payload::text LIKE '%'||k||'%')
 OR EXISTS(SELECT 1 FROM app_private.contract_artifacts WHERE agency_id=aid AND payload::text LIKE '%'||k||'%') THEN RETURN 'retained';END IF;
 IF EXISTS(SELECT 1 FROM app_private.contract_previews p WHERE p.agency_id=aid AND p.request_id::text=split_part(k,'/',3)
  AND k LIKE aid::text||'/drafts/%' AND p.expires_at<clock_timestamp() AND COALESCE(p.lease_until,'-infinity')<clock_timestamp()
  AND NOT EXISTS(SELECT 1 FROM app_private.contract_confirmed_inputs c WHERE c.agency_id=aid AND c.rental_id=p.rental_id)) THEN RETURN 'expired-preview';END IF;
 IF EXISTS(SELECT 1 FROM app_private.contract_objects WHERE agency_id=aid AND key=k) THEN RETURN 'pending';END IF;
 RETURN 'manual-review';
END $f$;

CREATE FUNCTION app_private.maintenance_reference_fence() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
BEGIN
 IF EXISTS(SELECT 1 FROM app_private.maintenance_inventory i WHERE i.agency_id=NEW.agency_id AND i.state IN('deleting','deleted') AND to_jsonb(NEW)::text LIKE '%'||i.key||'%') THEN RAISE EXCEPTION 'Object quarantined' USING ERRCODE='40001';END IF;
 RETURN NEW;
END $f$;

ALTER FUNCTION app_private.maintenance_reference_fence() OWNER TO contratpro_maintenance;

REVOKE ALL ON FUNCTION app_private.maintenance_reference_fence() FROM PUBLIC,anon,authenticated,service_role;

CREATE TRIGGER maintenance_preview_fence BEFORE INSERT OR UPDATE ON app_private.contract_previews FOR EACH ROW EXECUTE FUNCTION app_private.maintenance_reference_fence();

CREATE TRIGGER maintenance_artifact_fence BEFORE INSERT ON app_private.contract_artifacts FOR EACH ROW EXECUTE FUNCTION app_private.maintenance_reference_fence();

CREATE TRIGGER maintenance_template_fence BEFORE INSERT ON app_private.contract_template_versions FOR EACH ROW EXECUTE FUNCTION app_private.maintenance_reference_fence();

CREATE TRIGGER maintenance_logo_fence BEFORE INSERT OR UPDATE ON app_private.agency_logo_objects FOR EACH ROW EXECUTE FUNCTION app_private.maintenance_reference_fence();

CREATE TRIGGER maintenance_object_fence BEFORE INSERT OR UPDATE ON app_private.contract_objects FOR EACH ROW EXECUTE FUNCTION app_private.maintenance_reference_fence();

CREATE FUNCTION app_private.maintenance_confirm_fence() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('documents:'||NEW.agency_id::text,0));
 IF EXISTS(SELECT 1 FROM app_private.maintenance_inventory i JOIN app_private.contract_previews p ON p.agency_id=i.agency_id AND p.request_id::text=split_part(i.key,'/',3) WHERE i.agency_id=NEW.agency_id AND p.rental_id=NEW.rental_id AND i.state='deleting') THEN RAISE EXCEPTION 'Cleanup in progress' USING ERRCODE='40001';END IF;
 RETURN NEW;
END $f$;

ALTER FUNCTION app_private.maintenance_confirm_fence() OWNER TO contratpro_maintenance;

REVOKE ALL ON FUNCTION app_private.maintenance_confirm_fence() FROM PUBLIC,anon,authenticated,service_role;

CREATE TRIGGER maintenance_confirm_fence BEFORE INSERT ON app_private.contract_confirmed_inputs FOR EACH ROW EXECUTE FUNCTION app_private.maintenance_confirm_fence();

CREATE FUNCTION public.contratpro_maintenance_storage_write(k text) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
 SELECT NOT EXISTS(SELECT 1 FROM app_private.maintenance_inventory WHERE key=k AND state IN('deleting','deleted'))
$f$;

ALTER FUNCTION public.contratpro_maintenance_storage_write(text) OWNER TO contratpro_maintenance;

REVOKE ALL ON FUNCTION public.contratpro_maintenance_storage_write(text) FROM PUBLIC,anon,authenticated,service_role;

GRANT EXECUTE ON FUNCTION public.contratpro_maintenance_storage_write(text) TO authenticated;

CREATE POLICY maintenance_no_resurrection ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(bucket_id<>'contract-documents' OR public.contratpro_maintenance_storage_write(name));

CREATE FUNCTION app_private.maintenance_command(action text,p jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE s app_private.maintenance_schedules;i app_private.maintenance_inventory;pol app_private.maintenance_policies;r record;result jsonb;env jsonb;k text;aid uuid;n integer;BEGIN
 IF action='claim' THEN
  UPDATE app_private.maintenance_heartbeat SET last_seen=clock_timestamp() WHERE singleton;
  SELECT * INTO s FROM app_private.maintenance_schedules WHERE enabled AND due_at<=clock_timestamp() AND COALESCE(lease_until,'-infinity')<clock_timestamp() AND attempts<8 ORDER BY due_at,task FOR UPDATE SKIP LOCKED LIMIT 1;
  IF s.task IS NULL THEN RETURN 'null';END IF;
  UPDATE app_private.maintenance_schedules SET lease=gen_random_uuid(),lease_until=clock_timestamp()+interval '180 seconds',last_started=clock_timestamp(),attempts=attempts+1 WHERE task=s.task RETURNING * INTO s;
  RETURN jsonb_build_object('task',s.task,'lease',s.lease);
 ELSIF action='finish' THEN
  IF p->>'outcome' NOT IN('ok','disabled','failed') THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
  UPDATE app_private.maintenance_schedules SET last_finished=clock_timestamp(),last_outcome=p->>'outcome',lease=NULL,lease_until=NULL,
   due_at=clock_timestamp()+make_interval(secs=>CASE WHEN p->>'outcome'='failed' THEN least(86400,interval_seconds*power(2,attempts)::integer) ELSE interval_seconds END),attempts=CASE WHEN p->>'outcome'='failed' THEN attempts ELSE 0 END
   WHERE task=p->>'task' AND lease=(p->>'lease')::uuid AND lease_until>clock_timestamp();
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n=1 AND p->>'outcome'='failed' THEN INSERT INTO app_private.maintenance_incidents(task) VALUES(p->>'task') ON CONFLICT DO NOTHING;END IF;
  RETURN to_jsonb(n=1);
 ELSIF action='overview' THEN
  RETURN jsonb_build_object('workerLastSeen',(SELECT last_seen FROM app_private.maintenance_heartbeat),'schedules',(SELECT jsonb_agg(to_jsonb(x)-'lease') FROM app_private.maintenance_schedules x),
   'delivery',(SELECT jsonb_build_object('pending',count(*) FILTER(WHERE state IN('queued','processing')),'failed',count(*) FILTER(WHERE state IN('failed','bounced')),'uncertain',count(*) FILTER(WHERE state='uncertain'),'expiredLeases',count(*) FILTER(WHERE lease_until<clock_timestamp()),'oldestDue',min(not_before) FILTER(WHERE state='queued')) FROM app_private.delivery_jobs),
   'sheets',(SELECT jsonb_build_object('pending',count(*) FILTER(WHERE state IN('pending','processing')),'failed',count(*) FILTER(WHERE state='failed'),'uncertain',count(*) FILTER(WHERE state='reconciliation-required'),'expiredLeases',count(*) FILTER(WHERE lease_until<clock_timestamp()),'oldestDue',min(not_before) FILTER(WHERE state='pending')) FROM app_private.sheets_jobs),
   'generation',(SELECT count(*) FROM app_private.contract_generation_jobs j WHERE NOT EXISTS(SELECT 1 FROM app_private.contract_artifacts a WHERE a.agency_id=j.agency_id AND a.request_id=j.request_id)),
   'generationExhausted',(SELECT count(*) FROM app_private.maintenance_generation j WHERE attempts>=5 AND lease_until<clock_timestamp() AND NOT EXISTS(SELECT 1 FROM app_private.contract_artifacts a WHERE a.agency_id=j.agency_id AND a.request_id=j.request_id)),
   'finalizationExhausted',(SELECT count(*) FROM app_private.maintenance_finalization j JOIN app_private.signing_sessions ss ON ss.agency_id=j.agency_id AND ss.id=j.session_id WHERE j.attempts>=5 AND j.lease_until<clock_timestamp() AND ss.state<>'completed'),
   'storage',(SELECT COALESCE(jsonb_object_agg(x.classification,x.n),'{}') FROM (SELECT classification,count(*) n FROM app_private.maintenance_inventory GROUP BY classification) x),
   'rotations',(SELECT COALESCE(jsonb_agg(x),'[]') FROM app_private.maintenance_rotations x),
   'keyReferences',jsonb_build_object('delivery',(SELECT COALESCE(jsonb_object_agg(x.k,x.n),'{}') FROM (SELECT envelope->>'keyId' k,count(*) n FROM app_private.delivery_payloads WHERE envelope ? 'keyId' GROUP BY 1) x),'sheets',(SELECT COALESCE(jsonb_object_agg(x.k,x.n),'{}') FROM (SELECT envelope->>'keyId' k,count(*) n FROM (SELECT envelope FROM app_private.sheets_connections UNION ALL SELECT envelope FROM app_private.sheets_oauth) e WHERE envelope ? 'keyId' GROUP BY 1) x)),
   'billingUncertain',(SELECT count(*) FROM app_private.billing_provider_operations WHERE state IN('prepared','uncertain')),
   'incidents',(SELECT COALESCE(jsonb_agg(x),'[]') FROM (SELECT id,task,opened_at FROM app_private.maintenance_incidents WHERE acknowledged_at IS NULL ORDER BY opened_at LIMIT 50) x),
   'backup',(SELECT to_jsonb(x) FROM app_private.maintenance_backups x ORDER BY completed_at DESC LIMIT 1));
 ELSIF action='reconcile-next' THEN
  SELECT j.id INTO r FROM app_private.delivery_jobs j LEFT JOIN app_private.maintenance_reconciliation m ON m.kind='delivery' AND m.id=j.id WHERE j.state IN('uncertain','accepted') AND j.provider_id IS NOT NULL ORDER BY COALESCE(m.checked_at,'-infinity'),j.not_before LIMIT 1;
  result:=jsonb_build_object('delivery',r.id);
  IF r.id IS NOT NULL THEN INSERT INTO app_private.maintenance_reconciliation(kind,id) VALUES('delivery',r.id) ON CONFLICT(kind,id) DO UPDATE SET checked_at=clock_timestamp();END IF;
  SELECT j.agency_id,j.contract_id INTO r FROM app_private.sheets_jobs j LEFT JOIN app_private.maintenance_reconciliation m ON m.kind='sheets' AND m.id=j.contract_id WHERE j.state='reconciliation-required' ORDER BY COALESCE(m.checked_at,'-infinity'),j.not_before LIMIT 1;
  IF r.contract_id IS NOT NULL THEN INSERT INTO app_private.maintenance_reconciliation(kind,id) VALUES('sheets',r.contract_id) ON CONFLICT(kind,id) DO UPDATE SET checked_at=clock_timestamp();END IF;
  RETURN result||jsonb_build_object('sheets',CASE WHEN r.contract_id IS NOT NULL THEN jsonb_build_object('agencyId',r.agency_id,'contractId',r.contract_id) END);
 ELSIF action='inventory' THEN
  SELECT * INTO pol FROM app_private.maintenance_policies ORDER BY scanned_at,agency_id FOR UPDATE SKIP LOCKED LIMIT 1;
  IF pol.agency_id IS NULL THEN RETURN 'false';END IF;aid:=pol.agency_id;n:=0;
  PERFORM pg_advisory_xact_lock(hashtextextended('documents:'||aid::text,0));
  FOR r IN SELECT key FROM (SELECT name AS key FROM storage.objects WHERE bucket_id='contract-documents' AND name LIKE aid::text||'/%' UNION SELECT key FROM app_private.contract_objects WHERE agency_id=aid UNION SELECT key FROM app_private.agency_logo_objects WHERE agency_id=aid UNION SELECT key FROM app_private.signing_objects WHERE agency_id=aid) x WHERE key>pol.cursor ORDER BY key LIMIT 50 LOOP
   k:=r.key;n:=n+1;
   INSERT INTO app_private.maintenance_inventory(agency_id,key,classification,quarantined_at) VALUES(aid,k,CASE WHEN NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='contract-documents' AND name=k) THEN 'missing' ELSE app_private.maintenance_classify(aid,k) END,clock_timestamp())
   ON CONFLICT(agency_id,key) DO UPDATE SET classification=EXCLUDED.classification,observed_at=clock_timestamp(),quarantined_at=CASE WHEN maintenance_inventory.classification=EXCLUDED.classification THEN maintenance_inventory.quarantined_at ELSE clock_timestamp() END WHERE maintenance_inventory.state='observed';
  END LOOP;
  UPDATE app_private.maintenance_policies SET cursor=CASE WHEN n<50 THEN '' ELSE k END,scanned_at=clock_timestamp() WHERE agency_id=aid;RETURN 'true';
 ELSIF action='cleanup-claim' THEN
  SELECT x.* INTO i FROM app_private.maintenance_inventory x JOIN app_private.maintenance_policies q USING(agency_id)
   WHERE q.delete_enabled AND x.classification='expired-preview' AND x.state<>'deleted' AND x.attempts<5 AND x.quarantined_at<clock_timestamp()-make_interval(secs=>q.quarantine_seconds+q.retention_seconds) AND COALESCE(x.lease_until,'-infinity')<clock_timestamp() ORDER BY x.quarantined_at LIMIT 1 FOR UPDATE OF x SKIP LOCKED;
  IF i.key IS NULL THEN RETURN 'null';END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('documents:'||i.agency_id::text,0));
  IF app_private.maintenance_classify(i.agency_id,i.key)<>'expired-preview' THEN UPDATE app_private.maintenance_inventory SET classification='manual-review' WHERE agency_id=i.agency_id AND key=i.key;RETURN 'null';END IF;
  UPDATE app_private.maintenance_inventory SET state='deleting',lease=gen_random_uuid(),lease_until=clock_timestamp()+interval '180 seconds',attempts=attempts+1 WHERE agency_id=i.agency_id AND key=i.key RETURNING * INTO i;
  INSERT INTO app_private.maintenance_audit(action,detail) VALUES('cleanup.claim',jsonb_build_object('agencyId',i.agency_id,'keyHash',encode(sha256(convert_to(i.key,'UTF8')),'hex')));
  RETURN jsonb_build_object('agencyId',i.agency_id,'key',i.key,'lease',i.lease);
 ELSIF action='cleanup-finish' THEN
  UPDATE app_private.maintenance_inventory SET state='deleted',deleted_at=clock_timestamp(),lease=NULL,lease_until=NULL WHERE agency_id=(p->>'agencyId')::uuid AND key=p->>'key' AND state='deleting' AND lease=(p->>'lease')::uuid AND lease_until>clock_timestamp() AND NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='contract-documents' AND name=p->>'key');
  GET DIAGNOSTICS n=ROW_COUNT;IF n=1 THEN INSERT INTO app_private.maintenance_audit(action,detail) VALUES('cleanup.deleted',jsonb_build_object('agencyId',p->>'agencyId','keyHash',encode(sha256(convert_to(p->>'key','UTF8')),'hex')));END IF;RETURN to_jsonb(n=1);
 ELSIF action='rotation-next' THEN
  FOR r IN SELECT * FROM app_private.maintenance_rotations WHERE enabled ORDER BY consumer LOOP
   IF r.consumer='delivery' THEN
    SELECT jsonb_build_object('consumer','delivery','id',d.job_id,'envelope',d.envelope,'aad',j.agency_id::text||'|'||j.session_id::text||'|'||j.id::text||'|'||j.purpose,'target',r.target_key) INTO result FROM app_private.delivery_payloads d JOIN app_private.delivery_jobs j ON j.id=d.job_id WHERE d.envelope->>'keyId'<>r.target_key AND (d.envelope->>'expiresAt')::timestamptz>clock_timestamp() ORDER BY j.id LIMIT 1;
   ELSE
    SELECT jsonb_build_object('consumer','sheets','id',agency_id,'envelope',envelope,'aad','sheets|'||agency_id::text||'|credentials|'||credential_revision::text,'target',r.target_key) INTO result FROM app_private.sheets_connections WHERE envelope->>'keyId'<>r.target_key AND (envelope->>'expiresAt')::timestamptz>clock_timestamp() ORDER BY agency_id LIMIT 1;
   END IF;
   IF result IS NOT NULL THEN RETURN result;END IF;
  END LOOP;RETURN 'null';
 ELSIF action='rotation-cas' THEN
  IF NOT EXISTS(SELECT 1 FROM app_private.maintenance_rotations WHERE consumer=p->>'consumer' AND enabled AND target_key=p->'envelope'->>'keyId') OR p->'envelope'->>'expiresAt' IS DISTINCT FROM p->'previous'->>'expiresAt' OR p->'envelope'->>'version'<>'1' THEN RAISE EXCEPTION 'Invalid rotation' USING ERRCODE='22023';END IF;
  IF p->>'consumer'='delivery' THEN UPDATE app_private.delivery_payloads SET envelope=p->'envelope' WHERE job_id=(p->>'id')::uuid AND envelope=p->'previous';
  ELSE UPDATE app_private.sheets_connections SET envelope=p->'envelope' WHERE agency_id=(p->>'id')::uuid AND envelope=p->'previous';END IF;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n=1 THEN UPDATE app_private.maintenance_rotations SET changed=changed+1,last_changed=clock_timestamp() WHERE consumer=p->>'consumer';INSERT INTO app_private.maintenance_audit(action,detail) VALUES('rotation.changed',jsonb_build_object('consumer',p->>'consumer','target',p->'envelope'->>'keyId'));END IF;RETURN to_jsonb(n=1);
 ELSIF action='finalization-claim' THEN
  SELECT x.agency_id,x.id,inv.token_hash INTO r FROM app_private.signing_sessions x JOIN app_private.signing_invitations inv ON inv.agency_id=x.agency_id AND inv.session_id=x.id
   LEFT JOIN app_private.maintenance_finalization m ON m.agency_id=x.agency_id AND m.session_id=x.id
   WHERE x.assurance='simple' AND x.state IN('client_signed','finalization_pending') AND x.agency_signature->>'method'='typed' AND x.client_signature->>'method'='typed'
   AND x.expires_at>clock_timestamp() AND inv.expires_at>clock_timestamp() AND NOT inv.revoked AND inv.consumed AND inv.failures<5
   AND COALESCE(m.attempts,0)<5 AND COALESCE(m.lease_until,'-infinity')<clock_timestamp() AND COALESCE(m.not_before,'-infinity')<=clock_timestamp() ORDER BY x.agency_id,x.id LIMIT 1;
  IF NOT FOUND THEN RETURN 'null';END IF;
  INSERT INTO app_private.maintenance_finalization(agency_id,session_id) VALUES(r.agency_id,r.id) ON CONFLICT DO NOTHING;
  UPDATE app_private.maintenance_finalization SET lease=gen_random_uuid(),lease_until=clock_timestamp()+interval '90 seconds',attempts=attempts+1,not_before=clock_timestamp()+make_interval(secs=>least(3600,60*power(2,attempts)::integer)) WHERE agency_id=r.agency_id AND session_id=r.id AND COALESCE(lease_until,'-infinity')<clock_timestamp() AND attempts<5;
  IF NOT FOUND THEN RETURN 'null';END IF;
  RETURN jsonb_build_object('agencyId',r.agency_id,'sessionId',r.id,'tokenHash',r.token_hash);
 ELSIF action IN('generation-claim','generation-step') THEN RETURN app_private.maintenance_document(action,p);
 ELSIF action='lifecycle' THEN
  PERFORM app_private.maintenance_lifecycle();
  FOR r IN SELECT agency_id,id FROM app_private.signing_sessions WHERE expires_at<=clock_timestamp() AND state NOT IN('completed','expired','declined','cancelled','failed') ORDER BY expires_at LIMIT 50 LOOP PERFORM app_private.maintenance_expire(r.agency_id,r.id);END LOOP;
  RETURN 'true';
 ELSE RAISE EXCEPTION 'Invalid operation' USING ERRCODE='22023';END IF;
END $f$;

ALTER FUNCTION app_private.maintenance_classify(uuid,text) OWNER TO contratpro_maintenance;

ALTER FUNCTION app_private.maintenance_command(text,jsonb) OWNER TO contratpro_maintenance;

REVOKE ALL ON FUNCTION app_private.maintenance_classify(uuid,text),app_private.maintenance_command(text,jsonb) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.contratpro_maintenance_worker(payload text,mac text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE secret_hex text;b bytea;ip bytea;op bytea;i integer;p jsonb;BEGIN
 IF length(payload)>131072 THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
 SELECT secret INTO secret_hex FROM app_private.maintenance_key;
 IF secret_hex IS NULL THEN RAISE EXCEPTION 'Unavailable' USING ERRCODE='55000';END IF;
 b:=decode(secret_hex||repeat('00',32),'hex');ip:=b;op:=b;FOR i IN 0..63 LOOP ip:=set_byte(ip,i,get_byte(b,i)#54);op:=set_byte(op,i,get_byte(b,i)#92);END LOOP;
 IF mac IS NULL OR mac!~'^[a-f0-9]{64}$' OR mac<>encode(sha256(op||sha256(ip||convert_to(payload,'UTF8'))),'hex') THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
 p:=payload::jsonb;RETURN app_private.maintenance_command(p->>'action',p->'input');
END $f$;

ALTER FUNCTION public.contratpro_maintenance_worker(text,text) OWNER TO contratpro_maintenance;

REVOKE ALL ON FUNCTION public.contratpro_maintenance_worker(text,text) FROM PUBLIC,anon,authenticated,service_role;

GRANT EXECUTE ON FUNCTION public.contratpro_maintenance_worker(text,text) TO anon,authenticated;

CREATE FUNCTION public.contratpro_maintenance_platform(action text,p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE actor uuid;BEGIN
 actor:=app_private.billing_admin();
 RETURN app_private.maintenance_admin(actor,action,p);
END $f$;

CREATE FUNCTION app_private.maintenance_admin(actor uuid,action text,p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
BEGIN
 IF jsonb_typeof(p) IS DISTINCT FROM 'object' OR pg_column_size(p)>4096 OR EXISTS(SELECT 1 FROM jsonb_object_keys(p) k WHERE k<>ALL(CASE action WHEN 'overview' THEN ARRAY[]::text[] WHEN 'schedule' THEN ARRAY['task','enabled','intervalSeconds'] WHEN 'policy' THEN ARRAY['agencyId','retentionSeconds','quarantineSeconds','deleteEnabled'] WHEN 'rotation' THEN ARRAY['consumer','target','enabled'] WHEN 'backup' THEN ARRAY['id','completedAt','manifestSha256','validated'] WHEN 'candidates' THEN ARRAY['agencyId','page'] WHEN 'recovery-page' THEN ARRAY['agencyId','page'] WHEN 'recovery-retry' THEN ARRAY['agencyId','kind','id'] WHEN 'cleanup-retry' THEN ARRAY['agencyId','keyHash'] WHEN 'incident-acknowledge' THEN ARRAY['id'] ELSE ARRAY[]::text[] END)) THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
 IF action='overview' THEN RETURN app_private.maintenance_command('overview','{}');
 ELSIF action='schedule' THEN
  UPDATE app_private.maintenance_schedules SET enabled=(p->>'enabled')::boolean,interval_seconds=(p->>'intervalSeconds')::integer,attempts=0 WHERE task=p->>'task';
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
 ELSIF action='policy' THEN INSERT INTO app_private.maintenance_policies(agency_id,retention_seconds,quarantine_seconds,delete_enabled) VALUES((p->>'agencyId')::uuid,(p->>'retentionSeconds')::integer,(p->>'quarantineSeconds')::integer,(p->>'deleteEnabled')::boolean) ON CONFLICT(agency_id) DO UPDATE SET retention_seconds=EXCLUDED.retention_seconds,quarantine_seconds=EXCLUDED.quarantine_seconds,delete_enabled=EXCLUDED.delete_enabled;
 ELSIF action='rotation' THEN INSERT INTO app_private.maintenance_rotations(consumer,target_key,enabled) VALUES(p->>'consumer',p->>'target',(p->>'enabled')::boolean) ON CONFLICT(consumer) DO UPDATE SET target_key=EXCLUDED.target_key,enabled=EXCLUDED.enabled;
 ELSIF action='backup' THEN INSERT INTO app_private.maintenance_backups VALUES((p->>'id')::uuid,(p->>'completedAt')::timestamptz,p->>'manifestSha256',(p->>'validated')::boolean) ON CONFLICT DO NOTHING;
 ELSIF action='candidates' THEN RETURN (SELECT COALESCE(jsonb_agg(x),'[]') FROM (SELECT agency_id,encode(sha256(convert_to(key,'UTF8')),'hex') key_hash,classification,state,observed_at,quarantined_at,attempts FROM app_private.maintenance_inventory WHERE agency_id=(p->>'agencyId')::uuid ORDER BY key LIMIT 50 OFFSET least(10000,greatest(0,COALESCE((p->>'page')::integer,0)))*50) x);
 ELSIF action='recovery-page' THEN RETURN (SELECT COALESCE(jsonb_agg(x),'[]') FROM (SELECT * FROM (
  SELECT 'generation' kind,request_id id,attempts,lease_until,not_before FROM app_private.maintenance_generation WHERE agency_id=(p->>'agencyId')::uuid
  UNION ALL SELECT 'finalization',session_id,attempts,lease_until,not_before FROM app_private.maintenance_finalization WHERE agency_id=(p->>'agencyId')::uuid
 ) q ORDER BY kind,id LIMIT 50 OFFSET least(10000,greatest(0,COALESCE((p->>'page')::integer,0)))*50) x);
 ELSIF action='recovery-retry' THEN
  IF p->>'kind'='generation' THEN UPDATE app_private.maintenance_generation SET attempts=0,not_before=clock_timestamp() WHERE agency_id=(p->>'agencyId')::uuid AND request_id=(p->>'id')::uuid AND lease_until<clock_timestamp();
  ELSIF p->>'kind'='finalization' THEN UPDATE app_private.maintenance_finalization SET attempts=0,not_before=clock_timestamp() WHERE agency_id=(p->>'agencyId')::uuid AND session_id=(p->>'id')::uuid AND lease_until<clock_timestamp();
  ELSE RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'No expired recovery lease' USING ERRCODE='40001';END IF;
 ELSIF action='cleanup-retry' THEN
  UPDATE app_private.maintenance_inventory SET attempts=0 WHERE agency_id=(p->>'agencyId')::uuid AND encode(sha256(convert_to(key,'UTF8')),'hex')=p->>'keyHash' AND state='deleting' AND lease_until<clock_timestamp() AND app_private.maintenance_classify(agency_id,key)='expired-preview';
  IF NOT FOUND THEN RAISE EXCEPTION 'No eligible expired cleanup lease' USING ERRCODE='40001';END IF;
 ELSIF action='incident-acknowledge' THEN UPDATE app_private.maintenance_incidents SET acknowledged_at=clock_timestamp(),actor=maintenance_admin.actor WHERE id=(p->>'id')::uuid AND acknowledged_at IS NULL;
 ELSE RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
 INSERT INTO app_private.maintenance_audit(actor,action,detail) VALUES(actor,action,p);RETURN 'true';
END $f$;

ALTER FUNCTION app_private.maintenance_admin(uuid,text,jsonb) OWNER TO contratpro_maintenance;

REVOKE ALL ON FUNCTION app_private.maintenance_admin(uuid,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;

GRANT EXECUTE ON FUNCTION app_private.maintenance_admin(uuid,text,jsonb) TO contratpro_billing_writer;

ALTER FUNCTION public.contratpro_maintenance_platform(text,jsonb) OWNER TO contratpro_billing_writer;

REVOKE ALL ON FUNCTION public.contratpro_maintenance_platform(text,jsonb) FROM PUBLIC,anon,authenticated,service_role;

GRANT EXECUTE ON FUNCTION public.contratpro_maintenance_platform(text,jsonb) TO authenticated;

CREATE FUNCTION app_private.maintenance_lifecycle() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE r record;BEGIN
 PERFORM set_config('contratpro.billing_internal','true',true);
 FOR r IN SELECT s.agency_id FROM app_private.billing_subscriptions s WHERE
  (s.state='trialing' AND s.trial_end<=clock_timestamp()) OR
  (s.state IN('active','past_due') AND s.period_end<=clock_timestamp()) OR
  (s.state='grace_period' AND s.grace_end<=clock_timestamp()) OR
  EXISTS(SELECT 1 FROM app_private.billing_payments p WHERE p.agency_id=s.agency_id AND p.state='confirmed' AND p.activation_state='pending' AND p.period_start<=clock_timestamp())
  ORDER BY s.agency_id LIMIT 50 FOR UPDATE SKIP LOCKED LOOP
  PERFORM app_private.billing_refresh(r.agency_id);
 END LOOP;
END $f$;

ALTER FUNCTION app_private.maintenance_lifecycle() OWNER TO contratpro_billing_writer;

REVOKE ALL ON FUNCTION app_private.maintenance_lifecycle() FROM PUBLIC,anon,authenticated,service_role;

GRANT EXECUTE ON FUNCTION app_private.maintenance_lifecycle() TO contratpro_maintenance;

CREATE FUNCTION app_private.maintenance_expire(aid uuid,sid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
BEGIN
 PERFORM set_config('contratpro.signing_agency',aid::text,true);
 PERFORM pg_advisory_xact_lock(hashtextextended('documents:'||aid::text,0));
 PERFORM 1 FROM app_private.signing_sessions WHERE agency_id=aid AND id=sid AND expires_at<=clock_timestamp() AND state NOT IN('completed','expired','declined','cancelled','failed') FOR UPDATE;
 IF FOUND THEN PERFORM app_private.signing_transition(aid,sid,'expired','{}');END IF;
END $f$;

ALTER FUNCTION app_private.maintenance_expire(uuid,uuid) OWNER TO contratpro_rental_writer;

REVOKE ALL ON FUNCTION app_private.maintenance_expire(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;

GRANT EXECUTE ON FUNCTION app_private.maintenance_expire(uuid,uuid) TO contratpro_maintenance;

CREATE FUNCTION app_private.maintenance_document(action text,p jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE j app_private.contract_generation_jobs;g app_private.maintenance_generation;t jsonb;v jsonb;obj app_private.contract_objects;aid uuid;req uuid;step text;input jsonb;result jsonb;BEGIN
 IF action='generation-claim' THEN
  SELECT x.* INTO j FROM app_private.contract_generation_jobs x LEFT JOIN app_private.maintenance_generation m USING(agency_id,request_id)
   WHERE NOT EXISTS(SELECT 1 FROM app_private.contract_artifacts a WHERE a.agency_id=x.agency_id AND a.request_id=x.request_id)
   AND (x.input->>'status'='draft' OR x.input->>'status'='issued' AND EXISTS(SELECT 1 FROM tenancy.rental_contracts r WHERE r.agency_id=x.agency_id AND r.id=x.rental_id AND r.version=x.rental_version AND r.state IN('confirme','en_cours','termine')) AND NOT EXISTS(SELECT 1 FROM app_private.contract_artifacts a WHERE a.agency_id=x.agency_id AND a.rental_id=x.rental_id AND a.payload->>'status'='issued'))
   AND COALESCE(m.attempts,0)<5 AND COALESCE(m.lease_until,'-infinity')<clock_timestamp() AND COALESCE(m.not_before,'-infinity')<=clock_timestamp() ORDER BY x.agency_id,x.request_id LIMIT 1;
  IF j.request_id IS NULL THEN RETURN 'null';END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('documents:'||j.agency_id::text,0));
  INSERT INTO app_private.maintenance_generation(agency_id,request_id) VALUES(j.agency_id,j.request_id) ON CONFLICT DO NOTHING;
  UPDATE app_private.maintenance_generation SET lease=gen_random_uuid(),lease_until=clock_timestamp()+interval '90 seconds',attempts=attempts+1,not_before=clock_timestamp()+make_interval(secs=>least(3600,60*power(2,attempts)::integer)) WHERE agency_id=j.agency_id AND request_id=j.request_id AND COALESCE(lease_until,'-infinity')<clock_timestamp() AND attempts<5 RETURNING * INTO g;
  IF g.lease IS NULL THEN RETURN 'null';END IF;
  RETURN jsonb_build_object('agencyId',j.agency_id,'input',j.input,'lease',g.lease);
 END IF;
 aid:=(p->>'agencyId')::uuid;req:=(p->>'requestId')::uuid;step:=p->>'step';input:=p->'input';
 PERFORM pg_advisory_xact_lock(hashtextextended('documents:'||aid::text,0));
 SELECT * INTO g FROM app_private.maintenance_generation WHERE agency_id=aid AND request_id=req AND lease=(p->>'lease')::uuid AND lease_until>clock_timestamp();
 IF g.lease IS NULL THEN RAISE EXCEPTION 'Lease lost' USING ERRCODE='40001';END IF;
 SELECT * INTO STRICT j FROM app_private.contract_generation_jobs WHERE agency_id=aid AND request_id=req;
 IF j.input->>'status'='issued' AND (NOT EXISTS(SELECT 1 FROM tenancy.rental_contracts r WHERE r.agency_id=aid AND r.id=j.rental_id AND r.version=j.rental_version AND r.state IN('confirme','en_cours','termine')) OR EXISTS(SELECT 1 FROM app_private.contract_artifacts a WHERE a.agency_id=aid AND a.rental_id=j.rental_id AND a.request_id<>req AND a.payload->>'status'='issued')) THEN RAISE EXCEPTION 'Manual recovery required' USING ERRCODE='40001';END IF;
 SELECT payload INTO STRICT t FROM app_private.contract_template_versions WHERE agency_id=aid AND id=j.template_version_id;
 SELECT c.input INTO v FROM app_private.contract_confirmed_inputs c WHERE c.agency_id=aid AND c.rental_id=j.rental_id;
 IF v ? 'clauses' THEN t:=jsonb_set(t,'{config,clauses}',v->'clauses');END IF;
 SELECT payload INTO result FROM app_private.contract_artifacts WHERE agency_id=aid AND request_id=req;
 IF step='begin' THEN
  IF input IS DISTINCT FROM j.input THEN RAISE EXCEPTION 'Pinned request required' USING ERRCODE='40001';END IF;
  RETURN jsonb_build_object('artifact',result,'template',t,'snapshot',j.snapshot,'fingerprint',req);
 ELSIF step='reserve' THEN
  IF input->>'key' IS DISTINCT FROM aid::text||'/'||(CASE WHEN j.input->>'status'='issued' THEN 'issued' ELSE 'drafts' END)||'/'||req::text||'/'||(input->>'checksum')||'.pdf' OR input->>'checksum'!~'^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid output' USING ERRCODE='22023';END IF;
  INSERT INTO app_private.contract_objects(agency_id,key,checksum,kind) VALUES(aid,input->>'key',input->>'checksum',CASE WHEN j.input->>'status'='issued' THEN 'issued' ELSE 'drafts' END) ON CONFLICT DO NOTHING;RETURN 'true';
 ELSIF step='finish' THEN
  IF result IS NOT NULL THEN RETURN result;END IF;
  IF input->>'attestation' IS DISTINCT FROM app_private.document_renderer_mac(concat_ws('|',aid::text,req::text,input->>'key',input->>'checksum',t->>'checksum')) OR input->>'sourceChecksum' IS DISTINCT FROM t->>'checksum' THEN RAISE EXCEPTION 'Invalid render proof' USING ERRCODE='42501';END IF;
  SELECT * INTO obj FROM app_private.contract_objects WHERE agency_id=aid AND key=input->>'key' AND checksum=input->>'checksum' AND state<>'deleting';
  IF obj.key IS NULL OR obj.key IS DISTINCT FROM aid::text||'/'||(CASE WHEN j.input->>'status'='issued' THEN 'issued' ELSE 'drafts' END)||'/'||req::text||'/'||obj.checksum||'.pdf' OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='contract-documents' AND name=obj.key) THEN RAISE EXCEPTION 'Missing output' USING ERRCODE='40001';END IF;
  result:=jsonb_build_object('id',gen_random_uuid(),'agencyId',aid,'rentalId',j.rental_id,'rentalVersion',j.rental_version,'templateVersionId',j.template_version_id,'key',obj.key,'checksum',obj.checksum,'sourceChecksum',t->>'checksum','status',j.input->>'status','requestId',req,'createdAt',clock_timestamp(),'signing',jsonb_build_object('order',jsonb_build_array('agency','client'),'evidence',NULL,'zones',t->'config'->'signatures'));
  INSERT INTO app_private.contract_artifacts VALUES(aid,(result->>'id')::uuid,req,j.rental_id,j.rental_version,result);
  UPDATE app_private.contract_objects SET state='retained' WHERE agency_id=aid AND key=obj.key;
  INSERT INTO app_private.maintenance_audit(action,detail) VALUES('generation.recovered',jsonb_build_object('agencyId',aid,'requestId',req));RETURN result;
 ELSE RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
END $f$;

ALTER FUNCTION app_private.maintenance_document(text,jsonb) OWNER TO contratpro_maintenance;

REVOKE ALL ON FUNCTION app_private.maintenance_document(text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
-- Postconditions are in the same transaction as source changes and history.

DO $d2_restore$
DECLARE r record; observed jsonb; BEGIN
 FOR r IN SELECT * FROM pg_temp.d2_authority ORDER BY role_name LOOP
  IF NOT r.create_public THEN EXECUTE format('REVOKE CREATE ON SCHEMA public FROM %I',r.role_name);END IF;
  IF NOT r.create_private THEN EXECUTE format('REVOKE CREATE ON SCHEMA app_private FROM %I',r.role_name);END IF;
  IF r.own_edge IS NULL THEN EXECUTE format('REVOKE %I FROM postgres GRANTED BY postgres RESTRICT',r.role_name);
  ELSE EXECUTE format('GRANT %I TO postgres WITH ADMIN %s, INHERIT %s, SET %s GRANTED BY postgres',r.role_name,r.own_edge->>'admin',r.own_edge->>'inherit',r.own_edge->>'set');END IF;
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
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.maintenance_key'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.maintenance_schedules'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.maintenance_generation'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.maintenance_finalization'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.maintenance_audit'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.maintenance_inventory'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.maintenance_policies'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.maintenance_rotations'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.maintenance_backups'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.maintenance_incidents'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.maintenance_reconciliation'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.maintenance_heartbeat'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;

 IF EXISTS(SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace,
 LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
 WHERE (n.nspname||'.'||p.proname)=ANY(ARRAY['app_private.maintenance_classify','app_private.maintenance_reference_fence','app_private.maintenance_confirm_fence','public.contratpro_maintenance_storage_write','app_private.maintenance_command','public.contratpro_maintenance_worker','public.contratpro_maintenance_platform','app_private.maintenance_admin','app_private.maintenance_lifecycle','app_private.maintenance_expire','app_private.maintenance_document']::text[]) AND p.prosecdef AND a.grantee=0 AND a.privilege_type='EXECUTE') THEN RAISE EXCEPTION 'D2 definer PUBLIC execute leak';END IF;
END $d2_objects_post$;

DO $d2_security_post$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=ANY(ARRAY['contratpro_rental_writer','contratpro_billing_writer','contratpro_maintenance']::text[])
 AND (rolcanlogin OR rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication OR rolinherit)) THEN RAISE EXCEPTION 'D2 writer role widened';END IF;
END $d2_security_post$;
INSERT INTO supabase_migrations.schema_migrations(version) VALUES('20261126002500');
DO $d2_post$ BEGIN
 IF ARRAY(SELECT version FROM supabase_migrations.schema_migrations ORDER BY version) IS DISTINCT FROM ARRAY['20261115000000','20261115000100','20261115000200','20261115000300','20261115000400','20261115000500','20261115000600','20261116000700','20261118000800','20261118000900','20261118001000','20261119001100','20261119001200','20261120001300','20261122001400','20261122001500','20261124001600','20261124001700','20261124001800','20261124001900','20261124002000','20261125002100','20261125002200','20261125002300','20261126002400','20261126002500']::text[]
 THEN RAISE EXCEPTION 'D2 final history mismatch';END IF;
END $d2_post$;
COMMIT;
