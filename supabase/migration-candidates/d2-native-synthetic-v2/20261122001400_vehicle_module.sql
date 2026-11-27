-- D2 NATIVE SYNTHETIC TEST CANDIDATE ONLY. NOT A MANAGED DEPLOYMENT ARTIFACT.
-- Source: supabase/migration-drafts/20261122001400_vehicle_module.sql; raw SHA256 5fe673381f862fc65e7e9b8c83e38de090f8d075167041d5c5398ceed243e051
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
 IF ARRAY(SELECT version FROM supabase_migrations.schema_migrations ORDER BY version) IS DISTINCT FROM ARRAY['20261115000000','20261115000100','20261115000200','20261115000300','20261115000400','20261115000500','20261115000600','20261116000700','20261118000800','20261118000900','20261118001000','20261119001100','20261119001200','20261120001300']::text[]
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
 IF wanted::text<>ALL(ARRAY['']::text[]) THEN RAISE EXCEPTION 'D2 role outside manifest';END IF;
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


-- Retained source statements; parser-classified design stop/outer BEGIN/ROLLBACK excluded.
DO $preflight$
BEGIN
 IF session_user<>'postgres' OR current_user<>'postgres'
 OR EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='authenticated' AND (rolsuper OR rolbypassrls))
 OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='tenancy.vehicles'::pg_catalog.regclass
   AND relrowsecurity AND relforcerowsecurity AND relowner='postgres'::pg_catalog.regrole)
 THEN RAISE EXCEPTION 'Vehicle module prerequisite mismatch'; END IF;
END;
$preflight$;

ALTER TABLE tenancy.vehicles
 ADD COLUMN category text NOT NULL DEFAULT 'unspecified' CHECK(category IN ('unspecified','economy','compact','sedan','suv','van','luxury','other')),
 ADD COLUMN fuel_type text NOT NULL DEFAULT 'unspecified' CHECK(fuel_type IN ('unspecified','petrol','diesel','hybrid','electric','lpg','other')),
 ADD COLUMN transmission text NOT NULL DEFAULT 'unspecified' CHECK(transmission IN ('unspecified','manual','automatic')),
 ADD COLUMN rental_status text NOT NULL DEFAULT 'unknown' CHECK(rental_status IN ('unknown','available','rented','maintenance','unavailable')),
 ADD COLUMN state text NOT NULL DEFAULT 'active' CHECK(state IN ('active','archived'));

INSERT INTO tenancy.permissions(key,description) VALUES ('vehicles.archive','Archive agency vehicles') ON CONFLICT(key) DO NOTHING;

CREATE OR REPLACE FUNCTION app_private.vehicle_allowed(target uuid, capability text) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT capability IN ('vehicles.read','vehicles.create','vehicles.update','vehicles.archive')
 AND EXISTS(SELECT 1 FROM tenancy.agencies a WHERE a.id=target AND a.state='active')
 AND (app_private.agency_owner(target) OR EXISTS(
   SELECT 1 FROM tenancy.memberships m JOIN tenancy.membership_roles mr ON mr.agency_id=m.agency_id AND mr.membership_id=m.id
   JOIN tenancy.role_permissions rp ON rp.agency_id=mr.agency_id AND rp.role_id=mr.role_id
   WHERE m.agency_id=target AND m.user_id=app_private.canonical_auth_user() AND m.state='active' AND rp.permission_key=capability))
$f$;

CREATE OR REPLACE FUNCTION app_private.vehicle_payload(p tenancy.vehicles) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT jsonb_build_object('registration',p.registration,'make',p.make,'model',p.model,'year',p.model_year::text,'mileage',p.mileage::text,
   'category',p.category,'fuelType',p.fuel_type,'transmission',p.transmission,'rentalStatus',p.rental_status)
$f$;

CREATE FUNCTION app_private.normalize_vehicle(p jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE result jsonb;
BEGIN
 IF p IS NULL OR jsonb_typeof(p)<>'object' OR pg_column_size(p)>8192 THEN RAISE EXCEPTION 'Invalid vehicle' USING ERRCODE='22023'; END IF;
 IF NOT(p ?& ARRAY['registration','make','model','year','mileage']) OR EXISTS(SELECT 1 FROM jsonb_each(p) e
   WHERE e.key NOT IN ('registration','make','model','year','mileage','category','fuelType','transmission','rentalStatus')
   OR jsonb_typeof(e.value)<>'string' OR (e.value #>> '{}') ~ '[[:cntrl:]]'
   OR (e.value #>> '{}') ~ U&'[\202A-\202E\2066-\2069]')
 THEN RAISE EXCEPTION 'Invalid vehicle' USING ERRCODE='22023'; END IF;
 result:=jsonb_build_object('category','unspecified','fuelType','unspecified','transmission','unspecified','rentalStatus','unknown')||p;
 result:=result||jsonb_build_object('registration',btrim(p->>'registration'),'make',btrim(p->>'make'),'model',btrim(p->>'model'));
 IF length(result->>'registration') NOT BETWEEN 1 AND 24 OR (result->>'registration') !~ '^[[:alnum:]][[:alnum:] /-]*$'
 OR length(result->>'make') NOT BETWEEN 1 AND 80 OR length(result->>'model') NOT BETWEEN 1 AND 80
 OR (result->>'year') !~ '^[0-9]{4}$' OR (result->>'mileage') !~ '^(0|[1-9][0-9]{0,6})$'
 THEN RAISE EXCEPTION 'Invalid vehicle' USING ERRCODE='22023'; END IF;
 IF (result->>'year')::integer NOT BETWEEN 1900 AND extract(year FROM now() AT TIME ZONE 'UTC')::integer+1
 OR result->>'category' NOT IN ('unspecified','economy','compact','sedan','suv','van','luxury','other')
 OR result->>'fuelType' NOT IN ('unspecified','petrol','diesel','hybrid','electric','lpg','other')
 OR result->>'transmission' NOT IN ('unspecified','manual','automatic')
 OR result->>'rentalStatus' NOT IN ('unknown','available','rented','maintenance','unavailable')
 THEN RAISE EXCEPTION 'Invalid vehicle' USING ERRCODE='22023'; END IF;
 RETURN result;
END;
$f$;

CREATE OR REPLACE FUNCTION app_private.valid_vehicle(p jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 PERFORM app_private.normalize_vehicle(p); RETURN true;
EXCEPTION WHEN invalid_parameter_value OR invalid_text_representation OR numeric_value_out_of_range THEN RETURN false;
END;
$f$;

CREATE OR REPLACE FUNCTION app_private.vehicle_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE required_capability text;
BEGIN
 required_capability:=CASE WHEN TG_OP='INSERT' THEN 'vehicles.create' WHEN NEW.state IS DISTINCT FROM OLD.state THEN 'vehicles.archive' ELSE 'vehicles.update' END;
 IF app_private.canonical_auth_user() IS NULL OR NOT app_private.vehicle_allowed(NEW.agency_id,'vehicles.read')
 OR NOT app_private.vehicle_allowed(NEW.agency_id,required_capability) THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
 IF NOT app_private.valid_vehicle(app_private.vehicle_payload(NEW)) OR NEW.registration<>btrim(NEW.registration)
 OR NEW.make<>btrim(NEW.make) OR NEW.model<>btrim(NEW.model) THEN RAISE EXCEPTION 'Invalid vehicle' USING ERRCODE='22023'; END IF;
 IF TG_OP='INSERT' THEN
   IF NEW.state<>'active' OR NEW.created_by_user_id IS DISTINCT FROM app_private.canonical_auth_user() OR NEW.version<>1
   THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
 ELSE
   IF OLD.state<>'active' OR ROW(NEW.id,NEW.agency_id,NEW.creation_key,NEW.created_by_user_id,NEW.created_at)
     IS DISTINCT FROM ROW(OLD.id,OLD.agency_id,OLD.creation_key,OLD.created_by_user_id,OLD.created_at)
   THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
   IF NEW.state IS DISTINCT FROM OLD.state AND (NEW.state<>'archived' OR OLD.rental_status='rented'
     OR app_private.vehicle_payload(NEW) IS DISTINCT FROM app_private.vehicle_payload(OLD))
   THEN RAISE EXCEPTION 'Vehicle archive conflict' USING ERRCODE='40001'; END IF;
   IF OLD.version>=2147483647 THEN RAISE EXCEPTION 'Vehicle version exhausted' USING ERRCODE='40001'; END IF;
   NEW.version:=OLD.version+1;
 END IF;
 NEW.updated_at:=statement_timestamp(); RETURN NEW;
END;
$f$;

ALTER POLICY vehicles_create ON tenancy.vehicles WITH CHECK(state='active' AND app_private.vehicle_allowed(agency_id,'vehicles.read') AND app_private.vehicle_allowed(agency_id,'vehicles.create'));

ALTER POLICY vehicles_update ON tenancy.vehicles
 USING(state='active' AND app_private.vehicle_allowed(agency_id,'vehicles.read')
   AND (app_private.vehicle_allowed(agency_id,'vehicles.update') OR app_private.vehicle_allowed(agency_id,'vehicles.archive')))
 WITH CHECK(app_private.vehicle_allowed(agency_id,'vehicles.read')
   AND ((state='active' AND app_private.vehicle_allowed(agency_id,'vehicles.update')) OR (state='archived' AND app_private.vehicle_allowed(agency_id,'vehicles.archive'))));

GRANT INSERT(category,fuel_type,transmission,rental_status) ON tenancy.vehicles TO authenticated;

GRANT UPDATE(category,fuel_type,transmission,rental_status,state) ON tenancy.vehicles TO authenticated;

CREATE OR REPLACE FUNCTION public.contratpro_vehicles_permissions(p_agency_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT jsonb_build_object('contractVersion',2,'read',app_private.vehicle_allowed(p_agency_id,'vehicles.read'),
 'create',app_private.vehicle_allowed(p_agency_id,'vehicles.read') AND app_private.vehicle_allowed(p_agency_id,'vehicles.create'),
 'update',app_private.vehicle_allowed(p_agency_id,'vehicles.read') AND app_private.vehicle_allowed(p_agency_id,'vehicles.update'),
 'archive',app_private.vehicle_allowed(p_agency_id,'vehicles.read') AND app_private.vehicle_allowed(p_agency_id,'vehicles.archive'))
$f$;

CREATE FUNCTION public.contratpro_vehicles_search(p_agency_id uuid,p_search text,p_page integer) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE result jsonb;
BEGIN
 IF NOT app_private.vehicle_allowed(p_agency_id,'vehicles.read') THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
 IF p_search IS NULL OR length(p_search)>100 OR p_search ~ '[[:cntrl:]]' OR p_search ~ U&'[\202A-\202E\2066-\2069]'
 OR p_page IS NULL OR p_page NOT BETWEEN 1 AND 10000 THEN RAISE EXCEPTION 'Invalid search' USING ERRCODE='22023'; END IF;
 WITH filtered AS (SELECT v.* FROM tenancy.vehicles v WHERE v.agency_id=p_agency_id AND v.state='active'
   AND (p_search='' OR strpos(lower(v.registration||' '||v.make||' '||v.model),lower(p_search))>0)),
 page AS (SELECT * FROM filtered ORDER BY created_at DESC,id LIMIT 20 OFFSET (p_page-1)*20)
 SELECT jsonb_build_object('total',(SELECT count(*) FROM filtered),'items',COALESCE((SELECT jsonb_agg(
   app_private.vehicle_payload(p)||jsonb_build_object('id',p.id,'agencyId',p.agency_id,'version',p.version,'state',p.state)
   ORDER BY p.created_at DESC,p.id) FROM page p),'[]'::jsonb)) INTO result;
 RETURN result;
END;
$f$;

CREATE OR REPLACE FUNCTION public.contratpro_vehicles_list(p_agency_id uuid,p_page integer) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT public.contratpro_vehicles_search(p_agency_id,'',p_page)
$f$;

CREATE OR REPLACE FUNCTION public.contratpro_vehicle_detail(p_agency_id uuid,p_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT app_private.vehicle_payload(v)||jsonb_build_object('id',v.id,'agencyId',v.agency_id,'version',v.version,'state',v.state)
 FROM tenancy.vehicles v WHERE v.agency_id=p_agency_id AND v.id=p_id AND v.state='active'
$f$;

CREATE OR REPLACE FUNCTION public.contratpro_vehicle_create(p_agency_id uuid,p_key uuid,p_details jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE vid uuid; existing tenancy.vehicles; normalized jsonb;
BEGIN
 IF NOT app_private.vehicle_allowed(p_agency_id,'vehicles.read') OR NOT app_private.vehicle_allowed(p_agency_id,'vehicles.create') THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
 IF p_key IS NULL THEN RAISE EXCEPTION 'Invalid key' USING ERRCODE='22023'; END IF;
 normalized:=app_private.normalize_vehicle(p_details);
 PERFORM pg_advisory_xact_lock(hashtextextended(p_agency_id::text||':'||p_key::text,0));
 SELECT * INTO existing FROM tenancy.vehicles WHERE agency_id=p_agency_id AND creation_key=p_key AND state='active';
 IF FOUND THEN
   IF existing.created_by_user_id IS DISTINCT FROM app_private.canonical_auth_user() OR app_private.vehicle_payload(existing) IS DISTINCT FROM normalized
   THEN RAISE EXCEPTION 'Vehicle changed' USING ERRCODE='40001'; END IF;
   RETURN existing.id;
 END IF;
 BEGIN
   INSERT INTO tenancy.vehicles(agency_id,creation_key,registration,make,model,model_year,mileage,category,fuel_type,transmission,rental_status)
   VALUES(p_agency_id,p_key,normalized->>'registration',normalized->>'make',normalized->>'model',(normalized->>'year')::integer,(normalized->>'mileage')::integer,
     normalized->>'category',normalized->>'fuelType',normalized->>'transmission',normalized->>'rentalStatus') RETURNING id INTO vid;
 EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Vehicle conflict' USING ERRCODE='40001'; END;
 RETURN vid;
END;
$f$;

CREATE OR REPLACE FUNCTION public.contratpro_vehicle_update(p_agency_id uuid,p_id uuid,p_version integer,p_details jsonb) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE normalized jsonb;
BEGIN
 IF NOT app_private.vehicle_allowed(p_agency_id,'vehicles.read') OR NOT app_private.vehicle_allowed(p_agency_id,'vehicles.update') THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
 IF p_version IS NULL OR p_version<1 OR p_version>=2147483647 THEN RAISE EXCEPTION 'Invalid version' USING ERRCODE='22023'; END IF;
 normalized:=app_private.normalize_vehicle(p_details);
 IF NOT EXISTS(SELECT 1 FROM tenancy.vehicles WHERE agency_id=p_agency_id AND id=p_id AND state='active') THEN RAISE EXCEPTION 'Unavailable' USING ERRCODE='P0002'; END IF;
 BEGIN
   UPDATE tenancy.vehicles SET registration=normalized->>'registration',make=normalized->>'make',model=normalized->>'model',model_year=(normalized->>'year')::integer,
     mileage=(normalized->>'mileage')::integer,category=normalized->>'category',fuel_type=normalized->>'fuelType',transmission=normalized->>'transmission',rental_status=normalized->>'rentalStatus'
   WHERE agency_id=p_agency_id AND id=p_id AND version=p_version AND state='active';
 EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Vehicle conflict' USING ERRCODE='40001'; END;
 IF NOT FOUND THEN RAISE EXCEPTION 'Vehicle changed' USING ERRCODE='40001'; END IF;
 RETURN true;
END;
$f$;

CREATE FUNCTION public.contratpro_vehicle_archive(p_agency_id uuid,p_id uuid,p_version integer) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF NOT app_private.vehicle_allowed(p_agency_id,'vehicles.read') OR NOT app_private.vehicle_allowed(p_agency_id,'vehicles.archive') THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
 IF p_version IS NULL OR p_version<1 OR p_version>=2147483647 THEN RAISE EXCEPTION 'Invalid version' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM tenancy.vehicles WHERE agency_id=p_agency_id AND id=p_id AND state='active') THEN RAISE EXCEPTION 'Unavailable' USING ERRCODE='P0002'; END IF;
 -- Return only acknowledgement; active-only detail/list hide the archived row.
 UPDATE tenancy.vehicles SET state='archived' WHERE agency_id=p_agency_id AND id=p_id AND version=p_version AND state='active';
 IF NOT FOUND THEN RAISE EXCEPTION 'Vehicle changed' USING ERRCODE='40001'; END IF;
 RETURN true;
END;
$f$;

REVOKE ALL ON FUNCTION app_private.normalize_vehicle(jsonb),public.contratpro_vehicles_search(uuid,text,integer),public.contratpro_vehicle_archive(uuid,uuid,integer)
 FROM PUBLIC,anon,authenticated,service_role,contratpro_runtime,contratpro_platform_runtime,contratpro_agency_writer,contratpro_identity_writer;

GRANT EXECUTE ON FUNCTION app_private.normalize_vehicle(jsonb),public.contratpro_vehicles_search(uuid,text,integer),public.contratpro_vehicle_archive(uuid,uuid,integer) TO authenticated;

DO $postflight$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_proc p,LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
   WHERE p.oid IN ('app_private.normalize_vehicle(jsonb)'::pg_catalog.regprocedure,'public.contratpro_vehicles_search(uuid,text,integer)'::pg_catalog.regprocedure,
     'public.contratpro_vehicle_archive(uuid,uuid,integer)'::pg_catalog.regprocedure)
   AND (p.prosecdef OR p.proowner<>'postgres'::pg_catalog.regrole OR (a.grantee<>p.proowner AND NOT(a.grantee='authenticated'::pg_catalog.regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable))))
 THEN RAISE EXCEPTION 'Vehicle module ACL mismatch'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='tenancy.vehicles'::pg_catalog.regclass AND relrowsecurity AND relforcerowsecurity)
 THEN RAISE EXCEPTION 'Vehicle RLS mismatch'; END IF;
END;
$postflight$;
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


 IF EXISTS(SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace,
 LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
 WHERE (n.nspname||'.'||p.proname)=ANY(ARRAY['app_private.vehicle_allowed','app_private.vehicle_payload','app_private.normalize_vehicle','app_private.valid_vehicle','app_private.vehicle_guard','public.contratpro_vehicles_permissions','public.contratpro_vehicles_search','public.contratpro_vehicles_list','public.contratpro_vehicle_detail','public.contratpro_vehicle_create','public.contratpro_vehicle_update','public.contratpro_vehicle_archive']::text[]) AND p.prosecdef AND a.grantee=0 AND a.privilege_type='EXECUTE') THEN RAISE EXCEPTION 'D2 definer PUBLIC execute leak';END IF;
END $d2_objects_post$;

DO $d2_security_post$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=ANY(ARRAY['']::text[])
 AND (rolcanlogin OR rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication OR rolinherit)) THEN RAISE EXCEPTION 'D2 writer role widened';END IF;
END $d2_security_post$;
INSERT INTO supabase_migrations.schema_migrations(version) VALUES('20261122001400');
DO $d2_post$ BEGIN
 IF ARRAY(SELECT version FROM supabase_migrations.schema_migrations ORDER BY version) IS DISTINCT FROM ARRAY['20261115000000','20261115000100','20261115000200','20261115000300','20261115000400','20261115000500','20261115000600','20261116000700','20261118000800','20261118000900','20261118001000','20261119001100','20261119001200','20261120001300','20261122001400']::text[]
 THEN RAISE EXCEPTION 'D2 final history mismatch';END IF;
END $d2_post$;
COMMIT;
