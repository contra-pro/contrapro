-- D2 NATIVE SYNTHETIC TEST CANDIDATE ONLY. NOT A MANAGED DEPLOYMENT ARTIFACT.
-- Source: supabase/migration-drafts/20261124002000_billing.sql; raw SHA256 d6d4aff81f187a7bc847b8daca46e554ab7b3da838dfc5fae10289e33e1c4ce8
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
 IF ARRAY(SELECT version FROM supabase_migrations.schema_migrations ORDER BY version) IS DISTINCT FROM ARRAY['20261115000000','20261115000100','20261115000200','20261115000300','20261115000400','20261115000500','20261115000600','20261116000700','20261118000800','20261118000900','20261118001000','20261119001100','20261119001200','20261120001300','20261122001400','20261122001500','20261124001600','20261124001700','20261124001800','20261124001900']::text[]
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
 IF wanted::text<>ALL(ARRAY['contratpro_rental_writer','contratpro_billing_writer']::text[]) THEN RAISE EXCEPTION 'D2 role outside manifest';END IF;
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
-- Retained source statements; parser-classified design stop/outer BEGIN/ROLLBACK excluded.
SET LOCAL search_path=pg_catalog,pg_temp;

SET LOCAL row_security=on;

CREATE ROLE contratpro_billing_writer NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT NOCREATEROLE NOCREATEDB NOREPLICATION;

SELECT pg_temp.d2_authorize('contratpro_billing_writer'::name);

GRANT USAGE ON SCHEMA public,app_private,platform,auth TO contratpro_billing_writer;

INSERT INTO tenancy.permissions(key,description) VALUES('billing.view','Read agency billing'),('billing.manage','Request agency subscription changes');

CREATE TABLE app_private.billing_admin_subjects(subject uuid PRIMARY KEY,admin_id uuid NOT NULL UNIQUE REFERENCES platform.admin_identities(id));

CREATE TABLE app_private.billing_plans(
 id uuid PRIMARY KEY,plan_key text NOT NULL CHECK(plan_key~'^[a-z][a-z0-9_-]{0,59}$'),version integer NOT NULL CHECK(version>0),
 name text NOT NULL CHECK(length(name) BETWEEN 1 AND 120),description_fr text NOT NULL,description_ar text NOT NULL,
 interval text NOT NULL CHECK(interval IN('month','year')),amount_minor bigint NOT NULL CHECK(amount_minor>=0),currency text NOT NULL CHECK(currency~'^[A-Z]{3}$'),
 trial_days integer CHECK(trial_days BETWEEN 1 AND 366),features jsonb NOT NULL,limits jsonb NOT NULL,
 archived boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(plan_key,version)
);

CREATE TABLE app_private.billing_subscriptions(
 agency_id uuid PRIMARY KEY REFERENCES tenancy.agencies(id),revision integer NOT NULL DEFAULT 1,plan_id uuid REFERENCES app_private.billing_plans(id),
 state text NOT NULL CHECK(state IN('trialing','active','pending_payment','past_due','grace_period','suspended','cancelled','expired')),
 period_start timestamptz,period_end timestamptz,trial_end timestamptz,grace_end timestamptz,
 cancel_at_end boolean NOT NULL DEFAULT false,pending_plan uuid REFERENCES app_private.billing_plans(id),suspended boolean NOT NULL DEFAULT false,
 CHECK(period_end>period_start),CHECK((period_start IS NULL)=(period_end IS NULL))
);

CREATE TABLE app_private.billing_trial_history(agency_id uuid PRIMARY KEY REFERENCES tenancy.agencies(id),plan_id uuid NOT NULL REFERENCES app_private.billing_plans(id),started_at timestamptz NOT NULL DEFAULT clock_timestamp());

CREATE TABLE app_private.billing_profiles(agency_id uuid PRIMARY KEY REFERENCES tenancy.agencies(id),profile jsonb NOT NULL);

CREATE TABLE app_private.billing_payments(
 id uuid PRIMARY KEY,agency_id uuid NOT NULL REFERENCES tenancy.agencies(id),plan_id uuid NOT NULL REFERENCES app_private.billing_plans(id),
 amount_minor bigint NOT NULL CHECK(amount_minor>=0),currency text NOT NULL CHECK(currency~'^[A-Z]{3}$'),
 period_start timestamptz NOT NULL,period_end timestamptz NOT NULL CHECK(period_end>period_start),
 source text NOT NULL CHECK(source IN('manual','provider')),state text NOT NULL DEFAULT 'pending' CHECK(state IN('pending','confirmed','rejected','refunded','cancelled','uncertain')),
 activation_state text NOT NULL DEFAULT 'pending' CHECK(activation_state IN('pending','applied','cancelled')),
 reference text UNIQUE CHECK(length(reference) BETWEEN 3 AND 160),invoice_reference text NOT NULL UNIQUE,
 subscription_revision integer NOT NULL,profile_snapshot jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),verified_by uuid,verified_at timestamptz,
 provider text,provider_sequence bigint NOT NULL DEFAULT -1,provider_payment_id text,UNIQUE(provider,provider_payment_id)
);

CREATE UNIQUE INDEX billing_one_pending ON app_private.billing_payments(agency_id) WHERE state IN('pending','uncertain');

CREATE UNIQUE INDEX billing_one_paid_renewal ON app_private.billing_payments(agency_id) WHERE state='confirmed' AND activation_state='pending';

CREATE TABLE app_private.billing_audit(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),agency_id uuid REFERENCES tenancy.agencies(id),actor uuid,action text NOT NULL,detail jsonb NOT NULL,at timestamptz NOT NULL DEFAULT clock_timestamp());

CREATE TABLE app_private.billing_receipts(scope text NOT NULL,request_id uuid NOT NULL,input jsonb NOT NULL,result jsonb NOT NULL,PRIMARY KEY(scope,request_id));

CREATE TABLE app_private.billing_usage(agency_id uuid NOT NULL REFERENCES tenancy.agencies(id),metric text NOT NULL,bucket text NOT NULL,used bigint NOT NULL DEFAULT 0 CHECK(used>=0),reserved bigint NOT NULL DEFAULT 0 CHECK(reserved>=0),PRIMARY KEY(agency_id,metric,bucket));

CREATE TABLE app_private.billing_reservations(agency_id uuid NOT NULL,metric text NOT NULL,logical_key text NOT NULL,bucket text NOT NULL,units bigint NOT NULL CHECK(units>0),state text NOT NULL CHECK(state IN('reserved','consumed','released')),PRIMARY KEY(agency_id,metric,logical_key),FOREIGN KEY(agency_id,metric,bucket) REFERENCES app_private.billing_usage(agency_id,metric,bucket));

CREATE TABLE app_private.billing_signing_admissions(agency_id uuid NOT NULL,session_id uuid NOT NULL,features jsonb NOT NULL,PRIMARY KEY(agency_id,session_id));

CREATE TABLE app_private.billing_provider_events(provider text NOT NULL,event_id text NOT NULL,body_hash text NOT NULL,payload jsonb NOT NULL,outcome text NOT NULL,received_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(provider,event_id));

CREATE TABLE app_private.billing_provider_operations(id uuid PRIMARY KEY,agency_id uuid NOT NULL REFERENCES tenancy.agencies(id),payment_id uuid NOT NULL REFERENCES app_private.billing_payments(id),provider text NOT NULL,kind text NOT NULL CHECK(kind IN('checkout','renew','cancel','refund')),state text NOT NULL CHECK(state IN('prepared','accepted','rejected','uncertain')),provider_reference text,UNIQUE(payment_id,kind));

CREATE TABLE app_private.billing_gateway_key(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),secret text NOT NULL CHECK(secret~'^[a-f0-9]{64}$'));

DO $tables$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['billing_admin_subjects','billing_plans','billing_subscriptions','billing_trial_history','billing_profiles','billing_payments','billing_audit','billing_receipts','billing_usage','billing_reservations','billing_signing_admissions','billing_provider_events','billing_provider_operations','billing_gateway_key'] LOOP
  EXECUTE format('ALTER TABLE app_private.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE app_private.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON app_private.%I FROM PUBLIC,anon,authenticated,service_role,contratpro_runtime,contratpro_platform_runtime',t);
  EXECUTE format('GRANT SELECT ON app_private.%I TO contratpro_billing_writer',t);
  -- These settings are internal scopes, never credentials. No caller can assume
  -- the writer or access its tables, even with a caller-chosen setting.
  IF t IN('billing_subscriptions','billing_trial_history','billing_profiles','billing_payments','billing_audit','billing_usage','billing_reservations','billing_signing_admissions','billing_provider_operations') THEN
   EXECUTE format('CREATE POLICY billing_scope ON app_private.%I TO contratpro_billing_writer USING(agency_id=nullif(current_setting(''contratpro.billing_agency'',true),'''')::uuid OR current_setting(''contratpro.billing_internal'',true)=''true'') WITH CHECK(agency_id=nullif(current_setting(''contratpro.billing_agency'',true),'''')::uuid OR current_setting(''contratpro.billing_internal'',true)=''true'')',t);
  ELSE EXECUTE format('CREATE POLICY billing_internal ON app_private.%I TO contratpro_billing_writer USING(true) WITH CHECK(true)',t);END IF;
 END LOOP;
END $tables$;

GRANT INSERT,UPDATE ON app_private.billing_plans,app_private.billing_subscriptions,app_private.billing_profiles,app_private.billing_payments,app_private.billing_usage,app_private.billing_reservations,app_private.billing_provider_operations TO contratpro_billing_writer;

GRANT INSERT ON app_private.billing_trial_history,app_private.billing_audit,app_private.billing_receipts,app_private.billing_provider_events,app_private.billing_signing_admissions TO contratpro_billing_writer;

CREATE TRIGGER billing_admission_immutable BEFORE UPDATE OR DELETE ON app_private.billing_signing_admissions FOR EACH ROW EXECUTE FUNCTION app_private.rental_receipt_immutable();

GRANT SELECT(id,state) ON platform.admin_identities TO contratpro_billing_writer;

CREATE POLICY billing_admin_read ON platform.admin_identities FOR SELECT TO contratpro_billing_writer USING(true);

CREATE TRIGGER billing_audit_immutable BEFORE UPDATE OR DELETE ON app_private.billing_audit FOR EACH ROW EXECUTE FUNCTION app_private.rental_receipt_immutable();

CREATE TRIGGER billing_receipt_immutable BEFORE UPDATE OR DELETE ON app_private.billing_receipts FOR EACH ROW EXECUTE FUNCTION app_private.rental_receipt_immutable();

CREATE TRIGGER billing_trial_immutable BEFORE UPDATE OR DELETE ON app_private.billing_trial_history FOR EACH ROW EXECUTE FUNCTION app_private.rental_receipt_immutable();

CREATE TRIGGER billing_event_immutable BEFORE UPDATE OR DELETE ON app_private.billing_provider_events FOR EACH ROW EXECUTE FUNCTION app_private.rental_receipt_immutable();

CREATE FUNCTION app_private.billing_plan_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP='DELETE' OR (to_jsonb(NEW)-'archived') IS DISTINCT FROM (to_jsonb(OLD)-'archived') THEN RAISE EXCEPTION 'Immutable pricing' USING ERRCODE='42501';END IF;RETURN NEW;
END $f$;

CREATE TRIGGER billing_plan_immutable BEFORE UPDATE OR DELETE ON app_private.billing_plans FOR EACH ROW EXECUTE FUNCTION app_private.billing_plan_guard();

CREATE FUNCTION app_private.billing_member(aid uuid,capability text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE actor uuid;BEGIN
 actor:=app_private.rental_member(aid);
 IF NOT EXISTS(SELECT 1 FROM tenancy.membership_roles mr JOIN tenancy.role_permissions rp ON rp.agency_id=mr.agency_id AND rp.role_id=mr.role_id WHERE mr.agency_id=aid AND mr.membership_id=actor AND rp.permission_key=capability) THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
 RETURN actor;
END $f$;

ALTER FUNCTION app_private.billing_member(uuid,text) OWNER TO contratpro_rental_writer;

REVOKE ALL ON FUNCTION app_private.billing_member(uuid,text) FROM PUBLIC,anon,authenticated,service_role;

GRANT EXECUTE ON FUNCTION app_private.billing_member(uuid,text) TO contratpro_billing_writer;

CREATE FUNCTION app_private.billing_reviewer_conflict(aid uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
 SELECT EXISTS(SELECT 1 FROM tenancy.memberships WHERE agency_id=aid AND user_id=app_private.canonical_auth_user())
$f$;

ALTER FUNCTION app_private.billing_reviewer_conflict(uuid) OWNER TO contratpro_rental_writer;

REVOKE ALL ON FUNCTION app_private.billing_reviewer_conflict(uuid) FROM PUBLIC,anon,authenticated,service_role;

GRANT EXECUTE ON FUNCTION app_private.billing_reviewer_conflict(uuid) TO contratpro_billing_writer;

CREATE FUNCTION app_private.billing_admin() RETURNS uuid LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE actor uuid;BEGIN
 IF auth.jwt()->>'aal' IS DISTINCT FROM 'aal2' THEN RAISE EXCEPTION 'MFA required' USING ERRCODE='42501';END IF;
 SELECT a.id INTO actor FROM app_private.billing_admin_subjects s JOIN platform.admin_identities a ON a.id=s.admin_id WHERE s.subject=auth.uid() AND a.state='active';
 IF actor IS NULL THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;RETURN actor;
END $f$;

CREATE FUNCTION app_private.billing_access(aid uuid,feature text) RETURNS app_private.billing_subscriptions LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE s app_private.billing_subscriptions;p app_private.billing_plans;t timestamptz:=clock_timestamp();BEGIN
 PERFORM set_config('contratpro.billing_agency',aid::text,true);
 PERFORM app_private.billing_refresh(aid);
 SELECT * INTO s FROM app_private.billing_subscriptions WHERE agency_id=aid FOR UPDATE;
 IF s.agency_id IS NULL OR s.suspended OR NOT (
  (s.state='trialing' AND t<s.trial_end) OR (s.state IN('active','past_due') AND t<s.period_end) OR (s.state='grace_period' AND t<s.grace_end)
 ) THEN RAISE EXCEPTION 'Subscription restricted' USING ERRCODE='PBL02';END IF;
 SELECT * INTO STRICT p FROM app_private.billing_plans WHERE id=s.plan_id;
 IF NOT p.features ? feature THEN RAISE EXCEPTION 'Feature restricted' USING ERRCODE='PBL02';END IF;
 RETURN s;
END $f$;

CREATE FUNCTION app_private.billing_reserve(aid uuid,metric text,logical text,units bigint) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
#variable_conflict use_column
DECLARE s app_private.billing_subscriptions;p app_private.billing_plans;r app_private.billing_reservations;u app_private.billing_usage;b text;lim bigint;BEGIN
 PERFORM set_config('contratpro.billing_agency',aid::text,true);
 IF metric NOT IN('contracts','vehicles','team','templates','documents','signatures','email','storage') OR units<=0 THEN RAISE EXCEPTION 'Invalid metric' USING ERRCODE='22023';END IF;
 SELECT * INTO s FROM app_private.billing_subscriptions WHERE agency_id=aid FOR UPDATE;
 SELECT * INTO r FROM app_private.billing_reservations br WHERE br.agency_id=aid AND br.metric=billing_reserve.metric AND br.logical_key=logical;
 IF r.state IN('reserved','consumed') THEN IF r.units<>units THEN RAISE EXCEPTION 'Usage replay conflict' USING ERRCODE='40001';END IF;RETURN;END IF;
 s:=app_private.billing_access(aid,metric);
 SELECT * INTO STRICT p FROM app_private.billing_plans WHERE id=s.plan_id;
 b:=CASE WHEN metric IN('vehicles','team','templates','storage') THEN 'current' ELSE (extract(epoch FROM s.period_start)*1000000)::bigint::text END;
 -- Explicit null/missing limit means unlimited; disabled features still denied above.
 lim:=(p.limits->>metric)::bigint;
 INSERT INTO app_private.billing_usage(agency_id,metric,bucket) VALUES(aid,metric,b) ON CONFLICT DO NOTHING;
 SELECT * INTO STRICT u FROM app_private.billing_usage WHERE agency_id=aid AND billing_usage.metric=billing_reserve.metric AND bucket=b FOR UPDATE;
 IF lim IS NOT NULL AND (units>lim OR u.used>lim-units OR u.reserved>lim-units-u.used) THEN RAISE EXCEPTION 'Quota exceeded' USING ERRCODE='PBL01';END IF;
 UPDATE app_private.billing_usage SET reserved=reserved+units WHERE agency_id=aid AND billing_usage.metric=billing_reserve.metric AND bucket=b;
 INSERT INTO app_private.billing_reservations VALUES(aid,metric,logical,b,units,'reserved') ON CONFLICT(agency_id,metric,logical_key) DO UPDATE SET bucket=EXCLUDED.bucket,units=EXCLUDED.units,state='reserved';
END $f$;

CREATE FUNCTION app_private.billing_transition(aid uuid,target text,actor uuid,reason text) RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE s app_private.billing_subscriptions;allowed text[];BEGIN
 SELECT * INTO STRICT s FROM app_private.billing_subscriptions WHERE agency_id=aid FOR UPDATE;
 allowed:=CASE s.state
 WHEN 'trialing' THEN ARRAY['pending_payment','expired','cancelled','suspended']
 WHEN 'active' THEN ARRAY['pending_payment','past_due','cancelled','suspended','expired']
 WHEN 'pending_payment' THEN ARRAY['past_due','cancelled','expired','suspended']
 WHEN 'past_due' THEN ARRAY['grace_period','suspended','cancelled','expired']
 WHEN 'grace_period' THEN ARRAY['suspended','cancelled','expired']
 WHEN 'suspended' THEN ARRAY['pending_payment','cancelled','expired']
 ELSE ARRAY['pending_payment'] END;
 IF target IS NULL OR NOT target=ANY(allowed) THEN RAISE EXCEPTION 'Invalid transition' USING ERRCODE='40001';END IF;
 UPDATE app_private.billing_subscriptions SET state=target,revision=revision+1 WHERE agency_id=aid;
 IF target='suspended' THEN UPDATE app_private.billing_subscriptions SET suspended=true WHERE agency_id=aid;END IF;
 IF target='cancelled' THEN
  UPDATE app_private.billing_subscriptions SET cancel_at_end=true,pending_plan=NULL WHERE agency_id=aid;
  UPDATE app_private.billing_payments SET activation_state='cancelled' WHERE agency_id=aid AND activation_state='pending';
 END IF;
 INSERT INTO app_private.billing_audit(agency_id,actor,action,detail) VALUES(aid,actor,'transition',jsonb_build_object('from',s.state,'to',target,'reason',reason,'previous',to_jsonb(s)));
END $f$;

CREATE FUNCTION app_private.billing_snapshot(aid uuid) RETURNS jsonb LANGUAGE sql SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
 SELECT jsonb_build_object('subscription',(SELECT to_jsonb(s) FROM app_private.billing_subscriptions s WHERE s.agency_id=aid),
 'plans',COALESCE((SELECT jsonb_agg(to_jsonb(p)||jsonb_build_object('amount_minor',p.amount_minor::text) ORDER BY p.plan_key,p.version DESC) FROM app_private.billing_plans p WHERE NOT p.archived OR p.id IN(SELECT plan_id FROM app_private.billing_subscriptions WHERE agency_id=aid)),'[]'::jsonb),
 'usage',COALESCE((SELECT jsonb_agg(to_jsonb(u)||jsonb_build_object('used',u.used::text,'reserved',u.reserved::text)) FROM app_private.billing_usage u WHERE u.agency_id=aid AND (u.bucket='current' OR u.bucket=(SELECT (extract(epoch FROM period_start)*1000000)::bigint::text FROM app_private.billing_subscriptions WHERE agency_id=aid))),'[]'::jsonb),
 'payments',COALESCE((SELECT jsonb_agg(to_jsonb(p)||jsonb_build_object('amount_minor',p.amount_minor::text) ORDER BY p.created_at DESC) FROM (SELECT * FROM app_private.billing_payments WHERE agency_id=aid ORDER BY created_at DESC LIMIT 100) p),'[]'::jsonb),
 'profile',COALESCE((SELECT profile FROM app_private.billing_profiles WHERE agency_id=aid),'{}'::jsonb))
$f$;

CREATE FUNCTION app_private.billing_catalog(p jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE result jsonb;k text;v jsonb;BEGIN
 IF jsonb_typeof(p->'features') IS DISTINCT FROM 'array' OR jsonb_typeof(p->'limits') IS DISTINCT FROM 'object'
 OR (p->>'amount_minor') !~ '^(0|[1-9][0-9]{0,18})$' OR p->>'amount_minor' IS NULL
 OR length(COALESCE(p->>'description_fr',''))=0 OR length(COALESCE(p->>'description_ar',''))=0
 OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(p->'features') x WHERE x NOT IN('contracts','vehicles','team','templates','documents','signatures','email','sheets','storage'))
 THEN RAISE EXCEPTION 'Invalid catalog' USING ERRCODE='22023';END IF;
 FOR k,v IN SELECT * FROM jsonb_each(p->'limits') LOOP
  IF k NOT IN('contracts','vehicles','team','templates','documents','signatures','email','sheets','storage') OR (v<>'null'::jsonb AND (jsonb_typeof(v)<>'string' OR (v#>>'{}') !~ '^(0|[1-9][0-9]{0,18})$' OR (v#>>'{}')::numeric>9223372036854775807)) THEN RAISE EXCEPTION 'Invalid limit' USING ERRCODE='22023';END IF;
 END LOOP;
 -- Per-plan advisory lock protects monotonic versions, not just a unique version pair.
 PERFORM pg_advisory_xact_lock(hashtextextended(p->>'plan_key',0));
 IF (p->>'version')::integer<>COALESCE((SELECT max(version)+1 FROM app_private.billing_plans WHERE plan_key=p->>'plan_key'),1) THEN RAISE EXCEPTION 'Catalog version conflict' USING ERRCODE='40001';END IF;
 INSERT INTO app_private.billing_plans(id,plan_key,version,name,description_fr,description_ar,interval,amount_minor,currency,trial_days,features,limits)
 VALUES((p->>'id')::uuid,p->>'plan_key',(p->>'version')::integer,p->>'name',p->>'description_fr',p->>'description_ar',p->>'interval',(p->>'amount_minor')::bigint,p->>'currency',(p->>'trial_days')::integer,p->'features',p->'limits') RETURNING to_jsonb(billing_plans)||jsonb_build_object('amount_minor',billing_plans.amount_minor::text) INTO result;
 RETURN result;
END $f$;

CREATE FUNCTION public.contratpro_billing_agency(p_agency_id uuid,p_action text,p_input jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE actor uuid;s app_private.billing_subscriptions;p app_private.billing_plans;r app_private.billing_receipts;result jsonb;v_scope text;pid uuid;start_at timestamptz;end_at timestamptz;profile jsonb;BEGIN
 actor:=app_private.billing_member(p_agency_id,CASE WHEN p_action IN('dashboard','document') THEN 'billing.view' ELSE 'billing.manage' END);
 PERFORM set_config('contratpro.billing_agency',p_agency_id::text,true);
 IF p_action IN('confirm','catalog','transition','refund','suspend','reactivate') THEN RAISE EXCEPTION 'Platform authorization required' USING ERRCODE='42501';END IF;
 IF jsonb_typeof(p_input) IS DISTINCT FROM 'object' OR pg_column_size(p_input)>16384 THEN RAISE EXCEPTION 'Invalid input' USING ERRCODE='22023';END IF;
 IF p_action='dashboard' THEN PERFORM app_private.billing_refresh(p_agency_id);RETURN app_private.billing_snapshot(p_agency_id);END IF;
 IF p_action='document' THEN
  SELECT jsonb_build_object('kind','internal-billing-record','payment',to_jsonb(x)||jsonb_build_object('amount_minor',x.amount_minor::text),'taxInvoice',false) INTO result FROM app_private.billing_payments x WHERE x.agency_id=p_agency_id AND x.id=(p_input->>'id')::uuid;
  IF result IS NULL THEN RAISE EXCEPTION 'Missing' USING ERRCODE='P0002';END IF;RETURN result;
 END IF;
 IF p_input->>'requestId' IS NULL THEN RAISE EXCEPTION 'Request ID required' USING ERRCODE='22023';END IF;
 v_scope:='agency:'||p_agency_id::text||':'||actor::text||':'||p_action;
 PERFORM pg_advisory_xact_lock(hashtextextended('billing:'||p_agency_id::text,0));
 SELECT * INTO r FROM app_private.billing_receipts WHERE billing_receipts.scope=v_scope AND request_id=(p_input->>'requestId')::uuid;
 IF r.scope IS NOT NULL THEN IF r.input<>p_input THEN RAISE EXCEPTION 'Replay mismatch' USING ERRCODE='40001';END IF;RETURN r.result;END IF;
 SELECT * INTO s FROM app_private.billing_subscriptions WHERE agency_id=p_agency_id FOR UPDATE;
 IF p_action='profile' THEN
  profile:=jsonb_build_object('name',left(COALESCE(p_input->>'name',''),160),'address',left(COALESCE(p_input->>'address',''),1000),'taxId',left(COALESCE(p_input->>'taxId',''),80));
  INSERT INTO app_private.billing_profiles VALUES(p_agency_id,profile) ON CONFLICT(agency_id) DO UPDATE SET profile=EXCLUDED.profile;
 ELSIF p_action='trial' THEN
  IF s.agency_id IS NOT NULL THEN RAISE EXCEPTION 'Subscription exists' USING ERRCODE='40001';END IF;
  SELECT * INTO STRICT p FROM app_private.billing_plans WHERE id=(p_input->>'planId')::uuid AND NOT archived;
  IF p.trial_days IS NULL THEN RAISE EXCEPTION 'No configured trial' USING ERRCODE='22023';END IF;
  INSERT INTO app_private.billing_trial_history(agency_id,plan_id) VALUES(p_agency_id,p.id);
  start_at:=clock_timestamp();end_at:=start_at+make_interval(days=>p.trial_days);
  INSERT INTO app_private.billing_subscriptions(agency_id,plan_id,state,period_start,period_end,trial_end) VALUES(p_agency_id,p.id,'trialing',start_at,end_at,end_at);
 ELSIF p_action='cancel' THEN
  IF s.agency_id IS NULL OR s.revision IS DISTINCT FROM (p_input->>'revision')::integer THEN RAISE EXCEPTION 'Revision conflict' USING ERRCODE='40001';END IF;
  IF s.state IN('active','trialing','grace_period','past_due') THEN UPDATE app_private.billing_subscriptions SET cancel_at_end=true,pending_plan=NULL,revision=revision+1 WHERE agency_id=p_agency_id;
  ELSE PERFORM app_private.billing_transition(p_agency_id,'cancelled',actor,'agency cancellation');END IF;
  UPDATE app_private.billing_payments SET state='cancelled' WHERE agency_id=p_agency_id AND state IN('pending','uncertain');
  UPDATE app_private.billing_payments SET activation_state='cancelled' WHERE agency_id=p_agency_id AND activation_state='pending';
 ELSIF p_action IN('request','renew','change') THEN
  SELECT * INTO STRICT p FROM app_private.billing_plans WHERE id=(p_input->>'planId')::uuid AND NOT archived;
  IF s.agency_id IS NOT NULL AND s.revision IS DISTINCT FROM (p_input->>'revision')::integer THEN RAISE EXCEPTION 'Revision conflict' USING ERRCODE='40001';END IF;
  IF s.suspended THEN RAISE EXCEPTION 'Suspended' USING ERRCODE='42501';END IF;
  IF EXISTS(SELECT 1 FROM app_private.billing_payments WHERE agency_id=p_agency_id AND state='confirmed' AND activation_state='pending') THEN RAISE EXCEPTION 'A verified renewal is already scheduled' USING ERRCODE='40001';END IF;
  -- All plan changes take effect next period. No unverified upgrade or quota reset.
  start_at:=CASE WHEN s.state IN('active','trialing','past_due','grace_period') AND s.period_end>clock_timestamp() THEN s.period_end ELSE clock_timestamp() END;
  end_at:=((start_at AT TIME ZONE 'UTC')+CASE WHEN p.interval='year' THEN interval '1 year' ELSE interval '1 month' END) AT TIME ZONE 'UTC';
  IF s.agency_id IS NULL THEN INSERT INTO app_private.billing_subscriptions(agency_id,state,pending_plan) VALUES(p_agency_id,'pending_payment',p.id);
  ELSE UPDATE app_private.billing_subscriptions SET pending_plan=p.id,cancel_at_end=false,revision=revision+1 WHERE agency_id=p_agency_id;END IF;
  SELECT * INTO STRICT s FROM app_private.billing_subscriptions WHERE agency_id=p_agency_id;
  pid:=gen_random_uuid();
  INSERT INTO app_private.billing_payments(id,agency_id,plan_id,amount_minor,currency,period_start,period_end,source,invoice_reference,subscription_revision,profile_snapshot)
  VALUES(pid,p_agency_id,p.id,p.amount_minor,p.currency,start_at,end_at,'manual','CP-INTERNAL-'||pid::text,s.revision,COALESCE((SELECT bp.profile FROM app_private.billing_profiles bp WHERE bp.agency_id=p_agency_id),'{}'::jsonb));
 ELSIF p_action='reference' THEN
  IF length(trim(COALESCE(p_input->>'reference','')))<3 THEN RAISE EXCEPTION 'Invalid reference' USING ERRCODE='22023';END IF;
  UPDATE app_private.billing_payments SET reference=upper(trim(p_input->>'reference')) WHERE id=(p_input->>'paymentId')::uuid AND agency_id=p_agency_id AND source='manual' AND state='pending' AND reference IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment conflict' USING ERRCODE='40001';END IF;
 ELSE RAISE EXCEPTION 'Invalid action' USING ERRCODE='22023';END IF;
 INSERT INTO app_private.billing_audit(agency_id,actor,action,detail) VALUES(p_agency_id,actor,'agency.'||p_action,p_input-'requestId');
 result:=app_private.billing_snapshot(p_agency_id);
 INSERT INTO app_private.billing_receipts VALUES(v_scope,(p_input->>'requestId')::uuid,p_input,result);RETURN result;
END $f$;

CREATE FUNCTION app_private.billing_settle(aid uuid,metric text,logical text,consume boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
#variable_conflict use_column
DECLARE r app_private.billing_reservations;BEGIN
 PERFORM set_config('contratpro.billing_agency',aid::text,true);
 PERFORM 1 FROM app_private.billing_subscriptions WHERE agency_id=aid FOR UPDATE;
 SELECT * INTO r FROM app_private.billing_reservations WHERE agency_id=aid AND billing_reservations.metric=billing_settle.metric AND logical_key=logical FOR UPDATE;
 IF r.agency_id IS NULL OR (consume AND r.state='consumed') OR (NOT consume AND r.state='released') THEN RETURN;END IF;
 IF consume AND r.state<>'reserved' THEN RAISE EXCEPTION 'Reservation missing' USING ERRCODE='40001';END IF;
 IF NOT consume AND r.state='consumed' AND metric NOT IN('vehicles','team','templates','storage') THEN RETURN;END IF;
 UPDATE app_private.billing_usage SET reserved=reserved-CASE WHEN r.state='reserved' THEN r.units ELSE 0 END,used=used+CASE WHEN consume THEN r.units WHEN r.state='consumed' THEN -r.units ELSE 0 END WHERE agency_id=aid AND billing_usage.metric=billing_settle.metric AND bucket=r.bucket;
 UPDATE app_private.billing_reservations SET state=CASE WHEN consume THEN 'consumed' ELSE 'released' END WHERE agency_id=aid AND billing_reservations.metric=billing_settle.metric AND logical_key=logical;
END $f$;

CREATE FUNCTION app_private.billing_refresh(aid uuid) RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE s app_private.billing_subscriptions;p app_private.billing_payments;t timestamptz:=clock_timestamp();BEGIN
 PERFORM set_config('contratpro.billing_agency',aid::text,true);
 SELECT * INTO s FROM app_private.billing_subscriptions WHERE agency_id=aid FOR UPDATE;
 IF s.agency_id IS NULL THEN RETURN;END IF;
 SELECT * INTO p FROM app_private.billing_payments WHERE agency_id=aid AND state='confirmed' AND activation_state='pending' AND plan_id=s.pending_plan AND period_start<=t AND period_end>t ORDER BY period_start DESC LIMIT 1;
 IF p.id IS NOT NULL AND NOT s.suspended AND NOT s.cancel_at_end THEN
  UPDATE app_private.billing_subscriptions SET plan_id=p.plan_id,state='active',period_start=p.period_start,period_end=p.period_end,trial_end=NULL,grace_end=NULL,pending_plan=NULL,revision=revision+1 WHERE agency_id=aid;
  UPDATE app_private.billing_payments SET activation_state='applied' WHERE id=p.id;
  INSERT INTO app_private.billing_audit(agency_id,action,detail) VALUES(aid,'verified.activation',jsonb_build_object('paymentId',p.id,'source',p.source,'previous',to_jsonb(s)));
 ELSIF (s.state='trialing' AND s.trial_end<=t) OR (s.state IN('active','past_due') AND s.period_end<=t) OR (s.state='grace_period' AND s.grace_end<=t) THEN
  PERFORM app_private.billing_transition(aid,CASE WHEN s.cancel_at_end THEN 'cancelled' ELSE 'expired' END,NULL,'period elapsed');
 END IF;
END $f$;

CREATE FUNCTION app_private.billing_confirm(pid uuid,actor uuid,evidence text) RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE p app_private.billing_payments;s app_private.billing_subscriptions;aid uuid;BEGIN
 SELECT agency_id INTO STRICT aid FROM app_private.billing_payments WHERE id=pid;
 SELECT * INTO STRICT s FROM app_private.billing_subscriptions WHERE agency_id=aid FOR UPDATE;
 SELECT * INTO STRICT p FROM app_private.billing_payments WHERE id=pid FOR UPDATE;
 IF p.source='manual' AND app_private.billing_reviewer_conflict(aid) THEN RAISE EXCEPTION 'Independent payment reviewer required' USING ERRCODE='42501';END IF;
 IF p.state='confirmed' THEN RETURN;END IF;
 IF p.state NOT IN('pending','uncertain') OR s.revision<>p.subscription_revision OR s.cancel_at_end OR s.suspended OR p.period_end<=clock_timestamp() OR length(trim(COALESCE(evidence,'')))<3 THEN RAISE EXCEPTION 'Stale or unverified payment' USING ERRCODE='40001';END IF;
 IF p.source='manual' AND p.reference IS NULL THEN RAISE EXCEPTION 'Reference required' USING ERRCODE='22023';END IF;
 UPDATE app_private.billing_payments SET state='confirmed',verified_by=actor,verified_at=clock_timestamp() WHERE id=pid;
 INSERT INTO app_private.billing_audit(agency_id,actor,action,detail) VALUES(aid,actor,'payment.'||p.source||'.confirmed',jsonb_build_object('paymentId',pid,'evidence',left(evidence,500)));
 PERFORM app_private.billing_refresh(aid);
END $f$;

CREATE FUNCTION public.contratpro_billing_platform(p_action text,p_input jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE actor uuid;aid uuid;r app_private.billing_receipts;result jsonb;v_scope text;s app_private.billing_subscriptions;pay app_private.billing_payments;BEGIN
 actor:=app_private.billing_admin();
 PERFORM set_config('contratpro.billing_internal','true',true);
 IF jsonb_typeof(p_input) IS DISTINCT FROM 'object' OR pg_column_size(p_input)>32768 THEN RAISE EXCEPTION 'Invalid input' USING ERRCODE='22023';END IF;
 IF p_action='dashboard' THEN
  -- Projection intentionally excludes customer data, signing/storage keys, profiles and provider payloads.
  RETURN jsonb_build_object('agencies',COALESCE((SELECT jsonb_agg(to_jsonb(a)) FROM (SELECT id,name,state FROM tenancy.agencies ORDER BY id LIMIT 500) a),'[]'::jsonb),
   'subscriptions',COALESCE((SELECT jsonb_agg(to_jsonb(bs)) FROM (SELECT * FROM app_private.billing_subscriptions ORDER BY agency_id LIMIT 500) bs),'[]'::jsonb),
   'plans',COALESCE((SELECT jsonb_agg(to_jsonb(p)||jsonb_build_object('amount_minor',p.amount_minor::text)) FROM app_private.billing_plans p),'[]'::jsonb),
   'payments',COALESCE((SELECT jsonb_agg(to_jsonb(p)||jsonb_build_object('amount_minor',p.amount_minor::text)) FROM (SELECT id,agency_id,plan_id,source,state,reference,amount_minor,currency,invoice_reference,period_start,period_end FROM app_private.billing_payments ORDER BY created_at DESC LIMIT 200) p),'[]'::jsonb),
   'usage',COALESCE((SELECT jsonb_agg(to_jsonb(u)||jsonb_build_object('used',u.used::text,'reserved',u.reserved::text)) FROM (SELECT * FROM app_private.billing_usage ORDER BY agency_id LIMIT 500) u),'[]'::jsonb),
   'events',COALESCE((SELECT jsonb_agg(to_jsonb(e)) FROM (SELECT provider,event_id,outcome,received_at FROM app_private.billing_provider_events WHERE outcome<>'applied' ORDER BY received_at DESC LIMIT 100) e),'[]'::jsonb));
 END IF;
 IF p_input->>'requestId' IS NULL OR length(trim(COALESCE(p_input->>'reason','')))<3 THEN RAISE EXCEPTION 'Request and reason required' USING ERRCODE='22023';END IF;
 v_scope:='platform:'||actor::text||':'||p_action;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_scope||':'||(p_input->>'requestId'),0));
 SELECT * INTO r FROM app_private.billing_receipts WHERE billing_receipts.scope=v_scope AND request_id=(p_input->>'requestId')::uuid;
 IF r.scope IS NOT NULL THEN IF r.input<>p_input THEN RAISE EXCEPTION 'Replay conflict' USING ERRCODE='40001';END IF;RETURN r.result;END IF;
 aid:=(p_input->>'agencyId')::uuid;
 IF p_action='catalog' THEN result:=app_private.billing_catalog(p_input->'plan');
 ELSIF p_action='archive' THEN
  UPDATE app_private.billing_plans SET archived=(p_input->>'archived')::boolean WHERE id=(p_input->>'planId')::uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Missing plan' USING ERRCODE='P0002';END IF;
 ELSIF p_action IN('confirm','reject','refund') THEN
  SELECT * INTO STRICT pay FROM app_private.billing_payments WHERE id=(p_input->>'paymentId')::uuid;aid:=pay.agency_id;
  PERFORM 1 FROM app_private.billing_subscriptions WHERE agency_id=aid FOR UPDATE;
  SELECT * INTO STRICT pay FROM app_private.billing_payments WHERE id=pay.id FOR UPDATE;
  IF pay.source<>'manual' THEN RAISE EXCEPTION 'Provider evidence required' USING ERRCODE='42501';END IF;
  IF p_action='confirm' THEN PERFORM app_private.billing_confirm(pay.id,actor,p_input->>'reason');
  ELSIF p_action='reject' AND pay.state='pending' THEN UPDATE app_private.billing_payments SET state='rejected' WHERE id=pay.id;
  ELSIF p_action='refund' AND pay.state='confirmed' THEN UPDATE app_private.billing_payments SET state='refunded' WHERE id=pay.id;
   -- Recording an externally verified manual refund never silently deletes tenant data.
  ELSE RAISE EXCEPTION 'Payment state conflict' USING ERRCODE='40001';END IF;
 ELSIF p_action IN('suspend','reactivate','transition','refresh') THEN
  SELECT * INTO STRICT s FROM app_private.billing_subscriptions WHERE agency_id=aid FOR UPDATE;
  IF s.revision IS DISTINCT FROM (p_input->>'revision')::integer THEN RAISE EXCEPTION 'Revision conflict' USING ERRCODE='40001';END IF;
  IF p_action='suspend' THEN UPDATE app_private.billing_subscriptions SET suspended=true,revision=revision+1 WHERE agency_id=aid;
  ELSIF p_action='reactivate' THEN UPDATE app_private.billing_subscriptions SET suspended=false,revision=revision+1 WHERE agency_id=aid;
  ELSIF p_action='refresh' THEN PERFORM app_private.billing_refresh(aid);
  ELSE
   IF p_input->>'target'='grace_period' THEN
    IF (p_input->>'graceEnd')::timestamptz IS NULL OR (p_input->>'graceEnd')::timestamptz<=clock_timestamp() THEN RAISE EXCEPTION 'Explicit grace end required' USING ERRCODE='22023';END IF;
    UPDATE app_private.billing_subscriptions SET grace_end=(p_input->>'graceEnd')::timestamptz WHERE agency_id=aid;
   END IF;
   PERFORM app_private.billing_transition(aid,p_input->>'target',actor,p_input->>'reason');
  END IF;
 ELSE RAISE EXCEPTION 'Invalid action' USING ERRCODE='22023';END IF;
 INSERT INTO app_private.billing_audit(agency_id,actor,action,detail) VALUES(aid,actor,'platform.'||p_action,p_input-'plan');
 result:=COALESCE(result,'true'::jsonb);INSERT INTO app_private.billing_receipts VALUES(v_scope,(p_input->>'requestId')::uuid,p_input,result);RETURN result;
END $f$;

GRANT USAGE ON SCHEMA tenancy TO contratpro_billing_writer;

GRANT SELECT(id,name,state) ON tenancy.agencies TO contratpro_billing_writer;

CREATE POLICY billing_agency_names ON tenancy.agencies FOR SELECT TO contratpro_billing_writer USING(true);

CREATE FUNCTION app_private.billing_resource() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE aid uuid;metric text;logical text;enabled boolean;was_enabled boolean:=false;units bigint:=1;BEGIN
 aid:=COALESCE(NEW.agency_id,OLD.agency_id);
 PERFORM set_config('contratpro.billing_agency',aid::text,true);
 metric:=TG_ARGV[0];logical:=COALESCE(to_jsonb(NEW)->>TG_ARGV[1],to_jsonb(OLD)->>TG_ARGV[1]);
 enabled:=TG_OP<>'DELETE';
 IF metric IN('vehicles','team') THEN enabled:=enabled AND NEW.state='active';IF TG_OP<>'INSERT' THEN was_enabled:=OLD.state='active';END IF;
 ELSIF metric='templates' THEN enabled:=enabled AND NOT NEW.archived;IF TG_OP<>'INSERT' THEN was_enabled:=NOT OLD.archived;END IF;
 ELSIF TG_OP<>'INSERT' THEN was_enabled:=true;END IF;
 IF enabled AND NOT was_enabled THEN
  IF metric='team' AND TG_OP='INSERT' AND NOT EXISTS(SELECT 1 FROM app_private.billing_subscriptions WHERE agency_id=aid) THEN
   -- Initial agency owner provisioning must precede choosing a commercial plan.
   -- Exactly one bootstrap member is allowed; it counts against every later plan.
   PERFORM pg_advisory_xact_lock(hashtextextended('billing:'||aid::text,0));
   IF NOT EXISTS(SELECT 1 FROM app_private.billing_usage WHERE agency_id=aid AND billing_usage.metric='team' AND bucket='current') THEN
    INSERT INTO app_private.billing_usage VALUES(aid,'team','current',1,0);
    INSERT INTO app_private.billing_reservations VALUES(aid,'team',logical,'current',1,'consumed');RETURN NEW;
   END IF;
  END IF;
  PERFORM app_private.billing_reserve(aid,metric,logical,units);PERFORM app_private.billing_settle(aid,metric,logical,true);
  IF metric='signatures' THEN INSERT INTO app_private.billing_signing_admissions SELECT aid,logical::uuid,p.features FROM app_private.billing_subscriptions s JOIN app_private.billing_plans p ON p.id=s.plan_id WHERE s.agency_id=aid;END IF;
 ELSIF was_enabled AND NOT enabled THEN PERFORM app_private.billing_settle(aid,metric,logical,false);END IF;
 RETURN COALESCE(NEW,OLD);
END $f$;

CREATE TRIGGER billing_contract BEFORE INSERT ON tenancy.rental_contracts FOR EACH ROW EXECUTE FUNCTION app_private.billing_resource('contracts','id');

CREATE TRIGGER billing_vehicle BEFORE INSERT OR UPDATE OF state OR DELETE ON tenancy.vehicles FOR EACH ROW EXECUTE FUNCTION app_private.billing_resource('vehicles','id');

CREATE TRIGGER billing_team BEFORE INSERT OR UPDATE OF state OR DELETE ON tenancy.memberships FOR EACH ROW EXECUTE FUNCTION app_private.billing_resource('team','id');

CREATE TRIGGER billing_template BEFORE INSERT OR UPDATE OF archived OR DELETE ON app_private.contract_templates FOR EACH ROW EXECUTE FUNCTION app_private.billing_resource('templates','id');

CREATE TRIGGER billing_document BEFORE INSERT ON app_private.contract_artifacts FOR EACH ROW EXECUTE FUNCTION app_private.billing_resource('documents','request_id');

CREATE FUNCTION app_private.billing_feature_write() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
BEGIN PERFORM app_private.billing_access(NEW.agency_id,TG_ARGV[0]);RETURN NEW;END $f$;

CREATE TRIGGER billing_template_version BEFORE INSERT ON app_private.contract_template_versions FOR EACH ROW EXECUTE FUNCTION app_private.billing_feature_write('templates');

CREATE TRIGGER billing_generation_admission BEFORE INSERT ON app_private.contract_generation_jobs FOR EACH ROW EXECUTE FUNCTION app_private.billing_feature_write('documents');

CREATE TRIGGER billing_vehicle_edit BEFORE UPDATE OF registration,make,model,model_year,category,fuel_type,transmission ON tenancy.vehicles FOR EACH ROW EXECUTE FUNCTION app_private.billing_feature_write('vehicles');

CREATE TRIGGER billing_signature BEFORE INSERT ON app_private.signing_sessions FOR EACH ROW EXECUTE FUNCTION app_private.billing_resource('signatures','id');

CREATE FUNCTION app_private.billing_sheets() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
BEGIN
 IF (TG_OP='INSERT' AND (NEW.enabled OR NEW.envelope IS NOT NULL)) OR (TG_OP='UPDATE' AND ((NEW.enabled AND (NOT OLD.enabled OR NEW.destination IS DISTINCT FROM OLD.destination)) OR (NEW.envelope IS NOT NULL AND OLD.envelope IS NULL))) THEN PERFORM app_private.billing_access(NEW.agency_id,'sheets');END IF;RETURN NEW;
END $f$;

CREATE TRIGGER billing_sheets BEFORE INSERT OR UPDATE ON app_private.sheets_connections FOR EACH ROW EXECUTE FUNCTION app_private.billing_sheets();

CREATE FUNCTION app_private.billing_storage() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE aid uuid;logical text;units bigint;admitted boolean:=false;b text:='current';sid uuid;BEGIN
 IF COALESCE(NEW.bucket_id,OLD.bucket_id)<>'contract-documents' THEN RETURN COALESCE(NEW,OLD);END IF;
 aid:=split_part(COALESCE(NEW.name,OLD.name),'/',1)::uuid;logical:=COALESCE(NEW.bucket_id,OLD.bucket_id)||':'||COALESCE(NEW.name,OLD.name);
 PERFORM set_config('contratpro.billing_agency',aid::text,true);
 IF TG_OP='DELETE' THEN PERFORM app_private.billing_settle(aid,'storage',logical,false);RETURN OLD;END IF;
 units:=(to_jsonb(NEW)->'metadata'->>'size')::bigint;
 IF units IS NULL OR units<0 THEN RAISE EXCEPTION 'Verified storage size required' USING ERRCODE='22023';END IF;
 IF TG_OP='UPDATE' THEN
  IF NEW.name IS DISTINCT FROM OLD.name OR NEW.bucket_id IS DISTINCT FROM OLD.bucket_id OR NEW.metadata IS DISTINCT FROM OLD.metadata THEN RAISE EXCEPTION 'Immutable object accounting' USING ERRCODE='42501';END IF;RETURN NEW;
 END IF;
 IF units=0 THEN RETURN NEW;END IF;
 IF split_part(NEW.name,'/',2)='issued' THEN
  -- Signing objects were authorized by the admitted session and existing storage ACL.
  sid:=split_part(NEW.name,'/',3)::uuid;
  SELECT EXISTS(SELECT 1 FROM app_private.billing_reservations WHERE agency_id=aid AND metric='signatures' AND logical_key=sid::text AND state='consumed') INTO admitted;
 END IF;
 IF admitted THEN
  PERFORM 1 FROM app_private.billing_subscriptions WHERE agency_id=aid FOR UPDATE;
  INSERT INTO app_private.billing_usage(agency_id,metric,bucket,used) VALUES(aid,'storage',b,units) ON CONFLICT(agency_id,metric,bucket) DO UPDATE SET used=billing_usage.used+units;
  INSERT INTO app_private.billing_reservations VALUES(aid,'storage',logical,b,units,'consumed');
 ELSE PERFORM app_private.billing_reserve(aid,'storage',logical,units);PERFORM app_private.billing_settle(aid,'storage',logical,true);END IF;RETURN NEW;
END $f$;

CREATE TRIGGER billing_storage BEFORE INSERT OR UPDATE OR DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION app_private.billing_storage();

CREATE FUNCTION app_private.billing_email() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE s app_private.billing_subscriptions;b text;admitted boolean;BEGIN
 PERFORM set_config('contratpro.billing_agency',NEW.agency_id::text,true);
 IF NEW.channel<>'email' THEN RETURN NEW;END IF;
 IF TG_OP='INSERT' THEN
  SELECT * INTO s FROM app_private.billing_subscriptions WHERE agency_id=NEW.agency_id FOR UPDATE;
  SELECT EXISTS(SELECT 1 FROM app_private.billing_signing_admissions WHERE agency_id=NEW.agency_id AND session_id=NEW.session_id AND features ? 'email') INTO admitted;
  IF admitted THEN
   -- Contract completion messages are grandfathered; reserve and measure without
   -- rechecking a subscription that may have expired since signing admission.
   b:=COALESCE((extract(epoch FROM s.period_start)*1000000)::bigint::text,'legacy');
   INSERT INTO app_private.billing_usage(agency_id,metric,bucket,reserved) VALUES(NEW.agency_id,'email',b,1) ON CONFLICT(agency_id,metric,bucket) DO UPDATE SET reserved=billing_usage.reserved+1;
   INSERT INTO app_private.billing_reservations VALUES(NEW.agency_id,'email',NEW.id::text,b,1,'reserved');
  ELSE PERFORM app_private.billing_reserve(NEW.agency_id,'email',NEW.id::text,1);END IF;
 ELSIF NEW.state IN('accepted','delivered','bounced') THEN PERFORM app_private.billing_settle(NEW.agency_id,'email',NEW.id::text,true);
 ELSIF NEW.state='cancelled' OR (NEW.state='failed' AND NOT NEW.retryable AND NEW.provider_id IS NULL) THEN PERFORM app_private.billing_settle(NEW.agency_id,'email',NEW.id::text,false);
 END IF;RETURN NEW;
END $f$;

CREATE TRIGGER billing_email BEFORE INSERT OR UPDATE ON app_private.delivery_jobs FOR EACH ROW EXECUTE FUNCTION app_private.billing_email();

CREATE FUNCTION app_private.billing_subscription_history() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
BEGIN PERFORM set_config('contratpro.billing_agency',NEW.agency_id::text,true);INSERT INTO app_private.billing_audit(agency_id,action,detail) VALUES(NEW.agency_id,'subscription.snapshot',jsonb_build_object('previous',CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE NULL END,'current',to_jsonb(NEW)));RETURN NEW;END $f$;

CREATE TRIGGER billing_subscription_history AFTER INSERT OR UPDATE ON app_private.billing_subscriptions FOR EACH ROW EXECUTE FUNCTION app_private.billing_subscription_history();

CREATE FUNCTION app_private.billing_payment_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP='DELETE' OR ROW(NEW.id,NEW.agency_id,NEW.plan_id,NEW.amount_minor,NEW.currency,NEW.period_start,NEW.period_end,NEW.invoice_reference,NEW.subscription_revision,NEW.profile_snapshot,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.agency_id,OLD.plan_id,OLD.amount_minor,OLD.currency,OLD.period_start,OLD.period_end,OLD.invoice_reference,OLD.subscription_revision,OLD.profile_snapshot,OLD.created_at)
 OR (OLD.reference IS NOT NULL AND NEW.reference IS DISTINCT FROM OLD.reference)
 OR (OLD.verified_at IS NOT NULL AND ROW(NEW.verified_at,NEW.verified_by) IS DISTINCT FROM ROW(OLD.verified_at,OLD.verified_by)) THEN RAISE EXCEPTION 'Immutable billing record' USING ERRCODE='42501';END IF;RETURN NEW;
END $f$;

CREATE TRIGGER billing_payment_guard BEFORE UPDATE OR DELETE ON app_private.billing_payments FOR EACH ROW EXECUTE FUNCTION app_private.billing_payment_guard();

INSERT INTO app_private.billing_usage(agency_id,metric,bucket,used)
 SELECT agency_id,'vehicles','current',count(*) FROM tenancy.vehicles WHERE state='active' GROUP BY agency_id
 UNION ALL SELECT agency_id,'team','current',count(*) FROM tenancy.memberships WHERE state='active' GROUP BY agency_id
 UNION ALL SELECT agency_id,'templates','current',count(*) FROM app_private.contract_templates WHERE NOT archived GROUP BY agency_id;

INSERT INTO app_private.billing_reservations
 SELECT agency_id,'vehicles',id::text,'current',1,'consumed' FROM tenancy.vehicles WHERE state='active'
 UNION ALL SELECT agency_id,'team',id::text,'current',1,'consumed' FROM tenancy.memberships WHERE state='active'
 UNION ALL SELECT agency_id,'templates',id::text,'current',1,'consumed' FROM app_private.contract_templates WHERE NOT archived;

INSERT INTO app_private.billing_usage(agency_id,metric,bucket,used) SELECT agency_id,'signatures','legacy',count(*) FROM app_private.signing_sessions GROUP BY agency_id;

INSERT INTO app_private.billing_reservations SELECT agency_id,'signatures',id::text,'legacy',1,'consumed' FROM app_private.signing_sessions;

INSERT INTO app_private.billing_signing_admissions SELECT agency_id,id,'["email","storage","signatures"]'::jsonb FROM app_private.signing_sessions;

INSERT INTO app_private.billing_usage(agency_id,metric,bucket,used) SELECT split_part(name,'/',1)::uuid,'storage','current',sum((metadata->>'size')::bigint) FROM storage.objects WHERE bucket_id='contract-documents' GROUP BY split_part(name,'/',1);

INSERT INTO app_private.billing_reservations SELECT split_part(name,'/',1)::uuid,'storage',bucket_id||':'||name,'current',(metadata->>'size')::bigint,'consumed' FROM storage.objects WHERE bucket_id='contract-documents' AND (metadata->>'size')::bigint>0;

CREATE FUNCTION app_private.billing_mac(message text) RETURNS text LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE secret_hex text;k bytea;a bytea;b bytea;i integer;BEGIN
 SELECT secret INTO secret_hex FROM app_private.billing_gateway_key WHERE singleton;
 IF secret_hex IS NULL THEN RAISE EXCEPTION 'Unavailable' USING ERRCODE='55000';END IF;
 k:=decode(secret_hex||repeat('00',32),'hex');a:=k;b:=k;
 FOR i IN 0..63 LOOP a:=set_byte(a,i,get_byte(k,i)#54);b:=set_byte(b,i,get_byte(k,i)#92);END LOOP;
 RETURN encode(sha256(b||sha256(a||convert_to(message,'UTF8'))),'hex');END $f$;

CREATE FUNCTION public.contratpro_billing_gateway(p_payload text,p_mac text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE p jsonb;pay app_private.billing_payments;prior app_private.billing_provider_events;op app_private.billing_provider_operations;aid uuid;outcome text:='applied';h text;BEGIN
 IF length(p_payload)>32768 OR p_mac IS NULL OR p_mac IS DISTINCT FROM app_private.billing_mac(p_payload) THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
 PERFORM set_config('contratpro.billing_internal','true',true);
 p:=p_payload::jsonb;
 IF p->>'provider' IS NULL OR length(p->>'provider') NOT BETWEEN 1 AND 60 THEN RAISE EXCEPTION 'Invalid provider' USING ERRCODE='22023';END IF;
 SELECT agency_id INTO STRICT aid FROM app_private.billing_payments WHERE id=(p->>'paymentId')::uuid;
 PERFORM 1 FROM app_private.billing_subscriptions WHERE agency_id=aid FOR UPDATE;
 SELECT * INTO STRICT pay FROM app_private.billing_payments WHERE id=(p->>'paymentId')::uuid FOR UPDATE;
 IF p->>'action'='prepare' THEN
  SELECT * INTO op FROM app_private.billing_provider_operations WHERE payment_id=pay.id AND kind=p->>'kind';
  IF op.id IS NOT NULL THEN
   IF op.id<>(p->>'operationId')::uuid OR op.provider<>p->>'provider' THEN RAISE EXCEPTION 'Operation conflict' USING ERRCODE='40001';END IF;RETURN to_jsonb(op)||jsonb_build_object('send',false);
  END IF;
  IF (p->>'kind' IN('checkout','renew') AND (pay.state<>'pending' OR pay.reference IS NOT NULL))
   OR (p->>'kind'='refund' AND pay.state<>'confirmed')
   OR (p->>'kind'='cancel' AND pay.state NOT IN('pending','uncertain','confirmed'))
   OR (pay.source='provider' AND pay.provider IS DISTINCT FROM p->>'provider')
   OR (p->>'kind' IN('cancel','refund') AND pay.source<>'provider') THEN RAISE EXCEPTION 'Payment conflict' USING ERRCODE='40001';END IF;
  INSERT INTO app_private.billing_provider_operations(id,agency_id,payment_id,provider,kind,state) VALUES((p->>'operationId')::uuid,aid,pay.id,p->>'provider',p->>'kind','prepared') RETURNING * INTO op;
  UPDATE app_private.billing_payments SET source='provider',provider=p->>'provider' WHERE id=pay.id;
  RETURN to_jsonb(op)||jsonb_build_object('send',true);
 ELSIF p->>'action'='operation-result' THEN
  SELECT * INTO STRICT op FROM app_private.billing_provider_operations WHERE id=(p->>'operationId')::uuid AND payment_id=pay.id AND provider=p->>'provider' FOR UPDATE;
  IF op.state<>'prepared' THEN RETURN to_jsonb(op);END IF;
  IF p->>'state' NOT IN('accepted','rejected','uncertain') THEN RAISE EXCEPTION 'Invalid outcome' USING ERRCODE='22023';END IF;
  UPDATE app_private.billing_provider_operations SET state=p->>'state',provider_reference=p->>'reference' WHERE id=op.id;
  IF p->>'state'='uncertain' THEN UPDATE app_private.billing_payments SET state='uncertain' WHERE id=pay.id AND state='pending';END IF;
  INSERT INTO app_private.billing_audit(agency_id,action,detail) VALUES(aid,'provider.operation',p-'action');RETURN 'true'::jsonb;
 ELSIF p->>'action'<>'event' THEN RAISE EXCEPTION 'Invalid action' USING ERRCODE='22023';END IF;
 IF p->>'eventId' IS NULL OR length(p->>'eventId') NOT BETWEEN 1 AND 160 OR (p->>'sequence') !~ '^[0-9]{1,18}$' OR p->>'sequence' IS NULL OR (p->>'amountMinor') !~ '^(0|[1-9][0-9]{0,18})$' THEN RAISE EXCEPTION 'Invalid event' USING ERRCODE='22023';END IF;
 h:=encode(sha256(convert_to(p_payload,'UTF8')),'hex');
 SELECT * INTO prior FROM app_private.billing_provider_events WHERE provider=p->>'provider' AND event_id=p->>'eventId';
 IF prior.event_id IS NOT NULL THEN IF prior.body_hash<>h THEN RAISE EXCEPTION 'Event replay mismatch' USING ERRCODE='40001';END IF;RETURN to_jsonb(prior.outcome);END IF;
 IF pay.provider IS DISTINCT FROM p->>'provider' OR pay.source<>'provider' OR pay.amount_minor::text IS DISTINCT FROM p->>'amountMinor' OR pay.currency IS DISTINCT FROM p->>'currency' OR length(COALESCE(p->>'providerPaymentId',''))=0 OR (pay.provider_payment_id IS NOT NULL AND pay.provider_payment_id<>p->>'providerPaymentId') THEN outcome:='mismatch';
 ELSIF (p->>'sequence')::bigint<=pay.provider_sequence THEN outcome:='stale';
 ELSE
  BEGIN
   IF p->>'status'='confirmed' THEN
    -- Refunded/cancelled payments are terminal; a later paid event cannot resurrect them.
    IF pay.state IN('cancelled','refunded','rejected') THEN outcome:='terminal';ELSE PERFORM app_private.billing_confirm(pay.id,NULL,p->>'eventId');END IF;
   ELSIF p->>'status'='refunded' AND pay.state='confirmed' THEN UPDATE app_private.billing_payments SET state='refunded' WHERE id=pay.id;
   ELSIF p->>'status'='cancelled' AND pay.state IN('pending','uncertain') THEN UPDATE app_private.billing_payments SET state='cancelled' WHERE id=pay.id;
   ELSIF p->>'status'='cancelled' AND pay.state='confirmed' THEN UPDATE app_private.billing_subscriptions SET cancel_at_end=true,pending_plan=NULL,revision=revision+1 WHERE agency_id=aid;UPDATE app_private.billing_payments SET activation_state='cancelled' WHERE id=pay.id AND activation_state='pending';
   ELSIF p->>'status'='failed' AND pay.state IN('pending','uncertain') THEN UPDATE app_private.billing_payments SET state='rejected' WHERE id=pay.id;
   ELSE outcome:='ignored';END IF;
  EXCEPTION WHEN SQLSTATE '40001' THEN outcome:='review-required';END;
  UPDATE app_private.billing_payments SET provider_sequence=(p->>'sequence')::bigint,provider_payment_id=p->>'providerPaymentId' WHERE id=pay.id;
 END IF;
 INSERT INTO app_private.billing_provider_events(provider,event_id,body_hash,payload,outcome) VALUES(p->>'provider',p->>'eventId',h,p,outcome);
 INSERT INTO app_private.billing_audit(agency_id,action,detail) VALUES(aid,'provider.event',jsonb_build_object('provider',p->>'provider','eventId',p->>'eventId','outcome',outcome));RETURN to_jsonb(outcome);
END $f$;

DO $owners$ DECLARE r record;BEGIN
 FOR r IN SELECT p.oid::regprocedure AS fn FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='app_private' AND p.proname LIKE 'billing_%' AND p.proname NOT IN('billing_member','billing_reviewer_conflict') LOOP
  EXECUTE format('ALTER FUNCTION %s OWNER TO contratpro_billing_writer',r.fn);
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role,contratpro_runtime,contratpro_platform_runtime',r.fn);
 END LOOP;
END $owners$;

ALTER FUNCTION public.contratpro_billing_agency(uuid,text,jsonb) OWNER TO contratpro_billing_writer;

ALTER FUNCTION public.contratpro_billing_platform(text,jsonb) OWNER TO contratpro_billing_writer;

ALTER FUNCTION public.contratpro_billing_gateway(text,text) OWNER TO contratpro_billing_writer;

REVOKE ALL ON FUNCTION public.contratpro_billing_gateway(text,text) FROM PUBLIC,anon,authenticated,service_role,contratpro_runtime,contratpro_platform_runtime;

GRANT EXECUTE ON FUNCTION public.contratpro_billing_gateway(text,text) TO anon;

REVOKE ALL ON FUNCTION public.contratpro_billing_agency(uuid,text,jsonb),public.contratpro_billing_platform(text,jsonb) FROM PUBLIC,anon,authenticated,service_role,contratpro_runtime,contratpro_platform_runtime;

GRANT EXECUTE ON FUNCTION public.contratpro_billing_agency(uuid,text,jsonb),public.contratpro_billing_platform(text,jsonb) TO authenticated;
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
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.billing_admin_subjects'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.billing_plans'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.billing_subscriptions'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.billing_trial_history'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.billing_profiles'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.billing_payments'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.billing_audit'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.billing_receipts'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.billing_usage'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.billing_reservations'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.billing_signing_admissions'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.billing_provider_events'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.billing_provider_operations'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.billing_gateway_key'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;

 IF EXISTS(SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace,
 LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
 WHERE (n.nspname||'.'||p.proname)=ANY(ARRAY['app_private.billing_plan_guard','app_private.billing_member','app_private.billing_reviewer_conflict','app_private.billing_admin','app_private.billing_access','app_private.billing_reserve','app_private.billing_transition','app_private.billing_snapshot','app_private.billing_catalog','public.contratpro_billing_agency','app_private.billing_settle','app_private.billing_refresh','app_private.billing_confirm','public.contratpro_billing_platform','app_private.billing_resource','app_private.billing_feature_write','app_private.billing_sheets','app_private.billing_storage','app_private.billing_email','app_private.billing_subscription_history','app_private.billing_payment_guard','app_private.billing_mac','public.contratpro_billing_gateway']::text[]) AND p.prosecdef AND a.grantee=0 AND a.privilege_type='EXECUTE') THEN RAISE EXCEPTION 'D2 definer PUBLIC execute leak';END IF;
END $d2_objects_post$;

DO $d2_security_post$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=ANY(ARRAY['contratpro_rental_writer','contratpro_billing_writer']::text[])
 AND (rolcanlogin OR rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication OR rolinherit)) THEN RAISE EXCEPTION 'D2 writer role widened';END IF;
END $d2_security_post$;
INSERT INTO supabase_migrations.schema_migrations(version) VALUES('20261124002000');
DO $d2_post$ BEGIN
 IF ARRAY(SELECT version FROM supabase_migrations.schema_migrations ORDER BY version) IS DISTINCT FROM ARRAY['20261115000000','20261115000100','20261115000200','20261115000300','20261115000400','20261115000500','20261115000600','20261116000700','20261118000800','20261118000900','20261118001000','20261119001100','20261119001200','20261120001300','20261122001400','20261122001500','20261124001600','20261124001700','20261124001800','20261124001900','20261124002000']::text[]
 THEN RAISE EXCEPTION 'D2 final history mismatch';END IF;
END $d2_post$;
COMMIT;
