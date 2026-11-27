-- D2 NATIVE SYNTHETIC TEST CANDIDATE ONLY. NOT A MANAGED DEPLOYMENT ARTIFACT.
-- Source: supabase/migration-drafts/20261126002600_navigation_capabilities.sql; raw SHA256 148ea786c67d0bebfcccc57844a471a3665aa6459efe81b341d570e663559aca
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
 IF ARRAY(SELECT version FROM supabase_migrations.schema_migrations ORDER BY version) IS DISTINCT FROM ARRAY['20261115000000','20261115000100','20261115000200','20261115000300','20261115000400','20261115000500','20261115000600','20261116000700','20261118000800','20261118000900','20261118001000','20261119001100','20261119001200','20261120001300','20261122001400','20261122001500','20261124001600','20261124001700','20261124001800','20261124001900','20261124002000','20261125002100','20261125002200','20261125002300','20261126002400','20261126002500']::text[]
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

SET LOCAL row_security=on;

CREATE FUNCTION public.contratpro_navigation(p_agency_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE actor uuid;keys text[];BEGIN
 actor:=app_private.rental_member(p_agency_id);
 SELECT COALESCE(array_agg(DISTINCT rp.permission_key),ARRAY[]::text[]) INTO keys
 FROM tenancy.membership_roles mr JOIN tenancy.role_permissions rp ON rp.agency_id=mr.agency_id AND rp.role_id=mr.role_id
 WHERE mr.agency_id=p_agency_id AND mr.membership_id=actor;
 RETURN jsonb_build_object('clients','clients.read'=ANY(keys),'vehicles','vehicles.read'=ANY(keys),'rentals',true,'templates',true,
 'delivery','contracts.deliver'=ANY(keys),'sheets',keys && ARRAY['sheets.view','sheets.manage'],'billing','billing.view'=ANY(keys),
 'team','agency.manage'=ANY(keys) AND EXISTS(SELECT 1 FROM tenancy.membership_roles mr JOIN tenancy.roles r ON r.agency_id=mr.agency_id AND r.id=mr.role_id WHERE mr.agency_id=p_agency_id AND mr.membership_id=actor AND r.key='owner'),
 'branding','agency.manage'=ANY(keys) AND EXISTS(SELECT 1 FROM tenancy.membership_roles mr JOIN tenancy.roles r ON r.agency_id=mr.agency_id AND r.id=mr.role_id WHERE mr.agency_id=p_agency_id AND mr.membership_id=actor AND r.key='owner'));
END $f$;

ALTER FUNCTION public.contratpro_navigation(uuid) OWNER TO contratpro_rental_writer;

REVOKE ALL ON FUNCTION public.contratpro_navigation(uuid) FROM PUBLIC,anon,authenticated,service_role;

GRANT EXECUTE ON FUNCTION public.contratpro_navigation(uuid) TO authenticated;

GRANT SELECT(agency_id,contract_id,state) ON app_private.sheets_jobs TO contratpro_rental_writer;

CREATE POLICY a6_sheets_overview ON app_private.sheets_jobs FOR SELECT TO contratpro_rental_writer
 USING(agency_id=nullif(current_setting('contratpro.a6_agency',true),'')::uuid);

CREATE FUNCTION public.contratpro_dashboard(p_agency_id uuid,p_module text,p_at timestamptz) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE actor uuid; result jsonb; BEGIN
 actor:=app_private.rental_member(p_agency_id);
 IF p_at IS NULL OR NOT isfinite(p_at) OR p_module IS NULL OR p_module NOT IN('rentals','signing','delivery','sheets') THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
 IF p_module='rentals' THEN
  SELECT jsonb_object_agg(kind,items) INTO result FROM (
   SELECT kind,(SELECT COALESCE(jsonb_agg(to_jsonb(v) ORDER BY v.at,v.id),'[]'::jsonb) FROM (
    SELECT r.id,r.contract_number AS reference,r.state,
     CASE WHEN kind='returns' THEN r.ends_at WHEN kind='activity' THEN r.updated_at ELSE r.starts_at END AS at
    FROM tenancy.rental_contracts r WHERE r.agency_id=p_agency_id AND
     CASE kind WHEN 'active' THEN r.state='en_cours'
      WHEN 'pickups' THEN r.state='confirme' AND r.starts_at<p_at+interval '24 hours'
      WHEN 'returns' THEN r.state='en_cours' AND r.ends_at<p_at+interval '24 hours'
      WHEN 'drafts' THEN r.state='brouillon' ELSE true END
    ORDER BY CASE WHEN kind='activity' THEN r.updated_at END DESC,
     CASE WHEN kind='returns' THEN r.ends_at ELSE r.starts_at END,r.id LIMIT 20
   ) v) AS items FROM unnest(ARRAY['active','pickups','returns','drafts','activity']) kind
  ) categories;
 ELSIF p_module='signing' THEN
  PERFORM app_private.signing_allowed(p_agency_id);
  PERFORM set_config('contratpro.signing_agency',p_agency_id::text,true);
  SELECT COALESCE(jsonb_agg(to_jsonb(v) ORDER BY v.at,v.id),'[]'::jsonb) INTO result FROM (
   SELECT s.rental_id AS id,r.contract_number AS reference,s.state,s.expires_at AS at FROM app_private.signing_sessions s
   JOIN tenancy.rental_contracts r ON r.agency_id=s.agency_id AND r.id=s.rental_id
   WHERE s.agency_id=p_agency_id AND s.expires_at>p_at AND s.state IN('awaiting_agency','agency_signed','awaiting_client','client_signed','finalization_pending','reconciliation_required')
   ORDER BY s.expires_at,s.id LIMIT 20) v;
 ELSIF p_module='delivery' THEN
  PERFORM app_private.delivery_allowed(p_agency_id);
  PERFORM set_config('contratpro.signing_agency',p_agency_id::text,true);
  SELECT COALESCE(jsonb_agg(to_jsonb(v) ORDER BY v.id,v.state),'[]'::jsonb) INTO result FROM (
   SELECT s.rental_id AS id,r.contract_number AS reference,j.state FROM app_private.delivery_jobs j
   JOIN app_private.signing_sessions s ON s.agency_id=j.agency_id AND s.id=j.session_id
   JOIN tenancy.rental_contracts r ON r.agency_id=s.agency_id AND r.id=s.rental_id
   WHERE j.agency_id=p_agency_id AND NOT j.obsolete AND j.state IN('failed','bounced','uncertain')
   ORDER BY j.not_before,j.id LIMIT 20) v;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM tenancy.membership_roles mr JOIN tenancy.role_permissions rp ON rp.agency_id=mr.agency_id AND rp.role_id=mr.role_id WHERE mr.agency_id=p_agency_id AND mr.membership_id=actor AND rp.permission_key IN('sheets.view','sheets.manage')) THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
  PERFORM set_config('contratpro.a6_agency',p_agency_id::text,true);
  SELECT COALESCE(jsonb_agg(to_jsonb(v) ORDER BY v.id),'[]'::jsonb) INTO result FROM (
   SELECT j.contract_id AS id,r.contract_number AS reference,j.state FROM app_private.sheets_jobs j
   JOIN tenancy.rental_contracts r ON r.agency_id=j.agency_id AND r.id=j.contract_id
   WHERE j.agency_id=p_agency_id AND j.state IN('pending','processing','failed','paused','reconciliation-required')
   ORDER BY j.contract_id LIMIT 20) v;
 END IF;
 RETURN result;
END $f$;

ALTER FUNCTION public.contratpro_dashboard(uuid,text,timestamptz) OWNER TO contratpro_rental_writer;

REVOKE ALL ON FUNCTION public.contratpro_dashboard(uuid,text,timestamptz) FROM PUBLIC,anon,authenticated,service_role;

GRANT EXECUTE ON FUNCTION public.contratpro_dashboard(uuid,text,timestamptz) TO authenticated;
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
 WHERE (n.nspname||'.'||p.proname)=ANY(ARRAY['public.contratpro_navigation','public.contratpro_dashboard']::text[]) AND p.prosecdef AND a.grantee=0 AND a.privilege_type='EXECUTE') THEN RAISE EXCEPTION 'D2 definer PUBLIC execute leak';END IF;
END $d2_objects_post$;

DO $d2_security_post$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=ANY(ARRAY['contratpro_rental_writer']::text[])
 AND (rolcanlogin OR rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication OR rolinherit)) THEN RAISE EXCEPTION 'D2 writer role widened';END IF;
END $d2_security_post$;
INSERT INTO supabase_migrations.schema_migrations(version) VALUES('20261126002600');
DO $d2_post$ BEGIN
 IF ARRAY(SELECT version FROM supabase_migrations.schema_migrations ORDER BY version) IS DISTINCT FROM ARRAY['20261115000000','20261115000100','20261115000200','20261115000300','20261115000400','20261115000500','20261115000600','20261116000700','20261118000800','20261118000900','20261118001000','20261119001100','20261119001200','20261120001300','20261122001400','20261122001500','20261124001600','20261124001700','20261124001800','20261124001900','20261124002000','20261125002100','20261125002200','20261125002300','20261126002400','20261126002500','20261126002600']::text[]
 THEN RAISE EXCEPTION 'D2 final history mismatch';END IF;
END $d2_post$;
COMMIT;
