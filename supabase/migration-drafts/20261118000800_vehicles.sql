-- UNDEPLOYED vehicle persistence draft, outside both frozen migration inventories.
-- Promote to a reviewed native migration only
-- after separate authorization. Requires canonical identity/agency migrations 0000-0007.
-- No new tenant model or privileged write RPC; all helpers use the caller's RLS.
DO $guard$
BEGIN
 IF session_user<>'postgres' OR current_user<>'postgres' THEN RAISE EXCEPTION 'Migration identity mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='authenticated' AND (rolsuper OR rolbypassrls)) THEN RAISE EXCEPTION 'Restricted role required'; END IF;
END;
$guard$;
INSERT INTO tenancy.permissions(key,description) VALUES
 ('vehicles.read','Read agency vehicles'),('vehicles.create','Create agency vehicles'),('vehicles.update','Update agency vehicles')
 ON CONFLICT(key) DO NOTHING;

CREATE FUNCTION app_private.vehicle_allowed(target uuid, capability text) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $f$
 SELECT capability IN ('vehicles.read','vehicles.create','vehicles.update')
 AND EXISTS(SELECT 1 FROM tenancy.agencies a WHERE a.id=target AND a.state='active')
 AND (app_private.agency_owner(target) OR EXISTS(
   SELECT 1 FROM tenancy.memberships m JOIN tenancy.membership_roles mr ON mr.agency_id=m.agency_id AND mr.membership_id=m.id
   JOIN tenancy.role_permissions rp ON rp.agency_id=mr.agency_id AND rp.role_id=mr.role_id
   WHERE m.agency_id=target AND m.user_id=app_private.canonical_auth_user() AND m.state='active' AND rp.permission_key=capability))
$f$;
CREATE TABLE tenancy.vehicles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 agency_id uuid NOT NULL REFERENCES tenancy.agencies(id) ON DELETE RESTRICT,
 registration text NOT NULL CHECK(length(registration) BETWEEN 1 AND 24),
 registration_key text GENERATED ALWAYS AS (upper(registration)) STORED,
 make text NOT NULL CHECK(length(make) BETWEEN 1 AND 80),
 model text NOT NULL CHECK(length(model) BETWEEN 1 AND 80),
 model_year integer NOT NULL CHECK(model_year BETWEEN 1900 AND 9999),
 mileage integer NOT NULL CHECK(mileage BETWEEN 0 AND 9999999),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 creation_key uuid NOT NULL,
 created_by_user_id uuid NOT NULL DEFAULT app_private.canonical_auth_user() REFERENCES identity.users(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT vehicles_tenant_id_unique UNIQUE(agency_id,id),
 CONSTRAINT vehicles_creation_unique UNIQUE(agency_id,creation_key),
 CONSTRAINT vehicles_registration_unique UNIQUE(agency_id,registration_key)
);
CREATE INDEX vehicles_agency_order ON tenancy.vehicles(agency_id,created_at,id);
ALTER TABLE tenancy.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenancy.vehicles FORCE ROW LEVEL SECURITY;
REVOKE ALL ON tenancy.vehicles FROM PUBLIC,anon,authenticated,service_role,contratpro_runtime,contratpro_platform_runtime;
GRANT SELECT ON tenancy.vehicles TO authenticated;
GRANT INSERT(agency_id,creation_key,registration,make,model,model_year,mileage) ON tenancy.vehicles TO authenticated;
GRANT UPDATE(registration,make,model,model_year,mileage) ON tenancy.vehicles TO authenticated;
CREATE POLICY vehicles_read ON tenancy.vehicles FOR SELECT TO authenticated
 USING(app_private.vehicle_allowed(agency_id,'vehicles.read'));
CREATE POLICY vehicles_create ON tenancy.vehicles FOR INSERT TO authenticated
 WITH CHECK(app_private.vehicle_allowed(agency_id,'vehicles.read') AND app_private.vehicle_allowed(agency_id,'vehicles.create'));
CREATE POLICY vehicles_update ON tenancy.vehicles FOR UPDATE TO authenticated
 USING(app_private.vehicle_allowed(agency_id,'vehicles.read') AND app_private.vehicle_allowed(agency_id,'vehicles.update'))
 WITH CHECK(app_private.vehicle_allowed(agency_id,'vehicles.read') AND app_private.vehicle_allowed(agency_id,'vehicles.update'));

CREATE FUNCTION app_private.vehicle_payload(p tenancy.vehicles) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $f$
 SELECT jsonb_build_object('registration',p.registration,'make',p.make,'model',p.model,'year',p.model_year::text,'mileage',p.mileage::text)
$f$;
CREATE FUNCTION app_private.valid_vehicle(p jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $f$
BEGIN
 IF p IS NULL OR jsonb_typeof(p)<>'object' THEN RETURN false; END IF;
 IF (SELECT count(*) FROM jsonb_each(p))<>5 OR EXISTS(SELECT 1 FROM jsonb_each(p) e
   WHERE e.key NOT IN ('registration','make','model','year','mileage') OR jsonb_typeof(e.value)<>'string'
   OR (e.value #>> '{}') ~ '[[:cntrl:]]'
   OR (e.value #>> '{}') ~ U&'[\202A-\202E\2066-\2069]') THEN RETURN false; END IF;
 IF COALESCE(length(btrim(p->>'registration')),0) NOT BETWEEN 1 AND 24
 OR btrim(p->>'registration') !~ '^[[:alnum:]][[:alnum:] /-]*$'
 OR COALESCE(length(btrim(p->>'make')),0) NOT BETWEEN 1 AND 80
 OR COALESCE(length(btrim(p->>'model')),0) NOT BETWEEN 1 AND 80
 OR COALESCE(p->>'year','') !~ '^[0-9]{4}$'
 OR COALESCE(p->>'mileage','') !~ '^(0|[1-9][0-9]{0,6})$' THEN RETURN false; END IF;
 RETURN (p->>'year')::integer BETWEEN 1900 AND extract(year FROM now() AT TIME ZONE 'UTC')::integer+1;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RETURN false;
END;
$f$;
CREATE FUNCTION app_private.vehicle_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $f$
BEGIN
 IF app_private.canonical_auth_user() IS NULL OR NOT app_private.vehicle_allowed(NEW.agency_id,'vehicles.read')
 OR NOT app_private.vehicle_allowed(NEW.agency_id,CASE WHEN TG_OP='INSERT' THEN 'vehicles.create' ELSE 'vehicles.update' END)
 THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
 IF NOT app_private.valid_vehicle(app_private.vehicle_payload(NEW))
 OR NEW.registration<>btrim(NEW.registration) OR NEW.make<>btrim(NEW.make) OR NEW.model<>btrim(NEW.model)
 THEN RAISE EXCEPTION 'Invalid vehicle fields' USING ERRCODE='22023'; END IF;
 IF TG_OP='INSERT' THEN
   IF NEW.created_by_user_id IS DISTINCT FROM app_private.canonical_auth_user() OR NEW.version<>1
   THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
 ELSE
   IF ROW(NEW.id,NEW.agency_id,NEW.creation_key,NEW.created_by_user_id,NEW.created_at)
     IS DISTINCT FROM ROW(OLD.id,OLD.agency_id,OLD.creation_key,OLD.created_by_user_id,OLD.created_at)
   THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
   NEW.version:=OLD.version+1;
 END IF;
 NEW.updated_at:=statement_timestamp(); RETURN NEW;
END;
$f$;
CREATE TRIGGER vehicles_guard BEFORE INSERT OR UPDATE ON tenancy.vehicles FOR EACH ROW EXECUTE FUNCTION app_private.vehicle_guard();

CREATE FUNCTION public.contratpro_vehicles_permissions(p_agency_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $f$
 SELECT jsonb_build_object('read',app_private.vehicle_allowed(p_agency_id,'vehicles.read'),
 'create',app_private.vehicle_allowed(p_agency_id,'vehicles.read') AND app_private.vehicle_allowed(p_agency_id,'vehicles.create'),
 'update',app_private.vehicle_allowed(p_agency_id,'vehicles.read') AND app_private.vehicle_allowed(p_agency_id,'vehicles.update'))
$f$;
CREATE FUNCTION public.contratpro_vehicles_list(p_agency_id uuid,p_page integer) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $f$
DECLARE result jsonb;
BEGIN
 IF NOT app_private.vehicle_allowed(p_agency_id,'vehicles.read') THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
 IF p_page IS NULL OR p_page NOT BETWEEN 1 AND 10000 THEN RAISE EXCEPTION 'Invalid page' USING ERRCODE='22023'; END IF;
 WITH filtered AS (SELECT v.* FROM tenancy.vehicles v WHERE v.agency_id=p_agency_id),
 page AS (SELECT * FROM filtered ORDER BY created_at DESC,id LIMIT 20 OFFSET (p_page-1)*20)
 SELECT jsonb_build_object('total',(SELECT count(*) FROM filtered),'items',COALESCE((SELECT jsonb_agg(
 jsonb_build_object('registration',p.registration,'make',p.make,'model',p.model,'year',p.model_year::text,'mileage',p.mileage::text,'id',p.id,'agencyId',p.agency_id,'version',p.version)
 ORDER BY p.created_at DESC,p.id) FROM page p),'[]'::jsonb)) INTO result;
 RETURN result;
END;
$f$;
CREATE FUNCTION public.contratpro_vehicle_detail(p_agency_id uuid,p_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $f$
 SELECT app_private.vehicle_payload(v)||jsonb_build_object('id',v.id,'agencyId',v.agency_id,'version',v.version)
 FROM tenancy.vehicles v WHERE v.agency_id=p_agency_id AND v.id=p_id
$f$;
CREATE FUNCTION public.contratpro_vehicle_create(p_agency_id uuid,p_key uuid,p_details jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $f$
DECLARE vid uuid; existing tenancy.vehicles;
BEGIN
 IF NOT app_private.vehicle_allowed(p_agency_id,'vehicles.read') OR NOT app_private.vehicle_allowed(p_agency_id,'vehicles.create') THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
 IF p_key IS NULL OR NOT app_private.valid_vehicle(p_details) THEN RAISE EXCEPTION 'Invalid vehicle fields' USING ERRCODE='22023'; END IF;
 -- Serialize only this agency/idempotency pair; no retry or unrelated identity lock.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_agency_id::text||':'||p_key::text,0));
 SELECT * INTO existing FROM tenancy.vehicles WHERE agency_id=p_agency_id AND creation_key=p_key;
 IF FOUND THEN
   IF existing.created_by_user_id IS DISTINCT FROM app_private.canonical_auth_user() OR app_private.vehicle_payload(existing) IS DISTINCT FROM p_details
   THEN RAISE EXCEPTION 'Vehicle changed' USING ERRCODE='40001'; END IF;
   RETURN existing.id;
 END IF;
 INSERT INTO tenancy.vehicles(agency_id,creation_key,registration,make,model,model_year,mileage)
 VALUES(p_agency_id,p_key,btrim(p_details->>'registration'),btrim(p_details->>'make'),btrim(p_details->>'model'),(p_details->>'year')::integer,(p_details->>'mileage')::integer)
 RETURNING id INTO vid;
 RETURN vid;
END;
$f$;
CREATE FUNCTION public.contratpro_vehicle_update(p_agency_id uuid,p_id uuid,p_version integer,p_details jsonb) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $f$
DECLARE current_version integer;
BEGIN
 IF NOT app_private.vehicle_allowed(p_agency_id,'vehicles.read') OR NOT app_private.vehicle_allowed(p_agency_id,'vehicles.update') THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
 IF p_version IS NULL OR p_version<1 OR NOT app_private.valid_vehicle(p_details) THEN RAISE EXCEPTION 'Invalid vehicle fields' USING ERRCODE='22023'; END IF;
 SELECT version INTO current_version FROM tenancy.vehicles WHERE agency_id=p_agency_id AND id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Vehicle unavailable' USING ERRCODE='P0002'; END IF;
 IF current_version<>p_version THEN RAISE EXCEPTION 'Vehicle changed' USING ERRCODE='40001'; END IF;
 UPDATE tenancy.vehicles SET registration=btrim(p_details->>'registration'),make=btrim(p_details->>'make'),model=btrim(p_details->>'model'),
 model_year=(p_details->>'year')::integer,mileage=(p_details->>'mileage')::integer
 WHERE agency_id=p_agency_id AND id=p_id AND version=p_version;
 IF NOT FOUND THEN RAISE EXCEPTION 'Vehicle changed' USING ERRCODE='40001'; END IF;
 RETURN true;
END;
$f$;

REVOKE ALL ON FUNCTION app_private.vehicle_allowed(uuid,text),app_private.vehicle_payload(tenancy.vehicles),app_private.valid_vehicle(jsonb),app_private.vehicle_guard(),
 public.contratpro_vehicles_permissions(uuid),public.contratpro_vehicles_list(uuid,integer),public.contratpro_vehicle_detail(uuid,uuid),
 public.contratpro_vehicle_create(uuid,uuid,jsonb),public.contratpro_vehicle_update(uuid,uuid,integer,jsonb)
 FROM PUBLIC,anon,authenticated,service_role,contratpro_runtime,contratpro_platform_runtime;
GRANT EXECUTE ON FUNCTION app_private.vehicle_allowed(uuid,text),app_private.vehicle_payload(tenancy.vehicles),app_private.valid_vehicle(jsonb),app_private.vehicle_guard(),
 public.contratpro_vehicles_permissions(uuid),public.contratpro_vehicles_list(uuid,integer),public.contratpro_vehicle_detail(uuid,uuid),
 public.contratpro_vehicle_create(uuid,uuid,jsonb),public.contratpro_vehicle_update(uuid,uuid,integer,jsonb) TO authenticated;
DO $acl$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='tenancy.vehicles'::regclass AND (NOT relrowsecurity OR NOT relforcerowsecurity OR relowner<>'postgres'::regrole))
 OR EXISTS(SELECT 1 FROM pg_catalog.pg_class c,LATERAL pg_catalog.aclexplode(COALESCE(c.relacl,pg_catalog.acldefault('r',c.relowner))) a
   WHERE c.oid='tenancy.vehicles'::regclass AND a.grantee<>c.relowner AND NOT(a.grantee='authenticated'::regrole AND a.privilege_type='SELECT' AND NOT a.is_grantable))
 OR EXISTS(SELECT 1 FROM pg_catalog.pg_attribute col JOIN pg_catalog.pg_class c ON c.oid=col.attrelid,
   LATERAL pg_catalog.aclexplode(col.attacl) a
   WHERE c.oid='tenancy.vehicles'::regclass AND col.attnum>0 AND NOT col.attisdropped AND a.grantee<>c.relowner
   AND NOT(a.grantee='authenticated'::regrole AND NOT a.is_grantable AND
     ((a.privilege_type='INSERT' AND col.attname IN ('agency_id','creation_key','registration','make','model','model_year','mileage'))
       OR (a.privilege_type='UPDATE' AND col.attname IN ('registration','make','model','model_year','mileage')))))
 OR EXISTS(SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace,
   LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
   WHERE ((n.nspname='public' AND p.proname IN ('contratpro_vehicles_permissions','contratpro_vehicles_list','contratpro_vehicle_detail','contratpro_vehicle_create','contratpro_vehicle_update'))
     OR (n.nspname='app_private' AND p.proname IN ('vehicle_allowed','vehicle_payload','valid_vehicle','vehicle_guard')))
   AND (p.prosecdef OR p.proowner<>'postgres'::regrole OR (a.grantee<>p.proowner AND NOT(a.grantee='authenticated'::regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable))))
 THEN RAISE EXCEPTION 'Vehicle capability boundary mismatch'; END IF;
END;
$acl$;
