-- D2 NATIVE SYNTHETIC TEST CANDIDATE ONLY. NOT A MANAGED DEPLOYMENT ARTIFACT.
-- Source: supabase/migration-drafts/20261122001500_rental_mvp.sql; raw SHA256 1e1136862b5ebe5dad9894de6695e256f9c8efa03eb08e754744c3d4317cd444
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
 IF ARRAY(SELECT version FROM supabase_migrations.schema_migrations ORDER BY version) IS DISTINCT FROM ARRAY['20261115000000','20261115000100','20261115000200','20261115000300','20261115000400','20261115000500','20261115000600','20261116000700','20261118000800','20261118000900','20261118001000','20261119001100','20261119001200','20261120001300','20261122001400']::text[]
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

GRANT SELECT(name,ice,if_number,rc,address,city,phone,email) ON tenancy.agencies TO contratpro_rental_writer;

GRANT SELECT(first_name,last_name,phone,email,nationality,identity_type,identity_number,licence_number,licence_issue_date,licence_expiry_date,address,city)
 ON tenancy.clients TO contratpro_rental_writer;

GRANT SELECT(state,registration,make,model,model_year,mileage,category,fuel_type,transmission,rental_status) ON tenancy.vehicles TO contratpro_rental_writer;

CREATE TABLE app_private.rental_drivers (
 agency_id uuid NOT NULL, contract_id uuid NOT NULL, secondary_client_id uuid,
 PRIMARY KEY(agency_id,contract_id),
 FOREIGN KEY(agency_id,contract_id) REFERENCES tenancy.rental_contracts(agency_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(agency_id,secondary_client_id) REFERENCES tenancy.clients(agency_id,id) ON DELETE RESTRICT
);

CREATE TABLE app_private.rental_document_versions (
 agency_id uuid NOT NULL, contract_id uuid NOT NULL, version integer NOT NULL CHECK(version>0), payload jsonb NOT NULL,
 PRIMARY KEY(agency_id,contract_id,version),
 FOREIGN KEY(agency_id,contract_id) REFERENCES tenancy.rental_contracts(agency_id,id) ON DELETE RESTRICT
);

ALTER TABLE app_private.rental_drivers ENABLE ROW LEVEL SECURITY;

ALTER TABLE app_private.rental_drivers FORCE ROW LEVEL SECURITY;

ALTER TABLE app_private.rental_document_versions ENABLE ROW LEVEL SECURITY;

ALTER TABLE app_private.rental_document_versions FORCE ROW LEVEL SECURITY;

REVOKE ALL ON app_private.rental_drivers,app_private.rental_document_versions FROM PUBLIC,anon,authenticated,service_role,contratpro_runtime,contratpro_platform_runtime,contratpro_agency_writer,contratpro_identity_writer;

GRANT SELECT,INSERT,UPDATE ON app_private.rental_drivers TO contratpro_rental_writer;

GRANT SELECT,INSERT ON app_private.rental_document_versions TO contratpro_rental_writer;

CREATE POLICY rental_driver_access ON app_private.rental_drivers TO contratpro_rental_writer
 USING(app_private.rental_member(agency_id) IS NOT NULL) WITH CHECK(app_private.rental_member(agency_id) IS NOT NULL);

CREATE POLICY rental_document_read ON app_private.rental_document_versions FOR SELECT TO contratpro_rental_writer
 USING(app_private.rental_member(agency_id) IS NOT NULL);

CREATE POLICY rental_document_insert ON app_private.rental_document_versions FOR INSERT TO contratpro_rental_writer
 WITH CHECK(app_private.rental_member(agency_id) IS NOT NULL);

CREATE TRIGGER rental_document_immutable BEFORE UPDATE OR DELETE ON app_private.rental_document_versions
 FOR EACH ROW EXECUTE FUNCTION app_private.rental_receipt_immutable();

CREATE FUNCTION app_private.rental_mvp_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE vehicle_state text; driver_id uuid;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF OLD.state IN('termine','annule') OR
   ROW(NEW.id,NEW.agency_id,NEW.client_id,NEW.vehicle_id,NEW.creator_membership_id,NEW.created_at)
    IS DISTINCT FROM ROW(OLD.id,OLD.agency_id,OLD.client_id,OLD.vehicle_id,OLD.creator_membership_id,OLD.created_at)
  THEN RAISE EXCEPTION 'Immutable contract' USING ERRCODE='42501'; END IF;
 END IF;
 IF TG_OP='INSERT' OR (TG_OP='UPDATE' AND NEW.state IN('confirme','en_cours') AND OLD.state<>NEW.state) THEN
  PERFORM pg_advisory_xact_lock(hashtextextended('rental:reference:'||NEW.agency_id::text||':'||NEW.vehicle_id::text,0));
  SELECT state INTO vehicle_state FROM tenancy.vehicles WHERE agency_id=NEW.agency_id AND id=NEW.vehicle_id;
  IF vehicle_state IS DISTINCT FROM 'active' THEN RAISE EXCEPTION 'Inactive vehicle' USING ERRCODE='22023'; END IF;
 END IF;
 IF TG_OP='UPDATE' AND OLD.state='brouillon' AND NEW.state='confirme' THEN
  SELECT secondary_client_id INTO driver_id FROM app_private.rental_drivers WHERE agency_id=NEW.agency_id AND contract_id=NEW.id;
  IF driver_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM tenancy.clients WHERE agency_id=NEW.agency_id AND id=driver_id AND state='active')
  THEN RAISE EXCEPTION 'Inactive driver' USING ERRCODE='22023'; END IF;
 END IF;
 RETURN NEW;
END $f$;

CREATE TRIGGER rental_mvp_guard BEFORE INSERT OR UPDATE ON tenancy.rental_contracts
 FOR EACH ROW EXECUTE FUNCTION app_private.rental_mvp_guard();

CREATE FUNCTION app_private.rental_vehicle_archive_lock() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
BEGIN
 IF NEW.state IS DISTINCT FROM OLD.state THEN
  PERFORM pg_advisory_xact_lock(hashtextextended('rental:reference:'||NEW.agency_id::text||':'||NEW.id::text,0));
 END IF;
 RETURN NEW;
END $f$;

CREATE TRIGGER rental_vehicle_archive_lock BEFORE UPDATE ON tenancy.vehicles
 FOR EACH ROW EXECUTE FUNCTION app_private.rental_vehicle_archive_lock();

CREATE FUNCTION app_private.rental_document_capture() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE base jsonb; parties jsonb; secondary uuid;
BEGIN
 IF NEW.number_serial IS NULL THEN RETURN NEW; END IF;
 SELECT payload INTO base FROM app_private.rental_document_versions
  WHERE agency_id=NEW.agency_id AND contract_id=NEW.id ORDER BY version DESC LIMIT 1;
 -- Do not invent issuance-time parties for contracts confirmed before this module.
 IF base IS NULL AND TG_OP='UPDATE' AND OLD.number_serial IS NOT NULL THEN RETURN NEW; END IF;
 IF base IS NULL THEN
  SELECT secondary_client_id INTO secondary FROM app_private.rental_drivers WHERE agency_id=NEW.agency_id AND contract_id=NEW.id;
  SELECT jsonb_build_object(
   'agency',jsonb_build_object('name',a.name,'ice',a.ice,'ifNumber',a.if_number,'rc',a.rc,'address',a.address,'city',a.city,'phone',a.phone,'email',a.email),
   'primaryDriver',app_private.rental_driver_payload(NEW.agency_id,NEW.client_id),
   'secondaryDriver',CASE WHEN secondary IS NULL THEN NULL ELSE app_private.rental_driver_payload(NEW.agency_id,secondary) END,
   'vehicle',jsonb_build_object('id',v.id,'registrationNumber',v.registration,'make',v.make,'model',v.model,'year',v.model_year,'mileage',v.mileage))
  INTO parties FROM tenancy.agencies a JOIN tenancy.vehicles v ON v.agency_id=a.id AND v.id=NEW.vehicle_id WHERE a.id=NEW.agency_id;
 ELSE parties:=base->'parties'; END IF;
 INSERT INTO app_private.rental_document_versions VALUES(NEW.agency_id,NEW.id,NEW.version,
  jsonb_build_object('schemaVersion',1,'agencyId',NEW.agency_id,'rentalId',NEW.id,'version',NEW.version,'number',NEW.contract_number,
   'parties',parties,'terms',jsonb_build_object('start',NEW.starts_at,'end',NEW.ends_at,'dailyRateMinor',NEW.daily_rate_minor::text,
    'depositMinor',NEW.deposit_minor::text,'totalMinor',NEW.total_minor::text,'billableDays',NEW.billable_days,'currency',NEW.currency,'state',NEW.state),
   'templateRevision',NULL,'signatures',jsonb_build_object('order',jsonb_build_array('agency','client'),'agency',NULL,'client',NULL),
   'evidence',NULL,'sheets',jsonb_build_object('eventKey',NEW.agency_id::text||':'||NEW.id::text||':'||NEW.version::text)));
 RETURN NEW;
END $f$;

CREATE FUNCTION app_private.rental_driver_payload(p_agency uuid,p_client uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
 SELECT jsonb_build_object('clientId',id,'fullName',first_name||' '||last_name,'identityType',identity_type,'identityNumber',identity_number,
  'drivingLicenseNumber',licence_number,'licenceIssueDate',licence_issue_date,'licenceExpiryDate',licence_expiry_date,
  'nationality',nationality,'address',address,'city',city,'phone',phone,'email',email)
 FROM tenancy.clients WHERE agency_id=p_agency AND id=p_client
$f$;

CREATE TRIGGER rental_document_capture AFTER INSERT OR UPDATE ON tenancy.rental_contracts
 FOR EACH ROW EXECUTE FUNCTION app_private.rental_document_capture();

CREATE FUNCTION public.contratpro_rental_capabilities(p_agency_id uuid) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
BEGIN
 PERFORM app_private.rental_member(p_agency_id);
 RETURN '{"contractVersion":2,"read":true,"write":true}'::jsonb;
END $f$;

CREATE FUNCTION public.contratpro_rental_detail_v2(p_agency_id uuid,p_id uuid) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE result jsonb;
BEGIN
 result:=public.contratpro_rental_detail(p_agency_id,p_id);
 IF result IS NULL THEN RETURN NULL; END IF;
 RETURN result||jsonb_build_object('daily_rate_minor',result->>'daily_rate_minor','deposit_minor',result->>'deposit_minor',
  'total_minor',result->>'total_minor','number_serial',result->>'number_serial',
  'secondaryClientId',(SELECT secondary_client_id FROM app_private.rental_drivers WHERE agency_id=p_agency_id AND contract_id=p_id));
END $f$;

CREATE FUNCTION public.contratpro_rental_document(p_agency_id uuid,p_id uuid) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
BEGIN
 PERFORM app_private.rental_member(p_agency_id);
 RETURN (SELECT payload FROM app_private.rental_document_versions WHERE agency_id=p_agency_id AND contract_id=p_id ORDER BY version DESC LIMIT 1);
END $f$;

CREATE FUNCTION public.contratpro_rental_set_driver(p_agency_id uuid,p_id uuid,p_version integer,p_request_id uuid,p_client_id uuid) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE r tenancy.rental_contracts; actor uuid;
BEGIN
 actor:=app_private.rental_member(p_agency_id);
 IF p_request_id IS NULL OR p_version IS NULL OR p_version NOT BETWEEN 1 AND 2147483646 THEN RAISE EXCEPTION 'Invalid version' USING ERRCODE='22023'; END IF;
 SELECT * INTO r FROM tenancy.rental_contracts WHERE agency_id=p_agency_id AND id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Not found' USING ERRCODE='P0002'; END IF;
 IF r.version<>p_version THEN RAISE EXCEPTION 'Stale version' USING ERRCODE='40001'; END IF;
 IF r.state<>'brouillon' THEN RAISE EXCEPTION 'Immutable driver' USING ERRCODE='22023'; END IF;
 IF p_client_id IS NOT NULL AND (p_client_id=r.client_id OR NOT EXISTS(SELECT 1 FROM tenancy.clients WHERE agency_id=p_agency_id AND id=p_client_id AND state='active'))
 THEN RAISE EXCEPTION 'Invalid driver' USING ERRCODE='22023'; END IF;
 INSERT INTO app_private.rental_drivers VALUES(p_agency_id,p_id,p_client_id)
 ON CONFLICT(agency_id,contract_id) DO UPDATE SET secondary_client_id=EXCLUDED.secondary_client_id;
 UPDATE tenancy.rental_contracts SET version=version+1,updated_at=clock_timestamp() WHERE agency_id=p_agency_id AND id=p_id RETURNING * INTO r;
 INSERT INTO tenancy.audit_events(agency_id,actor_membership_id,action,request_id,metadata)
 VALUES(p_agency_id,actor,'rentals.driver',p_request_id,jsonb_build_object('contractId',p_id,'version',r.version));
 RETURN jsonb_build_object('id',r.id,'version',r.version,'state',r.state,'number',r.contract_number);
END $f$;

CREATE FUNCTION public.contratpro_rental_choices(p_agency_id uuid,p_kind text,p_search text,p_page integer) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE result jsonb;
BEGIN
 PERFORM app_private.rental_member(p_agency_id);
 IF p_kind IS NULL OR p_kind NOT IN('client','vehicle') OR p_search IS NULL OR length(p_search)>100
 OR p_search ~ '[[:cntrl:]]' OR p_page IS NULL OR p_page NOT BETWEEN 1 AND 10000 THEN RAISE EXCEPTION 'Invalid choices' USING ERRCODE='22023'; END IF;
 WITH choices AS (
  SELECT id,first_name||' '||last_name AS label FROM tenancy.clients WHERE p_kind='client' AND agency_id=p_agency_id AND state='active'
  UNION ALL SELECT id,registration||' · '||make||' '||model FROM tenancy.vehicles WHERE p_kind='vehicle' AND agency_id=p_agency_id AND state='active'
 ), filtered AS (SELECT * FROM choices WHERE strpos(lower(label),lower(p_search))>0),
 page AS (SELECT * FROM filtered ORDER BY label,id LIMIT 20 OFFSET(p_page-1)*20)
 SELECT jsonb_build_object('items',COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY label,id) FROM page p),'[]'::jsonb),'total',(SELECT count(*) FROM filtered)) INTO result;
 RETURN result;
END $f$;

GRANT CREATE ON SCHEMA app_private,public TO contratpro_rental_writer;

DO $owners$
DECLARE signature text;
BEGIN
 FOREACH signature IN ARRAY ARRAY[
  'app_private.rental_mvp_guard()', 'app_private.rental_vehicle_archive_lock()', 'app_private.rental_document_capture()', 'app_private.rental_driver_payload(uuid,uuid)',
  'public.contratpro_rental_capabilities(uuid)', 'public.contratpro_rental_detail_v2(uuid,uuid)',
  'public.contratpro_rental_document(uuid,uuid)', 'public.contratpro_rental_set_driver(uuid,uuid,integer,uuid,uuid)',
  'public.contratpro_rental_choices(uuid,text,text,integer)'] LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role,contratpro_runtime,contratpro_platform_runtime,contratpro_agency_writer,contratpro_identity_writer',signature);
  EXECUTE format('ALTER FUNCTION %s OWNER TO contratpro_rental_writer',signature);
  IF signature LIKE 'public.%' THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',signature); END IF;
 END LOOP;
END $owners$;

REVOKE CREATE ON SCHEMA app_private,public FROM contratpro_rental_writer;

DO $acl$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_class c,
  LATERAL pg_catalog.aclexplode(COALESCE(c.relacl,pg_catalog.acldefault('r',c.relowner))) a
  WHERE c.oid IN('app_private.rental_drivers'::regclass,'app_private.rental_document_versions'::regclass)
   AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity OR c.relowner<>'postgres'::regrole
    OR (a.grantee<>c.relowner AND NOT(a.grantee='contratpro_rental_writer'::regrole AND NOT a.is_grantable
      AND (a.privilege_type IN('SELECT','INSERT') OR (c.oid='app_private.rental_drivers'::regclass AND a.privilege_type='UPDATE'))))))
 OR EXISTS(SELECT 1 FROM pg_catalog.pg_proc p,
  LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
  WHERE p.oid IN('app_private.rental_mvp_guard()'::regprocedure,'app_private.rental_vehicle_archive_lock()'::regprocedure,
   'app_private.rental_document_capture()'::regprocedure,'app_private.rental_driver_payload(uuid,uuid)'::regprocedure,
   'public.contratpro_rental_capabilities(uuid)'::regprocedure,'public.contratpro_rental_detail_v2(uuid,uuid)'::regprocedure,
   'public.contratpro_rental_document(uuid,uuid)'::regprocedure,'public.contratpro_rental_set_driver(uuid,uuid,integer,uuid,uuid)'::regprocedure,
   'public.contratpro_rental_choices(uuid,text,text,integer)'::regprocedure)
   AND (p.proowner<>'contratpro_rental_writer'::regrole OR (a.grantee<>p.proowner AND NOT(p.pronamespace='public'::regnamespace
    AND a.grantee='authenticated'::regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable))))
 THEN RAISE EXCEPTION 'Rental MVP ACL mismatch'; END IF;
END $acl$;
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
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.rental_drivers'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.rental_document_versions'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.rental_drivers'::regclass AND relrowsecurity) THEN RAISE EXCEPTION 'D2 declared RLS invariant missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.rental_drivers'::regclass AND relforcerowsecurity) THEN RAISE EXCEPTION 'D2 declared RLS invariant missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.rental_document_versions'::regclass AND relrowsecurity) THEN RAISE EXCEPTION 'D2 declared RLS invariant missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.rental_document_versions'::regclass AND relforcerowsecurity) THEN RAISE EXCEPTION 'D2 declared RLS invariant missing';END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace,
 LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
 WHERE (n.nspname||'.'||p.proname)=ANY(ARRAY['app_private.rental_mvp_guard','app_private.rental_vehicle_archive_lock','app_private.rental_document_capture','app_private.rental_driver_payload','public.contratpro_rental_capabilities','public.contratpro_rental_detail_v2','public.contratpro_rental_document','public.contratpro_rental_set_driver','public.contratpro_rental_choices']::text[]) AND p.prosecdef AND a.grantee=0 AND a.privilege_type='EXECUTE') THEN RAISE EXCEPTION 'D2 definer PUBLIC execute leak';END IF;
END $d2_objects_post$;

DO $d2_security_post$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=ANY(ARRAY['contratpro_rental_writer']::text[])
 AND (rolcanlogin OR rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication OR rolinherit)) THEN RAISE EXCEPTION 'D2 writer role widened';END IF;
END $d2_security_post$;
INSERT INTO supabase_migrations.schema_migrations(version) VALUES('20261122001500');
DO $d2_post$ BEGIN
 IF ARRAY(SELECT version FROM supabase_migrations.schema_migrations ORDER BY version) IS DISTINCT FROM ARRAY['20261115000000','20261115000100','20261115000200','20261115000300','20261115000400','20261115000500','20261115000600','20261116000700','20261118000800','20261118000900','20261118001000','20261119001100','20261119001200','20261120001300','20261122001400','20261122001500']::text[]
 THEN RAISE EXCEPTION 'D2 final history mismatch';END IF;
END $d2_post$;
COMMIT;
