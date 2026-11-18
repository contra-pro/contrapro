-- P3.1 DRAFT ONLY. Requires native migrations 0001-0005. No execution authorized.
-- All application RPCs and trigger helpers are SECURITY INVOKER, subject to FORCE RLS.
DO $guard$
BEGIN
 IF session_user<>'postgres' OR current_user<>'postgres' THEN RAISE EXCEPTION 'Migration identity mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='authenticated' AND (rolsuper OR rolbypassrls)) THEN RAISE EXCEPTION 'Restricted role required'; END IF;
END;
$guard$;
INSERT INTO tenancy.permissions(key,description) VALUES
 ('clients.read','Read active agency clients'),('clients.create','Create agency clients'),
 ('clients.update','Update active agency clients'),('clients.archive','Archive active agency clients')
 ON CONFLICT(key) DO NOTHING;

CREATE FUNCTION app_private.client_allowed(target uuid, capability text) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $f$
 SELECT capability IN ('clients.read','clients.create','clients.update','clients.archive')
 AND EXISTS(SELECT 1 FROM tenancy.agencies a WHERE a.id=target AND a.state='active')
 AND (app_private.agency_owner(target) OR EXISTS(
   SELECT 1 FROM tenancy.memberships m JOIN tenancy.membership_roles mr ON mr.agency_id=m.agency_id AND mr.membership_id=m.id
   JOIN tenancy.role_permissions rp ON rp.agency_id=mr.agency_id AND rp.role_id=mr.role_id
   WHERE m.agency_id=target AND m.user_id=app_private.canonical_auth_user() AND m.state='active' AND rp.permission_key=capability))
$f$;

CREATE TABLE tenancy.clients (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 agency_id uuid NOT NULL REFERENCES tenancy.agencies(id) ON DELETE RESTRICT,
 first_name text NOT NULL CHECK(length(first_name) BETWEEN 1 AND 100),
 last_name text NOT NULL CHECK(length(last_name) BETWEEN 1 AND 100),
 phone text NOT NULL CHECK(phone ~ '^\+?[0-9]{8,15}$'),
 email text NOT NULL DEFAULT '' CHECK(length(email)<=320),
 nationality text NOT NULL DEFAULT '' CHECK(length(nationality)<=80),
 identity_type text NOT NULL DEFAULT 'none' CHECK(identity_type IN ('none','cin','passport')),
 identity_number text NOT NULL DEFAULT '' CHECK(length(identity_number)<=30),
 licence_number text NOT NULL DEFAULT '' CHECK(length(licence_number)<=40),
 licence_issue_date date,
 licence_expiry_date date,
 address text NOT NULL DEFAULT '' CHECK(length(address)<=400),
 city text NOT NULL DEFAULT '' CHECK(length(city)<=100),
 notes text NOT NULL DEFAULT '' CHECK(length(notes)<=2000),
 state text NOT NULL DEFAULT 'active' CHECK(state IN ('active','archived')),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 creation_key uuid NOT NULL,
 created_by_user_id uuid NOT NULL DEFAULT app_private.canonical_auth_user() REFERENCES identity.users(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT clients_tenant_id_unique UNIQUE(agency_id,id),
 CONSTRAINT clients_creation_unique UNIQUE(agency_id,creation_key),
 CONSTRAINT clients_licence_dates CHECK((licence_number='' AND licence_issue_date IS NULL AND licence_expiry_date IS NULL)
   OR (licence_number<>'' AND licence_issue_date IS NOT NULL AND licence_expiry_date IS NOT NULL AND licence_expiry_date>=licence_issue_date))
);
CREATE INDEX clients_agency_active_name ON tenancy.clients(agency_id,state,last_name,first_name,id);
CREATE INDEX clients_agency_identity_type ON tenancy.clients(agency_id,state,identity_type,id);
ALTER TABLE tenancy.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenancy.clients FORCE ROW LEVEL SECURITY;
REVOKE ALL ON tenancy.clients FROM PUBLIC,anon,authenticated,service_role,contratpro_runtime,contratpro_platform_runtime;
GRANT SELECT ON tenancy.clients TO authenticated;
GRANT INSERT(agency_id,creation_key,first_name,last_name,phone,email,nationality,identity_type,identity_number,
 licence_number,licence_issue_date,licence_expiry_date,address,city,notes) ON tenancy.clients TO authenticated;
GRANT UPDATE(first_name,last_name,phone,email,nationality,identity_type,identity_number,licence_number,
 licence_issue_date,licence_expiry_date,address,city,notes,state) ON tenancy.clients TO authenticated;
CREATE POLICY clients_read ON tenancy.clients FOR SELECT TO authenticated
 USING(state='active' AND app_private.client_allowed(agency_id,'clients.read'));
CREATE POLICY clients_create ON tenancy.clients FOR INSERT TO authenticated
 WITH CHECK(state='active' AND app_private.client_allowed(agency_id,'clients.read') AND app_private.client_allowed(agency_id,'clients.create'));
CREATE POLICY clients_update ON tenancy.clients FOR UPDATE TO authenticated
 USING(state='active' AND app_private.client_allowed(agency_id,'clients.read')
   AND (app_private.client_allowed(agency_id,'clients.update') OR app_private.client_allowed(agency_id,'clients.archive')))
 WITH CHECK(app_private.client_allowed(agency_id,'clients.read') AND state IN ('active','archived'));

CREATE FUNCTION app_private.client_payload(p tenancy.clients) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $f$
 SELECT jsonb_build_object('firstName',p.first_name,'lastName',p.last_name,'phone',p.phone,'email',p.email,
 'nationality',p.nationality,'identityType',p.identity_type,'identityNumber',p.identity_number,'licenceNumber',p.licence_number,
 'licenceIssueDate',COALESCE(to_char(p.licence_issue_date,'YYYY-MM-DD'),''),'licenceExpiryDate',COALESCE(to_char(p.licence_expiry_date,'YYYY-MM-DD'),''),
 'address',p.address,'city',p.city,'notes',p.notes)
$f$;
CREATE FUNCTION app_private.valid_client(p jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $f$
DECLARE issued date; expires date;
BEGIN
 IF p IS NULL OR jsonb_typeof(p)<>'object' THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each(p) e WHERE e.key NOT IN
   ('firstName','lastName','phone','email','nationality','identityType','identityNumber','licenceNumber','licenceIssueDate','licenceExpiryDate','address','city','notes')
   OR jsonb_typeof(e.value)<>'string'
   OR (e.key<>'notes' AND (e.value #>> '{}') ~ '[[:cntrl:]]')) THEN RETURN false; END IF;
 IF COALESCE(length(btrim(p->>'firstName')),0) NOT BETWEEN 1 AND 100 OR COALESCE(length(btrim(p->>'lastName')),0) NOT BETWEEN 1 AND 100
   OR COALESCE(p->>'phone','') !~ '^\+?[0-9]{8,15}$' OR length(COALESCE(p->>'email',''))>320
   OR (COALESCE(p->>'email','')<>'' AND (p->>'email') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
   OR length(COALESCE(p->>'nationality',''))>80 OR length(COALESCE(p->>'address',''))>400 OR length(COALESCE(p->>'city',''))>100
   OR length(COALESCE(p->>'notes',''))>2000 OR COALESCE(p->>'identityType','none') NOT IN ('none','cin','passport') THEN RETURN false; END IF;
 IF (COALESCE(p->>'identityType','none')='none' AND COALESCE(p->>'identityNumber','')<>'')
   OR (p->>'identityType'='cin' AND upper(COALESCE(p->>'identityNumber','')) !~ '^[A-Z0-9]{4,20}$')
   OR (p->>'identityType'='passport' AND upper(COALESCE(p->>'identityNumber','')) !~ '^[A-Z0-9-]{4,30}$') THEN RETURN false; END IF;
 IF COALESCE(p->>'licenceNumber','')='' THEN
   RETURN COALESCE(p->>'licenceIssueDate','')='' AND COALESCE(p->>'licenceExpiryDate','')='';
 END IF;
 IF upper(p->>'licenceNumber') !~ '^[A-Z0-9][A-Z0-9 /-]{2,39}$'
   OR COALESCE(p->>'licenceIssueDate','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
   OR COALESCE(p->>'licenceExpiryDate','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN RETURN false; END IF;
 issued:=(p->>'licenceIssueDate')::date; expires:=(p->>'licenceExpiryDate')::date;
 RETURN issued BETWEEN DATE '1900-01-01' AND DATE '2199-12-31' AND expires BETWEEN DATE '1900-01-01' AND DATE '2199-12-31'
   AND issued<=(now() AT TIME ZONE 'UTC')::date AND expires>=issued
   AND to_char(issued,'YYYY-MM-DD')=p->>'licenceIssueDate' AND to_char(expires,'YYYY-MM-DD')=p->>'licenceExpiryDate';
EXCEPTION WHEN datetime_field_overflow OR invalid_datetime_format OR invalid_text_representation THEN RETURN false;
END;
$f$;

-- Column grants alone cannot distinguish update from archive. This invoker trigger
-- enforces both capabilities on direct table writes too; archived rows never restore.
CREATE FUNCTION app_private.client_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $f$
BEGIN
 IF app_private.canonical_auth_user() IS NULL OR NOT app_private.client_allowed(NEW.agency_id,'clients.read') THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
 IF TG_OP='INSERT' AND NOT app_private.client_allowed(NEW.agency_id,'clients.create') THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
 IF NOT app_private.valid_client(app_private.client_payload(NEW)) THEN RAISE EXCEPTION 'Invalid client fields' USING ERRCODE='22023'; END IF;
 IF TG_OP='INSERT' THEN
   IF NEW.state<>'active' OR NEW.created_by_user_id IS DISTINCT FROM app_private.canonical_auth_user() THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
 ELSE
   IF OLD.state<>'active' OR ROW(NEW.id,NEW.agency_id,NEW.creation_key,NEW.created_by_user_id,NEW.created_at)
     IS DISTINCT FROM ROW(OLD.id,OLD.agency_id,OLD.creation_key,OLD.created_by_user_id,OLD.created_at) THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
   IF (NEW.state=OLD.state OR app_private.client_payload(NEW) IS DISTINCT FROM app_private.client_payload(OLD))
     AND NOT app_private.client_allowed(OLD.agency_id,'clients.update') THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
   IF NEW.state<>OLD.state AND (NEW.state<>'archived' OR NOT app_private.client_allowed(OLD.agency_id,'clients.archive')) THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
   NEW.version:=OLD.version+1;
 END IF;
 NEW.updated_at:=statement_timestamp(); RETURN NEW;
END;
$f$;
CREATE TRIGGER clients_guard BEFORE INSERT OR UPDATE ON tenancy.clients FOR EACH ROW EXECUTE FUNCTION app_private.client_guard();

CREATE FUNCTION public.contratpro_clients_permissions(p_agency_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $f$
 SELECT jsonb_build_object('read',app_private.client_allowed(p_agency_id,'clients.read'),
 'create',app_private.client_allowed(p_agency_id,'clients.read') AND app_private.client_allowed(p_agency_id,'clients.create'),
 'update',app_private.client_allowed(p_agency_id,'clients.read') AND app_private.client_allowed(p_agency_id,'clients.update'),
 'archive',app_private.client_allowed(p_agency_id,'clients.read') AND app_private.client_allowed(p_agency_id,'clients.archive'))
$f$;
CREATE FUNCTION public.contratpro_clients_list(p_agency_id uuid,p_search text,p_type text,p_page integer,p_size integer) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $f$
DECLARE result jsonb;
BEGIN
 IF NOT app_private.client_allowed(p_agency_id,'clients.read') THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
 IF p_search IS NULL OR length(p_search)>100 OR p_type IS NULL OR p_type NOT IN ('all','none','cin','passport') OR p_page IS NULL OR p_page NOT BETWEEN 1 AND 10000 OR p_size IS NULL OR p_size NOT IN (10,20,50) THEN RAISE EXCEPTION 'Invalid search' USING ERRCODE='22023'; END IF;
 WITH filtered AS (SELECT c.id,c.first_name,c.last_name,c.phone,c.email,c.city,c.identity_type,c.state FROM tenancy.clients c
   WHERE c.agency_id=p_agency_id AND c.state='active' AND (p_type='all' OR c.identity_type=p_type)
   AND (p_search='' OR strpos(lower(c.first_name||' '||c.last_name||' '||c.phone||' '||c.email),lower(p_search))>0)),
 page AS (SELECT * FROM filtered ORDER BY last_name,first_name,id LIMIT p_size OFFSET (p_page-1)*p_size)
 SELECT jsonb_build_object('total',(SELECT count(*) FROM filtered),'items',COALESCE((SELECT jsonb_agg(jsonb_build_object(
   'id',id,'agencyId',p_agency_id,'state',state,'firstName',first_name,'lastName',last_name,'phone',phone,'email',email,'city',city,'identityType',identity_type)
   ORDER BY last_name,first_name,id) FROM page),'[]'::jsonb)) INTO result;
 RETURN result;
END;
$f$;
CREATE FUNCTION public.contratpro_client_detail(p_agency_id uuid,p_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $f$
 SELECT app_private.client_payload(c)||jsonb_build_object('id',c.id,'agencyId',c.agency_id,'state',c.state,'version',c.version)
 FROM tenancy.clients c WHERE c.agency_id=p_agency_id AND c.id=p_id AND c.state='active'
$f$;
CREATE FUNCTION public.contratpro_client_create(p_agency_id uuid,p_key uuid,p_details jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $f$
DECLARE cid uuid;
BEGIN
 IF NOT app_private.client_allowed(p_agency_id,'clients.read') OR NOT app_private.client_allowed(p_agency_id,'clients.create') THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
 IF p_key IS NULL OR NOT app_private.valid_client(p_details) THEN RAISE EXCEPTION 'Invalid client fields' USING ERRCODE='22023'; END IF;
 INSERT INTO tenancy.clients(agency_id,creation_key,first_name,last_name,phone,email,nationality,identity_type,identity_number,licence_number,licence_issue_date,licence_expiry_date,address,city,notes)
 VALUES(p_agency_id,p_key,btrim(p_details->>'firstName'),btrim(p_details->>'lastName'),p_details->>'phone',lower(COALESCE(p_details->>'email','')),
 COALESCE(p_details->>'nationality',''),COALESCE(p_details->>'identityType','none'),upper(COALESCE(p_details->>'identityNumber','')),upper(COALESCE(p_details->>'licenceNumber','')),
 NULLIF(p_details->>'licenceIssueDate','')::date,NULLIF(p_details->>'licenceExpiryDate','')::date,COALESCE(p_details->>'address',''),COALESCE(p_details->>'city',''),COALESCE(p_details->>'notes',''))
 ON CONFLICT(agency_id,creation_key) DO NOTHING RETURNING id INTO cid;
 IF cid IS NULL THEN SELECT id INTO cid FROM tenancy.clients WHERE agency_id=p_agency_id AND creation_key=p_key AND created_by_user_id=app_private.canonical_auth_user() AND state='active'; END IF;
 IF cid IS NULL THEN RAISE EXCEPTION 'Client unavailable' USING ERRCODE='P0002'; END IF;
 RETURN cid;
END;
$f$;
CREATE FUNCTION public.contratpro_client_update(p_agency_id uuid,p_id uuid,p_version integer,p_details jsonb) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $f$
DECLARE current_version integer;
BEGIN
 IF NOT app_private.client_allowed(p_agency_id,'clients.update') OR NOT app_private.client_allowed(p_agency_id,'clients.read') THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
 IF NOT app_private.valid_client(p_details) OR p_version IS NULL OR p_version<1 THEN RAISE EXCEPTION 'Invalid client fields' USING ERRCODE='22023'; END IF;
 SELECT version INTO current_version FROM tenancy.clients WHERE agency_id=p_agency_id AND id=p_id AND state='active';
 IF current_version IS NULL THEN RAISE EXCEPTION 'Client unavailable' USING ERRCODE='P0002'; END IF;
 IF current_version<>p_version THEN RAISE EXCEPTION 'Client changed' USING ERRCODE='40001'; END IF;
 UPDATE tenancy.clients SET first_name=btrim(p_details->>'firstName'),last_name=btrim(p_details->>'lastName'),phone=p_details->>'phone',email=lower(COALESCE(p_details->>'email','')),
 nationality=COALESCE(p_details->>'nationality',''),identity_type=COALESCE(p_details->>'identityType','none'),identity_number=upper(COALESCE(p_details->>'identityNumber','')),
 licence_number=upper(COALESCE(p_details->>'licenceNumber','')),licence_issue_date=NULLIF(p_details->>'licenceIssueDate','')::date,licence_expiry_date=NULLIF(p_details->>'licenceExpiryDate','')::date,
 address=COALESCE(p_details->>'address',''),city=COALESCE(p_details->>'city',''),notes=COALESCE(p_details->>'notes','')
 WHERE agency_id=p_agency_id AND id=p_id AND state='active' AND version=p_version;
 IF NOT FOUND THEN RAISE EXCEPTION 'Client changed' USING ERRCODE='40001'; END IF; RETURN true;
END;
$f$;
CREATE FUNCTION public.contratpro_client_archive(p_agency_id uuid,p_id uuid,p_version integer) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $f$
DECLARE current_version integer;
BEGIN
 IF NOT app_private.client_allowed(p_agency_id,'clients.archive') OR NOT app_private.client_allowed(p_agency_id,'clients.read') THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
 SELECT version INTO current_version FROM tenancy.clients WHERE agency_id=p_agency_id AND id=p_id AND state='active';
 IF current_version IS NULL THEN RAISE EXCEPTION 'Client unavailable' USING ERRCODE='P0002'; END IF;
 IF p_version IS NULL OR current_version<>p_version THEN RAISE EXCEPTION 'Client changed' USING ERRCODE='40001'; END IF;
 UPDATE tenancy.clients SET state='archived' WHERE agency_id=p_agency_id AND id=p_id AND state='active' AND version=p_version;
 IF NOT FOUND THEN RAISE EXCEPTION 'Client changed' USING ERRCODE='40001'; END IF;
 -- No RETURNING of the now-hidden archived row.
 RETURN true;
END;
$f$;

REVOKE ALL ON FUNCTION app_private.client_allowed(uuid,text),app_private.client_payload(tenancy.clients),app_private.valid_client(jsonb),app_private.client_guard(),
 public.contratpro_clients_permissions(uuid),public.contratpro_clients_list(uuid,text,text,integer,integer),public.contratpro_client_detail(uuid,uuid),
 public.contratpro_client_create(uuid,uuid,jsonb),public.contratpro_client_update(uuid,uuid,integer,jsonb),public.contratpro_client_archive(uuid,uuid,integer)
 FROM PUBLIC,anon,authenticated,service_role,contratpro_runtime,contratpro_platform_runtime;
GRANT EXECUTE ON FUNCTION app_private.client_allowed(uuid,text),app_private.client_payload(tenancy.clients),app_private.valid_client(jsonb),app_private.client_guard(),
 public.contratpro_clients_permissions(uuid),public.contratpro_clients_list(uuid,text,text,integer,integer),public.contratpro_client_detail(uuid,uuid),
 public.contratpro_client_create(uuid,uuid,jsonb),public.contratpro_client_update(uuid,uuid,integer,jsonb),public.contratpro_client_archive(uuid,uuid,integer) TO authenticated;
DO $acl$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='tenancy.clients'::regclass AND (NOT relrowsecurity OR NOT relforcerowsecurity OR relowner<>'postgres'::regrole))
 OR EXISTS(SELECT 1 FROM pg_catalog.pg_class c,LATERAL pg_catalog.aclexplode(COALESCE(c.relacl,pg_catalog.acldefault('r',c.relowner))) a
   WHERE c.oid='tenancy.clients'::regclass AND a.grantee<>c.relowner AND NOT(a.grantee='authenticated'::regrole AND a.privilege_type='SELECT' AND NOT a.is_grantable))
 OR EXISTS(SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace,
   LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
   WHERE ((n.nspname='public' AND p.proname IN ('contratpro_clients_permissions','contratpro_clients_list','contratpro_client_detail','contratpro_client_create','contratpro_client_update','contratpro_client_archive'))
     OR (n.nspname='app_private' AND p.proname IN ('client_allowed','client_payload','valid_client','client_guard')))
   AND (p.prosecdef OR p.proowner<>'postgres'::regrole OR (a.grantee<>p.proowner AND NOT(a.grantee='authenticated'::regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable))))
 THEN RAISE EXCEPTION 'Client capability boundary mismatch'; END IF;
END;
$acl$;
