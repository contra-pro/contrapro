-- D2 NATIVE SYNTHETIC TEST CANDIDATE ONLY. NOT A MANAGED DEPLOYMENT ARTIFACT.
-- Source: supabase/migration-drafts/20261120001300_rental_contracts.sql; raw SHA256 3c27bc2a11de4d13a8003b35aa16d5d733eaeaa3be86557167a6fb2967214b79
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
 IF ARRAY(SELECT version FROM supabase_migrations.schema_migrations ORDER BY version) IS DISTINCT FROM ARRAY['20261115000000','20261115000100','20261115000200','20261115000300','20261115000400','20261115000500','20261115000600','20261116000700','20261118000800','20261118000900','20261118001000','20261119001100','20261119001200']::text[]
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


-- Retained source statements; parser-classified design stop/outer BEGIN/ROLLBACK excluded.
SET LOCAL search_path=pg_catalog,pg_temp;

SET LOCAL row_security=on;

CREATE ROLE contratpro_rental_writer NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT NOCREATEROLE NOCREATEDB NOREPLICATION;

SELECT pg_temp.d2_authorize('contratpro_rental_writer'::name);

GRANT USAGE ON SCHEMA identity,tenancy,app_private,public TO contratpro_rental_writer;

GRANT EXECUTE ON FUNCTION app_private.receipt_auth_uid(),app_private.canonical_auth_user() TO contratpro_rental_writer;

GRANT SELECT(supabase_user_id,user_id) ON identity.supabase_users TO contratpro_rental_writer;

GRANT SELECT(id,state) ON identity.users TO contratpro_rental_writer;

GRANT SELECT(id,state) ON tenancy.agencies TO contratpro_rental_writer;

GRANT SELECT(id,agency_id,user_id,state) ON tenancy.memberships TO contratpro_rental_writer;

GRANT SELECT(id,agency_id,state) ON tenancy.clients TO contratpro_rental_writer;

GRANT SELECT(id,agency_id) ON tenancy.vehicles TO contratpro_rental_writer;

GRANT INSERT(agency_id,actor_membership_id,action,request_id,metadata) ON tenancy.audit_events TO contratpro_rental_writer;

CREATE POLICY rental_mapping ON identity.supabase_users FOR SELECT TO contratpro_rental_writer
 USING(supabase_user_id=(SELECT app_private.receipt_auth_uid()));

CREATE POLICY rental_user ON identity.users FOR SELECT TO contratpro_rental_writer
 USING(id IN(SELECT user_id FROM identity.supabase_users WHERE supabase_user_id=(SELECT app_private.receipt_auth_uid())));

CREATE POLICY rental_membership ON tenancy.memberships FOR SELECT TO contratpro_rental_writer
 USING(user_id=app_private.canonical_auth_user());

CREATE POLICY rental_agency ON tenancy.agencies FOR SELECT TO contratpro_rental_writer
 USING(EXISTS(SELECT 1 FROM tenancy.memberships m WHERE m.agency_id=agencies.id AND m.user_id=app_private.canonical_auth_user() AND m.state='active'));

CREATE FUNCTION app_private.rental_member(p_agency uuid) RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE member_id uuid;
BEGIN
 IF current_setting('transaction_isolation')<>'read committed' THEN
   RAISE EXCEPTION 'Unsupported isolation' USING ERRCODE='22023';
 END IF;
 SELECT m.id INTO member_id FROM tenancy.memberships m JOIN tenancy.agencies a ON a.id=m.agency_id
 WHERE m.agency_id=p_agency AND m.user_id=app_private.canonical_auth_user()
   AND m.state='active' AND a.state='active';
 IF member_id IS NULL THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
 RETURN member_id;
END $f$;

CREATE POLICY rental_client ON tenancy.clients FOR SELECT TO contratpro_rental_writer
 USING(agency_id IN(SELECT m.agency_id FROM tenancy.memberships m WHERE m.user_id=app_private.canonical_auth_user() AND m.state='active'));

CREATE POLICY rental_vehicle ON tenancy.vehicles FOR SELECT TO contratpro_rental_writer
 USING(agency_id IN(SELECT m.agency_id FROM tenancy.memberships m WHERE m.user_id=app_private.canonical_auth_user() AND m.state='active'));

CREATE POLICY rental_audit ON tenancy.audit_events FOR INSERT TO contratpro_rental_writer
 WITH CHECK(actor_membership_id=app_private.rental_member(agency_id));

CREATE TABLE tenancy.rental_contracts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), agency_id uuid NOT NULL REFERENCES tenancy.agencies(id) ON DELETE RESTRICT,
 client_id uuid NOT NULL, vehicle_id uuid NOT NULL, creator_membership_id uuid NOT NULL,
 state text NOT NULL DEFAULT 'brouillon' CHECK(state IN('brouillon','confirme','en_cours','termine','annule')),
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
 daily_rate_minor bigint NOT NULL CHECK(daily_rate_minor BETWEEN 0 AND 1000000000000),
 deposit_minor bigint NOT NULL DEFAULT 0 CHECK(deposit_minor BETWEEN 0 AND 1000000000000),
 billable_days integer NOT NULL CHECK(billable_days BETWEEN 1 AND 1000000),
 total_minor bigint NOT NULL CHECK(total_minor>=0), currency text NOT NULL DEFAULT 'MAD' CHECK(currency='MAD'),
 number_year integer, number_serial bigint CHECK(number_serial>0),
 contract_number text GENERATED ALWAYS AS(CASE WHEN number_serial IS NULL THEN NULL ELSE
   'CTR-'||number_year::text||'-'||lpad(number_serial::text,greatest(4,length(number_serial::text)),'0') END) STORED,
 confirmed_at timestamptz, returned_at timestamptz, return_membership_id uuid,
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK(isfinite(starts_at) AND isfinite(ends_at) AND ends_at>starts_at),
 CHECK((number_year IS NULL)=(number_serial IS NULL)),
 CHECK((confirmed_at IS NULL)=(number_serial IS NULL)),
 CHECK(state<>'brouillon' OR number_serial IS NULL),
 CHECK(state NOT IN('confirme','en_cours','termine') OR number_serial IS NOT NULL),
 CHECK((state='termine')=(returned_at IS NOT NULL)),
 CHECK((returned_at IS NULL)=(return_membership_id IS NULL)),
 CHECK(number_year IS NULL OR number_year BETWEEN 1 AND 9999),
 CHECK(total_minor=billable_days::bigint*daily_rate_minor),
 CHECK(billable_days=ceil(extract(epoch FROM (ends_at-starts_at))/86400)),
 UNIQUE(agency_id,id), UNIQUE(agency_id,number_year,number_serial),
 FOREIGN KEY(agency_id,client_id) REFERENCES tenancy.clients(agency_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(agency_id,vehicle_id) REFERENCES tenancy.vehicles(agency_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(agency_id,creator_membership_id) REFERENCES tenancy.memberships(agency_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(agency_id,return_membership_id) REFERENCES tenancy.memberships(agency_id,id) ON DELETE RESTRICT
);

CREATE INDEX rental_vehicle_period ON tenancy.rental_contracts(agency_id,vehicle_id,starts_at,ends_at)
 WHERE state IN('confirme','en_cours');

CREATE UNIQUE INDEX rental_one_handover ON tenancy.rental_contracts(agency_id,vehicle_id) WHERE state='en_cours';

CREATE TABLE app_private.rental_numbers (
 agency_id uuid NOT NULL REFERENCES tenancy.agencies(id) ON DELETE RESTRICT,
 year integer NOT NULL CHECK(year BETWEEN 1 AND 9999), last_value bigint NOT NULL CHECK(last_value>0),
 PRIMARY KEY(agency_id,year)
);

CREATE TABLE app_private.rental_creation_receipts (
 agency_id uuid NOT NULL, creator_user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
 creation_key uuid NOT NULL, contract_id uuid NOT NULL, payload jsonb NOT NULL, result jsonb NOT NULL,
 PRIMARY KEY(agency_id,creator_user_id,creation_key),
 FOREIGN KEY(agency_id,contract_id) REFERENCES tenancy.rental_contracts(agency_id,id) ON DELETE RESTRICT
);

CREATE TABLE app_private.rental_confirmation_receipts (
 agency_id uuid NOT NULL, contract_id uuid NOT NULL, request_id uuid NOT NULL,
 expected_version integer NOT NULL CHECK(expected_version>0), result jsonb NOT NULL,
 PRIMARY KEY(agency_id,contract_id),
 FOREIGN KEY(agency_id,contract_id) REFERENCES tenancy.rental_contracts(agency_id,id) ON DELETE RESTRICT
);

ALTER TABLE tenancy.rental_contracts ENABLE ROW LEVEL SECURITY;

ALTER TABLE tenancy.rental_contracts FORCE ROW LEVEL SECURITY;

ALTER TABLE app_private.rental_numbers ENABLE ROW LEVEL SECURITY;

ALTER TABLE app_private.rental_numbers FORCE ROW LEVEL SECURITY;

ALTER TABLE app_private.rental_creation_receipts ENABLE ROW LEVEL SECURITY;

ALTER TABLE app_private.rental_creation_receipts FORCE ROW LEVEL SECURITY;

ALTER TABLE app_private.rental_confirmation_receipts ENABLE ROW LEVEL SECURITY;

ALTER TABLE app_private.rental_confirmation_receipts FORCE ROW LEVEL SECURITY;

REVOKE ALL ON tenancy.rental_contracts,app_private.rental_numbers,app_private.rental_creation_receipts FROM PUBLIC,anon,authenticated,service_role;

GRANT SELECT,INSERT,UPDATE ON tenancy.rental_contracts,app_private.rental_numbers TO contratpro_rental_writer;

GRANT SELECT,INSERT ON app_private.rental_creation_receipts TO contratpro_rental_writer;

REVOKE ALL ON app_private.rental_confirmation_receipts FROM PUBLIC,anon,authenticated,service_role;

GRANT SELECT,INSERT ON app_private.rental_confirmation_receipts TO contratpro_rental_writer;

CREATE POLICY rental_confirmation_read ON app_private.rental_confirmation_receipts FOR SELECT TO contratpro_rental_writer
 USING(app_private.rental_member(agency_id) IS NOT NULL);

CREATE POLICY rental_confirmation_insert ON app_private.rental_confirmation_receipts FOR INSERT TO contratpro_rental_writer
 WITH CHECK(app_private.rental_member(agency_id) IS NOT NULL);

CREATE POLICY rental_contract_access ON tenancy.rental_contracts TO contratpro_rental_writer
 USING(app_private.rental_member(agency_id) IS NOT NULL) WITH CHECK(app_private.rental_member(agency_id) IS NOT NULL);

CREATE POLICY rental_number_access ON app_private.rental_numbers TO contratpro_rental_writer
 USING(app_private.rental_member(agency_id) IS NOT NULL) WITH CHECK(app_private.rental_member(agency_id) IS NOT NULL);

CREATE POLICY rental_receipt_read ON app_private.rental_creation_receipts FOR SELECT TO contratpro_rental_writer
 USING(creator_user_id=app_private.canonical_auth_user() AND app_private.rental_member(agency_id) IS NOT NULL);

CREATE POLICY rental_receipt_insert ON app_private.rental_creation_receipts FOR INSERT TO contratpro_rental_writer
 WITH CHECK(creator_user_id=app_private.canonical_auth_user() AND app_private.rental_member(agency_id) IS NOT NULL);

CREATE FUNCTION app_private.rental_receipt_immutable() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
BEGIN RAISE EXCEPTION 'Immutable receipt' USING ERRCODE='42501'; END $f$;

CREATE TRIGGER rental_receipt_immutable BEFORE UPDATE OR DELETE ON app_private.rental_creation_receipts
 FOR EACH ROW EXECUTE FUNCTION app_private.rental_receipt_immutable();

CREATE TRIGGER rental_confirmation_immutable BEFORE UPDATE OR DELETE ON app_private.rental_confirmation_receipts
 FOR EACH ROW EXECUTE FUNCTION app_private.rental_receipt_immutable();

CREATE FUNCTION app_private.rental_history_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Historical contract' USING ERRCODE='42501'; END IF;
 IF OLD.number_serial IS NOT NULL AND
  ROW(NEW.number_serial,NEW.number_year,NEW.confirmed_at) IS DISTINCT FROM ROW(OLD.number_serial,OLD.number_year,OLD.confirmed_at)
 THEN RAISE EXCEPTION 'Immutable issued number' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $f$;

CREATE TRIGGER rental_history_guard BEFORE UPDATE OR DELETE ON tenancy.rental_contracts
 FOR EACH ROW EXECUTE FUNCTION app_private.rental_history_guard();

CREATE FUNCTION app_private.rental_price(p_start timestamptz,p_end timestamptz,p_rate numeric,p_deposit numeric)
RETURNS integer LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE days numeric;
BEGIN
 IF p_start IS NULL OR p_end IS NULL OR NOT isfinite(p_start) OR NOT isfinite(p_end) OR p_end<=p_start
  OR p_rate IS NULL OR p_deposit IS NULL OR NOT(p_rate BETWEEN 0 AND 1000000000000)
  OR NOT(p_deposit BETWEEN 0 AND 1000000000000) OR p_rate<>trunc(p_rate) OR p_deposit<>trunc(p_deposit)
 THEN RAISE EXCEPTION 'Invalid rental fields' USING ERRCODE='22023'; END IF;
 days:=ceil(extract(epoch FROM (p_end-p_start))/86400);
 IF days<1 OR days>1000000 THEN RAISE EXCEPTION 'Rental duration limit' USING ERRCODE='22023'; END IF;
 RETURN days::integer;
END $f$;

CREATE FUNCTION app_private.rental_input(p jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE s timestamptz; e timestamptz; rate numeric; deposit numeric; days integer;
BEGIN
 IF jsonb_typeof(p) IS DISTINCT FROM 'object' OR pg_column_size(p)>4096
 OR NOT(p ?& ARRAY['clientId','vehicleId','start','end','dailyRateMinor'])
 OR EXISTS(SELECT 1 FROM jsonb_object_keys(p) k WHERE k NOT IN('clientId','vehicleId','start','end','dailyRateMinor','depositMinor'))
 OR jsonb_typeof(p->'clientId') IS DISTINCT FROM 'string' OR jsonb_typeof(p->'vehicleId') IS DISTINCT FROM 'string'
 OR jsonb_typeof(p->'start') IS DISTINCT FROM 'string' OR jsonb_typeof(p->'end') IS DISTINCT FROM 'string'
 OR jsonb_typeof(p->'dailyRateMinor') IS DISTINCT FROM 'number'
 OR (p ? 'depositMinor' AND jsonb_typeof(p->'depositMinor') IS DISTINCT FROM 'number')
 OR (p->>'start') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$'
 OR (p->>'end') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$'
 THEN RAISE EXCEPTION 'Invalid rental fields' USING ERRCODE='22023'; END IF;
 s:=(p->>'start')::timestamptz; e:=(p->>'end')::timestamptz;
 rate:=(p->>'dailyRateMinor')::numeric; deposit:=COALESCE((p->>'depositMinor')::numeric,0);
 days:=app_private.rental_price(s,e,rate,deposit);
 RETURN jsonb_build_object('clientId',(p->>'clientId')::uuid,'vehicleId',(p->>'vehicleId')::uuid,
  'start',to_char(s AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'end',to_char(e AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'dailyRateMinor',rate::bigint,'depositMinor',deposit::bigint,'days',days);
EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow OR invalid_datetime_format OR numeric_value_out_of_range
 THEN RAISE EXCEPTION 'Invalid rental fields' USING ERRCODE='22023';
END $f$;

CREATE FUNCTION app_private.rental_number(p_agency uuid,p_confirmed timestamptz) RETURNS bigint
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE serial bigint; y integer:=extract(year FROM p_confirmed AT TIME ZONE 'Africa/Casablanca')::integer;
BEGIN
 INSERT INTO app_private.rental_numbers(agency_id,year,last_value) VALUES(p_agency,y,1)
 ON CONFLICT(agency_id,year) DO UPDATE SET last_value=app_private.rental_numbers.last_value+1
 WHERE app_private.rental_numbers.last_value<9223372036854775807 RETURNING last_value INTO serial;
 IF serial IS NULL THEN RAISE EXCEPTION 'Bigint number capacity reached' USING ERRCODE='22023'; END IF;
 RETURN serial;
END $f$;

CREATE FUNCTION app_private.rental_lock(p_agency uuid,p_vehicle uuid) RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('rental:vehicle:'||p_agency::text||':'||p_vehicle::text,0));
END $f$;

CREATE FUNCTION app_private.rental_available(p_agency uuid,p_vehicle uuid,p_id uuid,p_start timestamptz,p_end timestamptz) RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
BEGIN
 IF EXISTS(SELECT 1 FROM tenancy.rental_contracts c WHERE c.agency_id=p_agency AND c.vehicle_id=p_vehicle
  AND c.id<>p_id AND c.state IN('confirme','en_cours')
  AND tstzrange(c.starts_at,c.ends_at,'[)') && tstzrange(p_start,p_end,'[)'))
 THEN RAISE EXCEPTION 'Unavailable vehicle' USING ERRCODE='23P01'; END IF;
END $f$;

CREATE FUNCTION public.contratpro_rental_create(p_agency_id uuid,p_key uuid,p_details jsonb) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE actor uuid; member_id uuid; normalized jsonb; receipt app_private.rental_creation_receipts%ROWTYPE;
 r tenancy.rental_contracts%ROWTYPE; result jsonb;
BEGIN
 member_id:=app_private.rental_member(p_agency_id); actor:=app_private.canonical_auth_user();
 IF p_key IS NULL THEN RAISE EXCEPTION 'Invalid key' USING ERRCODE='22023'; END IF;
 normalized:=app_private.rental_input(p_details);
 PERFORM pg_advisory_xact_lock(hashtextextended('rental:key:'||p_agency_id::text||':'||actor::text||':'||p_key::text,0));
 SELECT * INTO receipt FROM app_private.rental_creation_receipts WHERE agency_id=p_agency_id AND creator_user_id=actor AND creation_key=p_key;
 IF FOUND THEN
  IF receipt.payload IS DISTINCT FROM normalized THEN RAISE EXCEPTION 'Creation conflict' USING ERRCODE='40001'; END IF;
  RETURN receipt.result;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM tenancy.clients WHERE agency_id=p_agency_id AND id=(normalized->>'clientId')::uuid AND state='active')
 OR NOT EXISTS(SELECT 1 FROM tenancy.vehicles WHERE agency_id=p_agency_id AND id=(normalized->>'vehicleId')::uuid)
 THEN RAISE EXCEPTION 'Invalid reference' USING ERRCODE='22023'; END IF;
 INSERT INTO tenancy.rental_contracts(agency_id,client_id,vehicle_id,creator_membership_id,starts_at,ends_at,daily_rate_minor,deposit_minor,billable_days,total_minor)
 VALUES(p_agency_id,(normalized->>'clientId')::uuid,(normalized->>'vehicleId')::uuid,member_id,
  (normalized->>'start')::timestamptz,(normalized->>'end')::timestamptz,
  (normalized->>'dailyRateMinor')::bigint,(normalized->>'depositMinor')::bigint,(normalized->>'days')::integer,
  (normalized->>'days')::bigint*(normalized->>'dailyRateMinor')::bigint) RETURNING * INTO r;
 result:=jsonb_build_object('id',r.id,'version',1,'state','brouillon','number',r.contract_number);
 INSERT INTO app_private.rental_creation_receipts VALUES(p_agency_id,actor,p_key,r.id,normalized,result);
 INSERT INTO tenancy.audit_events(agency_id,actor_membership_id,action,request_id,metadata)
 VALUES(p_agency_id,member_id,'rentals.created',p_key,jsonb_build_object('contractId',r.id,'version',1));
 RETURN result;
END $f$;

CREATE FUNCTION public.contratpro_rental_detail(p_agency_id uuid,p_id uuid) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE result jsonb;
BEGIN
 PERFORM app_private.rental_member(p_agency_id);
 SELECT to_jsonb(c)-'creator_membership_id'-'return_membership_id' || jsonb_build_object(
  'physicalUnavailable',EXISTS(SELECT 1 FROM tenancy.rental_contracts o WHERE o.agency_id=c.agency_id AND o.vehicle_id=c.vehicle_id AND o.id<>c.id AND o.state='en_cours'),
  'overdueConflict',c.state='confirme' AND EXISTS(SELECT 1 FROM tenancy.rental_contracts o WHERE o.agency_id=c.agency_id AND o.vehicle_id=c.vehicle_id AND o.id<>c.id AND o.state='en_cours' AND o.ends_at<=clock_timestamp()))
 INTO result FROM tenancy.rental_contracts c WHERE agency_id=p_agency_id AND id=p_id;
 RETURN result;
END $f$;

CREATE FUNCTION public.contratpro_rental_list(p_agency_id uuid,p_page integer) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE result jsonb;
BEGIN
 PERFORM app_private.rental_member(p_agency_id);
 IF p_page IS NULL OR p_page NOT BETWEEN 1 AND 10000 THEN RAISE EXCEPTION 'Invalid page' USING ERRCODE='22023'; END IF;
 SELECT jsonb_build_object('items',COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb),'total',
  (SELECT count(*) FROM tenancy.rental_contracts WHERE agency_id=p_agency_id)) INTO result
 FROM(SELECT id,contract_number,state,starts_at,ends_at,client_id,vehicle_id,version FROM tenancy.rental_contracts
  WHERE agency_id=p_agency_id ORDER BY created_at DESC,id DESC LIMIT 20 OFFSET (p_page-1)*20) x;
 RETURN result;
END $f$;

CREATE FUNCTION app_private.rental_change(p_agency uuid,p_id uuid,p_version integer,p_request uuid,p_operation text,p_data jsonb) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE r tenancy.rental_contracts%ROWTYPE; member_id uuid;
 confirmed app_private.rental_confirmation_receipts%ROWTYPE; confirmation_at timestamptz;
 normalized jsonb; new_end timestamptz; next_state text; result jsonb;
BEGIN
 member_id:=app_private.rental_member(p_agency);
 IF p_request IS NULL OR p_version IS NULL OR p_version<1 THEN RAISE EXCEPTION 'Invalid mutation' USING ERRCODE='22023'; END IF;
 SELECT * INTO r FROM tenancy.rental_contracts WHERE agency_id=p_agency AND id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Not found' USING ERRCODE='P0002'; END IF;
 IF p_operation='confirm' THEN
  SELECT * INTO confirmed FROM app_private.rental_confirmation_receipts WHERE agency_id=p_agency AND contract_id=p_id;
  IF FOUND THEN
   IF confirmed.request_id=p_request AND confirmed.expected_version=p_version THEN RETURN confirmed.result; END IF;
   RAISE EXCEPTION 'Confirmation conflict' USING ERRCODE='40001';
  END IF;
 END IF;
 IF r.version<>p_version THEN RAISE EXCEPTION 'Stale version' USING ERRCODE='40001'; END IF;
 IF r.version=2147483647 THEN RAISE EXCEPTION 'Version limit' USING ERRCODE='22023'; END IF;
 PERFORM app_private.rental_lock(p_agency,r.vehicle_id);
 next_state:=r.state;
 IF p_operation='update' THEN
  IF r.state<>'brouillon' THEN RAISE EXCEPTION 'Invalid transition' USING ERRCODE='22023'; END IF;
  normalized:=app_private.rental_input(p_data);
  IF (normalized->>'clientId')::uuid<>r.client_id OR (normalized->>'vehicleId')::uuid<>r.vehicle_id THEN
   RAISE EXCEPTION 'References immutable' USING ERRCODE='22023'; END IF;
  r.starts_at:=(normalized->>'start')::timestamptz;
  r.ends_at:=(normalized->>'end')::timestamptz;
  r.daily_rate_minor:=(normalized->>'dailyRateMinor')::bigint; r.deposit_minor:=(normalized->>'depositMinor')::bigint;
 ELSIF p_operation='extend' THEN
  IF r.state NOT IN('confirme','en_cours') THEN RAISE EXCEPTION 'Invalid transition' USING ERRCODE='22023'; END IF;
  normalized:=app_private.rental_input(jsonb_build_object('clientId',r.client_id,'vehicleId',r.vehicle_id,
   'start',to_char(r.starts_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
   'end',p_data->>'end','dailyRateMinor',r.daily_rate_minor,'depositMinor',r.deposit_minor));
  IF jsonb_typeof(p_data) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(p_data))<>1 THEN
   RAISE EXCEPTION 'Invalid extension' USING ERRCODE='22023'; END IF;
  new_end:=(normalized->>'end')::timestamptz;
  IF new_end<=r.ends_at THEN RAISE EXCEPTION 'Invalid extension' USING ERRCODE='22023'; END IF;
  r.ends_at:=new_end;
 ELSIF p_operation='confirm' AND r.state='brouillon' THEN
  IF NOT EXISTS(SELECT 1 FROM tenancy.clients WHERE agency_id=p_agency AND id=r.client_id AND state='active') THEN
   RAISE EXCEPTION 'Invalid reference' USING ERRCODE='22023'; END IF;
  -- Validate availability BEFORE allocation; audit/receipt failure also rolls it back.
  PERFORM app_private.rental_available(p_agency,r.vehicle_id,r.id,r.starts_at,r.ends_at);
  confirmation_at:=clock_timestamp();
  r.confirmed_at:=confirmation_at;
  r.number_year:=extract(year FROM confirmation_at AT TIME ZONE 'Africa/Casablanca')::integer;
  r.number_serial:=app_private.rental_number(p_agency,confirmation_at);
  next_state:='confirme';
 ELSIF p_operation='start' AND r.state='confirme' THEN
  IF EXISTS(SELECT 1 FROM tenancy.rental_contracts c WHERE c.agency_id=p_agency AND c.vehicle_id=r.vehicle_id AND c.id<>r.id AND c.state='en_cours') THEN
   RAISE EXCEPTION 'Vehicle not returned' USING ERRCODE='23P01'; END IF;
  -- Physical handover cannot precede the scheduled interval or follow its end.
  IF clock_timestamp()<r.starts_at OR clock_timestamp()>=r.ends_at THEN RAISE EXCEPTION 'Outside rental period' USING ERRCODE='22023'; END IF;
  next_state:='en_cours';
 ELSIF p_operation='complete' AND r.state='en_cours' THEN
  IF p_data IS DISTINCT FROM '{"vehicleReturned":true}'::jsonb THEN RAISE EXCEPTION 'Explicit return required' USING ERRCODE='22023'; END IF;
  r.returned_at:=clock_timestamp();
  r.return_membership_id:=member_id;
  next_state:='termine';
 ELSIF p_operation='cancel' AND r.state IN('brouillon','confirme') THEN next_state:='annule';
 ELSE RAISE EXCEPTION 'Invalid transition' USING ERRCODE='22023'; END IF;
 IF next_state IN('confirme','en_cours') THEN
  PERFORM app_private.rental_available(p_agency,r.vehicle_id,r.id,r.starts_at,r.ends_at);
 END IF;
 r.billable_days:=app_private.rental_price(r.starts_at,r.ends_at,r.daily_rate_minor,r.deposit_minor);
 UPDATE tenancy.rental_contracts SET starts_at=r.starts_at,ends_at=r.ends_at,daily_rate_minor=r.daily_rate_minor,
  deposit_minor=r.deposit_minor,billable_days=r.billable_days,total_minor=r.billable_days::bigint*r.daily_rate_minor,
  state=next_state,number_year=r.number_year,number_serial=r.number_serial,confirmed_at=r.confirmed_at,
  returned_at=r.returned_at,return_membership_id=r.return_membership_id,version=version+1,updated_at=clock_timestamp()
 WHERE agency_id=p_agency AND id=p_id RETURNING * INTO r;
 INSERT INTO tenancy.audit_events(agency_id,actor_membership_id,action,request_id,metadata)
 VALUES(p_agency,member_id,CASE WHEN p_operation='complete' THEN 'rentals.returned' ELSE 'rentals.'||p_operation END,
  p_request,jsonb_strip_nulls(jsonb_build_object('contractId',p_id,'version',r.version,'returnedAt',r.returned_at)));
 result:=jsonb_build_object('id',r.id,'version',r.version,'state',r.state,'number',r.contract_number);
 IF p_operation='confirm' THEN
  INSERT INTO app_private.rental_confirmation_receipts VALUES(p_agency,p_id,p_request,p_version,result);
 END IF;
 RETURN result;
END $f$;

CREATE FUNCTION public.contratpro_rental_update_draft(p_agency_id uuid,p_id uuid,p_version integer,p_request_id uuid,p_details jsonb) RETURNS jsonb
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
 SELECT app_private.rental_change(p_agency_id,p_id,p_version,p_request_id,'update',p_details) $f$;

CREATE FUNCTION public.contratpro_rental_confirm(p_agency_id uuid,p_id uuid,p_version integer,p_request_id uuid) RETURNS jsonb
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
 SELECT app_private.rental_change(p_agency_id,p_id,p_version,p_request_id,'confirm',NULL) $f$;

CREATE FUNCTION public.contratpro_rental_start(p_agency_id uuid,p_id uuid,p_version integer,p_request_id uuid) RETURNS jsonb
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
 SELECT app_private.rental_change(p_agency_id,p_id,p_version,p_request_id,'start',NULL) $f$;

CREATE FUNCTION public.contratpro_rental_complete(p_agency_id uuid,p_id uuid,p_version integer,p_request_id uuid,p_return_confirmed boolean) RETURNS jsonb
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
 SELECT app_private.rental_change(p_agency_id,p_id,p_version,p_request_id,'complete',jsonb_build_object('vehicleReturned',p_return_confirmed)) $f$;

CREATE FUNCTION public.contratpro_rental_cancel(p_agency_id uuid,p_id uuid,p_version integer,p_request_id uuid) RETURNS jsonb
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
 SELECT app_private.rental_change(p_agency_id,p_id,p_version,p_request_id,'cancel',NULL) $f$;

CREATE FUNCTION public.contratpro_rental_extend(p_agency_id uuid,p_id uuid,p_version integer,p_request_id uuid,p_details jsonb) RETURNS jsonb
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
 SELECT app_private.rental_change(p_agency_id,p_id,p_version,p_request_id,'extend',p_details) $f$;

GRANT CREATE ON SCHEMA app_private,public TO contratpro_rental_writer;

DO $ownership$
DECLARE
 f record;
 target_oid pg_catalog.oid;
 return_oid pg_catalog.oid;
 executor_oid pg_catalog.oid:=pg_catalog.to_regrole(current_user::pg_catalog.text);
 writer_oid pg_catalog.oid:=pg_catalog.to_regrole('contratpro_rental_writer');
 authenticated_oid pg_catalog.oid:=pg_catalog.to_regrole('authenticated');
 target_oids pg_catalog.oid[]:='{}'::pg_catalog.oid[];
 target_signatures pg_catalog.text[]:='{}'::pg_catalog.text[];
 matched integer;
BEGIN
 -- Target scope is exact; executor/SET/grantor authority is NOT assumed or supplied.
 -- No temporary memberships or role switches are introduced by this local correction.
 IF executor_oid IS NULL OR writer_oid IS NULL OR authenticated_oid IS NULL OR NOT EXISTS(
  SELECT 1 FROM pg_catalog.pg_roles r WHERE r.oid=writer_oid
  AND NOT r.rolcanlogin AND NOT r.rolsuper AND NOT r.rolbypassrls AND NOT r.rolinherit
  AND NOT r.rolcreaterole AND NOT r.rolcreatedb AND NOT r.rolreplication)
 THEN RAISE EXCEPTION 'Ownership role boundary mismatch' USING ERRCODE='42501'; END IF;
 -- Validate ALL identities before any function ACL/owner change. Plain CREATE FUNCTION
 -- earlier in this transaction already rejects a pre-existing exact identity.
 FOR f IN SELECT * FROM (VALUES
  ('app_private.rental_member(pg_catalog.uuid)','pg_catalog.uuid',false,'plpgsql',ARRAY['p_agency']::pg_catalog.text[],'77316cd421540f72e1792425b6830408a752918698d8b4f7f37a6a399bc4ae79'),
  ('app_private.rental_receipt_immutable()','pg_catalog.trigger',false,'plpgsql',NULL::pg_catalog.text[],'ade070e3a5464bebec31e60f34aa9f656d4faaeb77b5e58ca1b91432a38b2942'),
  ('app_private.rental_history_guard()','pg_catalog.trigger',false,'plpgsql',NULL::pg_catalog.text[],'7d5bd92ca5c788f9305886b465c9edfbd7cd11c07e1f3e1b646e42dacf1d4d6e'),
  ('app_private.rental_price(pg_catalog.timestamptz,pg_catalog.timestamptz,pg_catalog.numeric,pg_catalog.numeric)','pg_catalog.int4',false,'plpgsql',ARRAY['p_start','p_end','p_rate','p_deposit']::pg_catalog.text[],'1c474e353f6fd553bd1e5734de25a5605fe474981a86cc2e9c181a26341bb08b'),
  ('app_private.rental_input(pg_catalog.jsonb)','pg_catalog.jsonb',false,'plpgsql',ARRAY['p']::pg_catalog.text[],'bc8fac9690c33f4021a2e6fa3cd070691e1b7be444965613fa1f506d1f2f735d'),
  ('app_private.rental_number(pg_catalog.uuid,pg_catalog.timestamptz)','pg_catalog.int8',false,'plpgsql',ARRAY['p_agency','p_confirmed']::pg_catalog.text[],'c47f5f9fb45567dca02ce0b5d237c62fcfa57c9c48eef5cb608222b646d73e85'),
  ('app_private.rental_lock(pg_catalog.uuid,pg_catalog.uuid)','pg_catalog.void',false,'plpgsql',ARRAY['p_agency','p_vehicle']::pg_catalog.text[],'6a4a82667e9a4fff3a34bbcbd14e4a75ade311808d955521cb627ae3daa97c0c'),
  ('app_private.rental_available(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.uuid,pg_catalog.timestamptz,pg_catalog.timestamptz)','pg_catalog.void',false,'plpgsql',ARRAY['p_agency','p_vehicle','p_id','p_start','p_end']::pg_catalog.text[],'6329e0ff0970f9de0285280c97d8c2f805eda9608b7ec030fd2e16ee40f65861'),
  ('public.contratpro_rental_create(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.jsonb)','pg_catalog.jsonb',true,'plpgsql',ARRAY['p_agency_id','p_key','p_details']::pg_catalog.text[],'3c27fa78006bc539aa010281a8b5fed80a6b48bc9a20b2d87c41411cb3c73912'),
  ('public.contratpro_rental_detail(pg_catalog.uuid,pg_catalog.uuid)','pg_catalog.jsonb',true,'plpgsql',ARRAY['p_agency_id','p_id']::pg_catalog.text[],'f33d2f17076382cf5c32fdbfc156a74fff2ee3180cf80573933292ab10723c5c'),
  ('public.contratpro_rental_list(pg_catalog.uuid,pg_catalog.int4)','pg_catalog.jsonb',true,'plpgsql',ARRAY['p_agency_id','p_page']::pg_catalog.text[],'d316dcfeb10c2b06a58542494dc8961ac8e533a9d70d32c8102f98668f74e5a5'),
  ('app_private.rental_change(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid,pg_catalog.text,pg_catalog.jsonb)','pg_catalog.jsonb',false,'plpgsql',ARRAY['p_agency','p_id','p_version','p_request','p_operation','p_data']::pg_catalog.text[],'5cd371c6b204d1c78c19081816e07c1697dc145b23da88a5816557fb103bc761'),
  ('public.contratpro_rental_update_draft(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid,pg_catalog.jsonb)','pg_catalog.jsonb',true,'sql',ARRAY['p_agency_id','p_id','p_version','p_request_id','p_details']::pg_catalog.text[],'66ba08f194ad00d9e88da7ab709cfbe917c4eacf2d65c080d511e67c48ded538'),
  ('public.contratpro_rental_confirm(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid)','pg_catalog.jsonb',true,'sql',ARRAY['p_agency_id','p_id','p_version','p_request_id']::pg_catalog.text[],'b7b27857585d42a37d341ffad2bcabc35fb14c754add604197d06f3cd14d3fa6'),
  ('public.contratpro_rental_start(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid)','pg_catalog.jsonb',true,'sql',ARRAY['p_agency_id','p_id','p_version','p_request_id']::pg_catalog.text[],'a62bf1fb61ac2dc676082c78fc62bce3594d8fc054363cb0f49d6c6dd57ba3f9'),
  ('public.contratpro_rental_complete(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid,pg_catalog.bool)','pg_catalog.jsonb',true,'sql',ARRAY['p_agency_id','p_id','p_version','p_request_id','p_return_confirmed']::pg_catalog.text[],'5d162b90abae2b68a72ac0a39d9d134963677ae92cb886d21b431e56579a8923'),
  ('public.contratpro_rental_cancel(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid)','pg_catalog.jsonb',true,'sql',ARRAY['p_agency_id','p_id','p_version','p_request_id']::pg_catalog.text[],'002e8e65a1fe75f2c4b84660a780a712604a194f67d4d81788faf7045628eefd'),
  ('public.contratpro_rental_extend(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.int4,pg_catalog.uuid,pg_catalog.jsonb)','pg_catalog.jsonb',true,'sql',ARRAY['p_agency_id','p_id','p_version','p_request_id','p_details']::pg_catalog.text[],'4a5c7c2925e04436631d4c90b67ea33d09fecb91341e5ea50345f11183d04346')
 ) AS allowlist(signature,return_type,security_definer,language_name,argument_names,source_sha256)
 LOOP
  target_oid:=pg_catalog.to_regprocedure(f.signature);
  return_oid:=pg_catalog.to_regtype(f.return_type);
  IF target_oid IS NULL OR return_oid IS NULL OR target_oid=ANY(target_oids)
   OR f.signature=ANY(target_signatures)
  THEN RAISE EXCEPTION 'Missing or duplicate ownership target' USING ERRCODE='42501'; END IF;
  SELECT pg_catalog.count(*) INTO matched
  FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
  JOIN pg_catalog.pg_language l ON l.oid=p.prolang
  WHERE p.oid=target_oid AND p.prokind='f' AND p.proowner=executor_oid
   AND n.nspname=pg_catalog.split_part(f.signature,'.',1)
   AND p.proname=pg_catalog.split_part(pg_catalog.split_part(f.signature,'(',1),'.',2)
   AND p.prorettype=return_oid AND p.prosecdef=f.security_definer AND l.lanname=f.language_name
   AND p.provariadic=0 AND p.pronargdefaults=0 AND p.proargmodes IS NULL AND NOT p.proretset
   AND p.proargnames IS NOT DISTINCT FROM f.argument_names
   AND p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on']::pg_catalog.text[]
   AND pg_catalog.cardinality(p.proconfig)=2
   AND pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.replace(p.prosrc,E'\r\n',E'\n'),'UTF8')),'hex')=f.source_sha256;
  IF matched<>1 THEN RAISE EXCEPTION 'Unexpected ownership target identity or definition' USING ERRCODE='42501'; END IF;
  -- Same-name overloads abort; unrelated prefix matches are not considered targets.
  IF EXISTS(SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname=pg_catalog.split_part(f.signature,'.',1)
   AND p.proname=pg_catalog.split_part(pg_catalog.split_part(f.signature,'(',1),'.',2)
   AND p.oid<>target_oid)
  THEN RAISE EXCEPTION 'Unexpected ownership target overload' USING ERRCODE='42501'; END IF;
  target_oids:=pg_catalog.array_append(target_oids,target_oid);
  target_signatures:=pg_catalog.array_append(target_signatures,f.signature);
 END LOOP;
 IF pg_catalog.cardinality(target_oids)<>18 OR pg_catalog.cardinality(target_signatures)<>18
 THEN RAISE EXCEPTION 'Ownership target set mismatch' USING ERRCODE='42501'; END IF;
 -- Only the validated constant signatures reach DDL; never pg_proc prefix discovery.
 FOR f IN SELECT s.signature,s.ordinality::pg_catalog.int4 AS position,
  pg_catalog.split_part(s.signature,'.',1) AS nspname
  FROM pg_catalog.unnest(target_signatures) WITH ORDINALITY AS s(signature,ordinality)
 LOOP
  IF pg_catalog.to_regprocedure(f.signature) IS DISTINCT FROM target_oids[f.position]
   OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_proc p WHERE p.oid=target_oids[f.position] AND p.proowner=executor_oid)
  THEN RAISE EXCEPTION 'Ownership target changed before mutation' USING ERRCODE='42501'; END IF;
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f.signature);
  EXECUTE format('ALTER FUNCTION %s OWNER TO contratpro_rental_writer',f.signature);
  IF f.nspname='public' THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.signature); END IF;
  -- Missing grant authority may produce warnings; the postconditions must still fail.
  IF pg_catalog.to_regprocedure(f.signature) IS DISTINCT FROM target_oids[f.position]
   OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_proc p WHERE p.oid=target_oids[f.position] AND p.proowner=writer_oid)
  THEN RAISE EXCEPTION 'Final function owner mismatch' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM pg_catalog.pg_proc p
   CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
   WHERE p.oid=target_oids[f.position] AND a.grantee<>writer_oid
   AND (f.nspname<>'public' OR a.grantee<>authenticated_oid OR a.privilege_type<>'EXECUTE' OR a.is_grantable))
   OR pg_catalog.has_function_privilege(authenticated_oid,target_oids[f.position],'EXECUTE') IS DISTINCT FROM (f.nspname='public')
   OR pg_catalog.has_function_privilege('anon',target_oids[f.position],'EXECUTE') IS DISTINCT FROM false
   OR pg_catalog.has_function_privilege('service_role',target_oids[f.position],'EXECUTE') IS DISTINCT FROM false
  THEN RAISE EXCEPTION 'Final function ACL boundary mismatch' USING ERRCODE='42501'; END IF;
 END LOOP;
END $ownership$;

REVOKE CREATE ON SCHEMA app_private,public FROM contratpro_rental_writer;
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
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='tenancy.rental_contracts'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.rental_numbers'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.rental_creation_receipts'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.rental_confirmation_receipts'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='tenancy.rental_contracts'::regclass AND relrowsecurity) THEN RAISE EXCEPTION 'D2 declared RLS invariant missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='tenancy.rental_contracts'::regclass AND relforcerowsecurity) THEN RAISE EXCEPTION 'D2 declared RLS invariant missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.rental_numbers'::regclass AND relrowsecurity) THEN RAISE EXCEPTION 'D2 declared RLS invariant missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.rental_numbers'::regclass AND relforcerowsecurity) THEN RAISE EXCEPTION 'D2 declared RLS invariant missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.rental_creation_receipts'::regclass AND relrowsecurity) THEN RAISE EXCEPTION 'D2 declared RLS invariant missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.rental_creation_receipts'::regclass AND relforcerowsecurity) THEN RAISE EXCEPTION 'D2 declared RLS invariant missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.rental_confirmation_receipts'::regclass AND relrowsecurity) THEN RAISE EXCEPTION 'D2 declared RLS invariant missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.rental_confirmation_receipts'::regclass AND relforcerowsecurity) THEN RAISE EXCEPTION 'D2 declared RLS invariant missing';END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace,
 LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
 WHERE (n.nspname||'.'||p.proname)=ANY(ARRAY['app_private.rental_member','app_private.rental_receipt_immutable','app_private.rental_history_guard','app_private.rental_price','app_private.rental_input','app_private.rental_number','app_private.rental_lock','app_private.rental_available','public.contratpro_rental_create','public.contratpro_rental_detail','public.contratpro_rental_list','app_private.rental_change','public.contratpro_rental_update_draft','public.contratpro_rental_confirm','public.contratpro_rental_start','public.contratpro_rental_complete','public.contratpro_rental_cancel','public.contratpro_rental_extend']::text[]) AND p.prosecdef AND a.grantee=0 AND a.privilege_type='EXECUTE') THEN RAISE EXCEPTION 'D2 definer PUBLIC execute leak';END IF;
END $d2_objects_post$;

DO $d2_security_post$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=ANY(ARRAY['contratpro_rental_writer']::text[])
 AND (rolcanlogin OR rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication OR rolinherit)) THEN RAISE EXCEPTION 'D2 writer role widened';END IF;
END $d2_security_post$;
INSERT INTO supabase_migrations.schema_migrations(version) VALUES('20261120001300');
DO $d2_post$ BEGIN
 IF ARRAY(SELECT version FROM supabase_migrations.schema_migrations ORDER BY version) IS DISTINCT FROM ARRAY['20261115000000','20261115000100','20261115000200','20261115000300','20261115000400','20261115000500','20261115000600','20261116000700','20261118000800','20261118000900','20261118001000','20261119001100','20261119001200','20261120001300']::text[]
 THEN RAISE EXCEPTION 'D2 final history mismatch';END IF;
END $d2_post$;
COMMIT;
