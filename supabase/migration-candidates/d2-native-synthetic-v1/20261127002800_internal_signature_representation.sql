-- D2 NATIVE SYNTHETIC TEST CANDIDATE ONLY. NOT A MANAGED DEPLOYMENT ARTIFACT.
-- Source: supabase/migration-drafts/20261127002800_internal_signature_representation.sql; raw SHA256 d2efcbc7ef47d906dd6c659f0200ae559e0b5644a3b25272460177d5e83b0d2e
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
 IF ARRAY(SELECT version FROM supabase_migrations.schema_migrations ORDER BY version) IS DISTINCT FROM ARRAY['20261115000000','20261115000100','20261115000200','20261115000300','20261115000400','20261115000500','20261115000600','20261116000700','20261118000800','20261118000900','20261118001000','20261119001100','20261119001200','20261120001300','20261122001400','20261122001500','20261124001600','20261124001700','20261124001800','20261124001900','20261124002000','20261125002100','20261125002200','20261125002300','20261126002400','20261126002500','20261126002600','20261127002700']::text[]
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
 IF wanted::text<>ALL(ARRAY['contratpro_rental_writer']::text[]) THEN RAISE EXCEPTION 'D2 role outside manifest';END IF;
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
-- Retained source statements; parser-classified design stop/outer BEGIN/ROLLBACK excluded.
SET LOCAL search_path=pg_catalog,pg_temp;

CREATE FUNCTION app_private.b1_capture_valid(cap jsonb) RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog,pg_temp AS $f$
DECLARE stroke jsonb;point jsonb;prior jsonb;total integer:=0;movement boolean:=false;BEGIN
 IF jsonb_typeof(cap) IS DISTINCT FROM 'object' OR octet_length(cap::text)>30000 OR EXISTS(SELECT 1 FROM jsonb_object_keys(cap) k WHERE k NOT IN('typedName','reviewed','identityConfirmed','consent','consentVersion','reviewedChecksum','drawing','drawingNotice','executionRecordVersion')) OR
 jsonb_typeof(cap->'typedName') IS DISTINCT FROM 'string' OR length(btrim(cap->>'typedName')) NOT BETWEEN 2 AND 100 OR cap->>'typedName' ~ '[[:cntrl:]]' OR cap->'reviewed' IS DISTINCT FROM 'true'::jsonb OR cap->'identityConfirmed' IS DISTINCT FROM 'true'::jsonb OR cap->'consent' IS DISTINCT FROM 'true'::jsonb OR
 COALESCE(cap->>'consentVersion','') NOT IN('simple-fr-v1','simple-ar-v1') OR COALESCE(cap->>'reviewedChecksum','') !~ '^[a-f0-9]{64}$' THEN RETURN false;END IF;
 IF cap?'executionRecordVersion' AND cap->>'executionRecordVersion' IS DISTINCT FROM 'b1-v1' THEN RETURN false;END IF;
 IF NOT(cap?'drawing') THEN RETURN NOT(cap?'drawingNotice');END IF;
 IF jsonb_typeof(cap->'drawing') IS DISTINCT FROM 'object' OR cap->'drawing'->>'version' IS DISTINCT FROM 'drawn-v1' OR (SELECT count(*) FROM jsonb_object_keys(cap->'drawing'))<>2 OR jsonb_typeof(cap->'drawing'->'strokes') IS DISTINCT FROM 'array' THEN RETURN false;END IF;
 IF cap->>'drawingNotice' IS DISTINCT FROM (CASE cap->>'consentVersion' WHEN 'simple-fr-v1' THEN 'Le dessin accompagne mon nom saisi. Il est une représentation visuelle, pas une preuve indépendante d’identité ni une signature cryptographique.' ELSE 'يرافق الرسم اسمي المكتوب. وهو تمثيل بصري، وليس دليلاً مستقلاً على الهوية أو توقيعاً تشفيرياً.' END) THEN RETURN false;END IF;
 IF jsonb_array_length(cap->'drawing'->'strokes') NOT BETWEEN 1 AND 20 THEN RETURN false;END IF;
 FOR stroke IN SELECT value FROM jsonb_array_elements(cap->'drawing'->'strokes') LOOP
  IF jsonb_typeof(stroke) IS DISTINCT FROM 'array' THEN RETURN false;END IF;
  IF jsonb_array_length(stroke) NOT BETWEEN 2 AND 160 THEN RETURN false;END IF;
  total:=total+jsonb_array_length(stroke);IF total>1000 THEN RETURN false;END IF;prior:=NULL;
  FOR point IN SELECT value FROM jsonb_array_elements(stroke) LOOP
   IF jsonb_typeof(point) IS DISTINCT FROM 'array' THEN RETURN false;END IF;
   IF jsonb_array_length(point)<>2 OR jsonb_typeof(point->0) IS DISTINCT FROM 'number' OR jsonb_typeof(point->1) IS DISTINCT FROM 'number' THEN RETURN false;END IF;
   IF (point->>0)::numeric NOT BETWEEN 0 AND 1000 OR (point->>1)::numeric NOT BETWEEN 0 AND 1000 OR (point->>0)::numeric<>trunc((point->>0)::numeric) OR (point->>1)::numeric<>trunc((point->>1)::numeric) THEN RETURN false;END IF;
   IF prior IS NOT NULL AND prior<>point THEN movement:=true;END IF;prior:=point;
  END LOOP;
 END LOOP;RETURN movement;
END $f$;

ALTER FUNCTION app_private.signing_command(uuid,uuid,text,text,jsonb) RENAME TO signing_command_before_b1;

CREATE FUNCTION app_private.signing_command(aid uuid,actor uuid,token text,action text,p jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE cap jsonb;BEGIN
 IF action IN('stage-agency','agency-sign','client-sign') THEN
  cap:=CASE WHEN action='client-sign' THEN (p->>'captureText')::jsonb ELSE (p->'intent'->>'captureText')::jsonb END;
  IF NOT app_private.b1_capture_valid(cap) THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
 END IF;
 RETURN app_private.signing_command_before_b1(aid,actor,token,action,p);
END $f$;

REVOKE ALL ON FUNCTION app_private.b1_capture_valid(jsonb),app_private.signing_command(uuid,uuid,text,text,jsonb),app_private.signing_command_before_b1(uuid,uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;

GRANT EXECUTE ON FUNCTION app_private.b1_capture_valid(jsonb),app_private.signing_command(uuid,uuid,text,text,jsonb),app_private.signing_command_before_b1(uuid,uuid,text,text,jsonb) TO contratpro_rental_writer;
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


 IF EXISTS(SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace,
 LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
 WHERE (n.nspname||'.'||p.proname)=ANY(ARRAY['app_private.b1_capture_valid','app_private.signing_command_before_b1','app_private.signing_command']::text[]) AND p.prosecdef AND a.grantee=0 AND a.privilege_type='EXECUTE') THEN RAISE EXCEPTION 'D2 definer PUBLIC execute leak';END IF;
END $d2_objects_post$;

DO $d2_security_post$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=ANY(ARRAY['contratpro_rental_writer']::text[])
 AND (rolcanlogin OR rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication OR rolinherit)) THEN RAISE EXCEPTION 'D2 writer role widened';END IF;
END $d2_security_post$;
INSERT INTO supabase_migrations.schema_migrations(version) VALUES('20261127002800');
DO $d2_post$ BEGIN
 IF ARRAY(SELECT version FROM supabase_migrations.schema_migrations ORDER BY version) IS DISTINCT FROM ARRAY['20261115000000','20261115000100','20261115000200','20261115000300','20261115000400','20261115000500','20261115000600','20261116000700','20261118000800','20261118000900','20261118001000','20261119001100','20261119001200','20261120001300','20261122001400','20261122001500','20261124001600','20261124001700','20261124001800','20261124001900','20261124002000','20261125002100','20261125002200','20261125002300','20261126002400','20261126002500','20261126002600','20261127002700','20261127002800']::text[]
 THEN RAISE EXCEPTION 'D2 final history mismatch';END IF;
END $d2_post$;
COMMIT;
