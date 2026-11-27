-- D2 NATIVE SYNTHETIC TEST CANDIDATE ONLY. NOT A MANAGED DEPLOYMENT ARTIFACT.
-- Source: supabase/migration-drafts/20261127002700_registration_onboarding.sql; raw SHA256 6e455f86c61125030bfc18346136efbcb4abd520fe796899d3db7a405560bf83
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
 IF ARRAY(SELECT version FROM supabase_migrations.schema_migrations ORDER BY version) IS DISTINCT FROM ARRAY['20261115000000','20261115000100','20261115000200','20261115000300','20261115000400','20261115000500','20261115000600','20261116000700','20261118000800','20261118000900','20261118001000','20261119001100','20261119001200','20261120001300','20261122001400','20261122001500','20261124001600','20261124001700','20261124001800','20261124001900','20261124002000','20261125002100','20261125002200','20261125002300','20261126002400','20261126002500','20261126002600']::text[]
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
 IF wanted::text<>ALL(ARRAY['contratpro_rental_writer','contratpro_agency_writer']::text[]) THEN RAISE EXCEPTION 'D2 role outside manifest';END IF;
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
SELECT pg_temp.d2_authorize('contratpro_agency_writer'::name);
-- Retained source statements; parser-classified design stop/outer BEGIN/ROLLBACK excluded.
SET LOCAL search_path=pg_catalog,pg_temp;

SET LOCAL row_security=on;

CREATE TABLE app_private.personal_profiles(user_id uuid PRIMARY KEY REFERENCES identity.users(id),profile jsonb NOT NULL,revision bigint NOT NULL DEFAULT 1,updated_at timestamptz NOT NULL DEFAULT clock_timestamp());

CREATE TABLE app_private.legal_documents(kind text NOT NULL CHECK(kind IN('terms','privacy')),version text NOT NULL CHECK(length(version) BETWEEN 1 AND 100),content_sha256 text NOT NULL CHECK(content_sha256~'^[a-f0-9]{64}$'),published boolean NOT NULL DEFAULT false,PRIMARY KEY(kind,version));

CREATE UNIQUE INDEX one_published_legal_version ON app_private.legal_documents(kind) WHERE published;

CREATE TABLE app_private.legal_acceptances(user_id uuid NOT NULL REFERENCES identity.users(id),kind text NOT NULL,version text NOT NULL,accepted_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(user_id,kind,version),FOREIGN KEY(kind,version) REFERENCES app_private.legal_documents(kind,version));

CREATE TABLE app_private.onboarding_drafts(user_id uuid PRIMARY KEY REFERENCES identity.users(id),request_id uuid NOT NULL,payload jsonb NOT NULL,revision bigint NOT NULL DEFAULT 0,result jsonb,updated_at timestamptz NOT NULL DEFAULT clock_timestamp());

CREATE TABLE app_private.agency_business_details(agency_id uuid PRIMARY KEY REFERENCES tenancy.agencies(id),details jsonb NOT NULL,revision bigint NOT NULL DEFAULT 1);

CREATE TABLE app_private.registration_receipts(user_id uuid NOT NULL REFERENCES identity.users(id),request_id uuid NOT NULL,input jsonb NOT NULL,result jsonb NOT NULL,PRIMARY KEY(user_id,request_id));

DO $policies$ DECLARE t text;BEGIN
 FOREACH t IN ARRAY ARRAY['personal_profiles','legal_acceptances','onboarding_drafts','registration_receipts'] LOOP
  EXECUTE format('ALTER TABLE app_private.%I ENABLE ROW LEVEL SECURITY',t);EXECUTE format('ALTER TABLE app_private.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON app_private.%I FROM PUBLIC,anon,authenticated,service_role,contratpro_runtime,contratpro_platform_runtime',t);
  EXECUTE format('CREATE POLICY own_row ON app_private.%I TO contratpro_agency_writer USING(user_id=app_private.canonical_auth_user()) WITH CHECK(user_id=app_private.canonical_auth_user())',t);
 END LOOP;
END $policies$;

ALTER TABLE app_private.legal_documents ENABLE ROW LEVEL SECURITY;

ALTER TABLE app_private.legal_documents FORCE ROW LEVEL SECURITY;

ALTER TABLE app_private.agency_business_details ENABLE ROW LEVEL SECURITY;

ALTER TABLE app_private.agency_business_details FORCE ROW LEVEL SECURITY;

REVOKE ALL ON app_private.legal_documents,app_private.agency_business_details FROM PUBLIC,anon,authenticated,service_role,contratpro_runtime,contratpro_platform_runtime;

CREATE POLICY legal_published ON app_private.legal_documents FOR SELECT TO contratpro_agency_writer USING(published);

CREATE POLICY business_read ON app_private.agency_business_details FOR SELECT TO contratpro_agency_writer USING(EXISTS(SELECT 1 FROM tenancy.memberships m WHERE m.agency_id=agency_business_details.agency_id AND m.user_id=app_private.canonical_auth_user() AND m.state='active'));

CREATE POLICY business_write ON app_private.agency_business_details TO contratpro_agency_writer USING(app_private.agency_owner(agency_id)) WITH CHECK(app_private.agency_owner(agency_id));

GRANT SELECT,INSERT,UPDATE ON app_private.personal_profiles,app_private.onboarding_drafts,app_private.agency_business_details TO contratpro_agency_writer;

GRANT SELECT,INSERT ON app_private.legal_acceptances,app_private.registration_receipts TO contratpro_agency_writer;

GRANT SELECT ON app_private.legal_documents TO contratpro_agency_writer;

GRANT SELECT,INSERT,UPDATE ON app_private.agency_branding TO contratpro_agency_writer;

CREATE POLICY onboarding_branding ON app_private.agency_branding TO contratpro_agency_writer USING(app_private.agency_owner(agency_id)) WITH CHECK(app_private.agency_owner(agency_id));

CREATE FUNCTION app_private.valid_personal_profile(p jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $f$
 SELECT jsonb_typeof(p)='object' AND (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(p) k)=ARRAY['callingCode','firstName','lastName','phone']
 AND NOT EXISTS(SELECT 1 FROM jsonb_each(p) e WHERE jsonb_typeof(e.value)<>'string' OR e.value#>>'{}'~'[[:cntrl:]]')
 AND length(btrim(p->>'firstName')) BETWEEN 1 AND 100 AND length(btrim(p->>'lastName')) BETWEEN 1 AND 100
 AND p->>'callingCode'~'^\+[1-9][0-9]{0,2}$' AND p->>'phone'~'^\+[1-9][0-9]{6,14}$' AND starts_with(p->>'phone',p->>'callingCode')
$f$;

CREATE FUNCTION app_private.valid_onboarding(p jsonb,complete boolean) RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $f$
DECLARE d jsonb:=p->'details';q jsonb:=p->'profile';BEGIN
 IF jsonb_typeof(p)<>'object' OR (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(p) k)<>ARRAY['defaultLocale','details','profile','timeZone'] OR jsonb_typeof(d)<>'object' OR jsonb_typeof(q)<>'object' THEN RETURN false;END IF;
 IF (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(d) k)<>ARRAY['country','legalName','postalCode','rcCity','representativeName','representativeRole','structure','website'] OR (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(q) k)<>ARRAY['address','city','email','ice','ifNumber','name','phone','rc'] THEN RETURN false;END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each(d||q) e WHERE jsonb_typeof(e.value)<>'string' OR length(e.value#>>'{}')>400 OR e.value#>>'{}'~'[[:cntrl:]]') OR p->>'defaultLocale' NOT IN('fr','ar') OR p->>'timeZone' NOT IN('UTC','Africa/Casablanca') THEN RETURN false;END IF;
 IF d->>'country'!~'^[A-Z]{2}$' OR d->>'structure' NOT IN('','individual','company','other') OR length(d->>'legalName')>200 OR length(d->>'representativeName')>200 OR length(d->>'representativeRole')>100 OR length(d->>'postalCode')>100 OR length(d->>'rcCity')>100 OR length(d->>'website')>300 OR (d->>'website'<>'' AND (d->>'website'!~'^https?://[^[:space:]@]+$')) THEN RETURN false;END IF;
 IF complete AND (NOT app_private.valid_agency_profile(q) OR (d->>'structure'='company' AND btrim(d->>'legalName')='') OR btrim(d->>'representativeName')='' OR (q->>'rc'<>'' AND btrim(d->>'rcCity')='')) THEN RETURN false;END IF;
 RETURN true;
END $f$;

CREATE FUNCTION public.contratpro_account_profile(p_action text,p_data jsonb DEFAULT '{}',p_request_id uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog SET row_security=on AS $f$
DECLARE actor uuid:=app_private.canonical_auth_user();result jsonb;prev app_private.registration_receipts;input jsonb:=jsonb_build_object('action',p_action,'data',p_data);BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
 IF p_action='get' THEN RETURN (SELECT jsonb_build_object('profile',profile,'revision',revision) FROM app_private.personal_profiles WHERE user_id=actor);END IF;
 IF p_request_id IS NULL OR p_action NOT IN('seed','save','consent') THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text||':account',0));
 SELECT * INTO prev FROM app_private.registration_receipts WHERE user_id=actor AND request_id=p_request_id;
 IF FOUND THEN IF prev.input<>input THEN RAISE EXCEPTION 'Changed retry' USING ERRCODE='22023';END IF;RETURN prev.result;END IF;
 IF p_action='consent' THEN
  IF jsonb_typeof(p_data)<>'object' OR (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(p_data) k)<>ARRAY['privacyVersion','termsVersion'] OR (SELECT count(*) FROM app_private.legal_documents WHERE published AND ((kind='terms' AND version=p_data->>'termsVersion') OR(kind='privacy' AND version=p_data->>'privacyVersion')))<>2 THEN RAISE EXCEPTION 'Legal unavailable' USING ERRCODE='22023';END IF;
  INSERT INTO app_private.legal_acceptances(user_id,kind,version) SELECT actor,kind,version FROM app_private.legal_documents WHERE published ON CONFLICT DO NOTHING;result:=jsonb_build_object('accepted',true);
 ELSE
  IF NOT COALESCE(app_private.valid_personal_profile(p_data),false) THEN RAISE EXCEPTION 'Invalid profile' USING ERRCODE='22023';END IF;
  IF p_action='seed' THEN INSERT INTO app_private.personal_profiles(user_id,profile) VALUES(actor,p_data) ON CONFLICT DO NOTHING;
  ELSE INSERT INTO app_private.personal_profiles(user_id,profile) VALUES(actor,p_data) ON CONFLICT(user_id) DO UPDATE SET profile=EXCLUDED.profile,revision=personal_profiles.revision+1,updated_at=clock_timestamp();END IF;
  SELECT jsonb_build_object('profile',profile,'revision',revision) INTO result FROM app_private.personal_profiles WHERE user_id=actor;
 END IF;
 INSERT INTO app_private.registration_receipts VALUES(actor,p_request_id,input,result);RETURN result;
END $f$;

CREATE FUNCTION public.contratpro_onboarding(p_action text,p_data jsonb DEFAULT '{}',p_request_id uuid DEFAULT NULL,p_revision bigint DEFAULT 0,p_agency_id uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog SET row_security=on AS $f$
DECLARE actor uuid:=app_private.canonical_auth_user();draft app_private.onboarding_drafts;created record;answer jsonb;details jsonb;rev bigint;prior app_private.registration_receipts;input_value jsonb:=jsonb_build_object('action',p_action,'data',p_data,'agencyId',p_agency_id,'revision',p_revision);BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
 IF p_action='load' THEN RETURN (SELECT jsonb_build_object('data',d.payload,'requestId',d.request_id,'revision',d.revision,'result',d.result) FROM app_private.onboarding_drafts d WHERE d.user_id=actor);END IF;
 IF p_action='new' THEN
  IF p_request_id IS NULL OR NOT COALESCE(app_private.valid_onboarding(p_data,false),false) THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(actor::text||':onboarding',0));
  SELECT * INTO draft FROM app_private.onboarding_drafts WHERE user_id=actor FOR UPDATE;
  IF draft.request_id=p_request_id AND draft.result IS NULL THEN RETURN jsonb_build_object('requestId',draft.request_id,'revision',draft.revision);END IF;
  IF draft.result IS NULL THEN RAISE EXCEPTION 'Existing draft' USING ERRCODE='40001';END IF;
  UPDATE app_private.onboarding_drafts SET request_id=p_request_id,payload=p_data,revision=0,result=NULL,updated_at=clock_timestamp() WHERE user_id=actor;
  RETURN jsonb_build_object('requestId',p_request_id,'revision',0);
 END IF;
 IF p_action='agency' THEN
  IF NOT app_private.agency_owner(p_agency_id) THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
  RETURN (SELECT jsonb_build_object('details',COALESCE(d.details,jsonb_build_object('country','','website','','postalCode','','rcCity','','structure','','legalName','','representativeName','','representativeRole',''))||jsonb_build_object('legalName',COALESCE(b.profile->>'legalName',d.details->>'legalName',''),'representativeName',COALESCE(b.profile->>'representativeName',d.details->>'representativeName',''),'representativeRole',COALESCE(b.profile->>'representativeRole',d.details->>'representativeRole','')),'revision',COALESCE(d.revision,0)) FROM tenancy.agencies a LEFT JOIN app_private.agency_business_details d ON d.agency_id=a.id LEFT JOIN app_private.agency_branding b ON b.agency_id=a.id WHERE a.id=p_agency_id);
 END IF;
 IF p_action NOT IN('draft','finalize','update-agency') OR p_request_id IS NULL OR p_revision<0 OR NOT COALESCE(app_private.valid_onboarding(p_data,p_action<>'draft'),false) THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
 IF p_action='update-agency' THEN
  IF NOT app_private.agency_owner(p_agency_id) THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_agency_id::text||':business',0));
  SELECT * INTO prior FROM app_private.registration_receipts WHERE user_id=actor AND request_id=p_request_id;
  IF FOUND THEN IF prior.input<>input_value THEN RAISE EXCEPTION 'Changed retry' USING ERRCODE='22023';END IF;RETURN prior.result;END IF;
  SELECT revision INTO rev FROM app_private.agency_business_details WHERE agency_id=p_agency_id FOR UPDATE;
  IF COALESCE(rev,0)<>p_revision THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
  PERFORM public.contratpro_update_agency(p_agency_id,p_data->'profile',p_request_id);
  INSERT INTO app_private.agency_business_details VALUES(p_agency_id,p_data->'details',1) ON CONFLICT(agency_id) DO UPDATE SET details=EXCLUDED.details,revision=agency_business_details.revision+1;
 ELSE
  PERFORM pg_advisory_xact_lock(hashtextextended(actor::text||':onboarding',0));
  IF p_action='finalize' THEN
   SELECT * INTO prior FROM app_private.registration_receipts WHERE user_id=actor AND request_id=p_request_id;
   IF FOUND THEN IF prior.input->>'action'<>'finalize' OR prior.input->'data'<>p_data THEN RAISE EXCEPTION 'Changed retry' USING ERRCODE='22023';END IF;RETURN prior.result;END IF;
  END IF;
  INSERT INTO app_private.onboarding_drafts(user_id,request_id,payload) VALUES(actor,p_request_id,p_data) ON CONFLICT DO NOTHING;
  SELECT * INTO STRICT draft FROM app_private.onboarding_drafts WHERE user_id=actor FOR UPDATE;
  IF draft.request_id<>p_request_id THEN RAISE EXCEPTION 'Changed request' USING ERRCODE='40001';END IF;
  IF draft.result IS NOT NULL THEN IF draft.payload<>p_data THEN RAISE EXCEPTION 'Changed completed retry' USING ERRCODE='22023';END IF;RETURN draft.result;END IF;
  IF p_action='draft' AND draft.revision=p_revision+1 AND draft.payload=p_data THEN RETURN jsonb_build_object('revision',draft.revision,'requestId',draft.request_id);END IF;
  IF draft.revision<>p_revision THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
  IF p_action='draft' THEN UPDATE app_private.onboarding_drafts SET payload=p_data,revision=revision+1,updated_at=clock_timestamp() WHERE user_id=actor RETURNING jsonb_build_object('revision',revision,'requestId',request_id) INTO answer;RETURN answer;END IF;
  SELECT * INTO STRICT created FROM public.contratpro_create_agency(p_data->'profile',p_data->>'defaultLocale',p_request_id);
  p_agency_id:=created.agency_id;
  INSERT INTO app_private.agency_business_details VALUES(p_agency_id,p_data->'details',1);
 END IF;
 details:=p_data->'details';
 INSERT INTO app_private.agency_branding(agency_id,profile) VALUES(p_agency_id,jsonb_build_object('legalName',details->>'legalName','commercialName',p_data->'profile'->>'name','representativeName',details->>'representativeName','representativeRole',details->>'representativeRole'))
 ON CONFLICT(agency_id) DO UPDATE SET profile=agency_branding.profile||EXCLUDED.profile,revision=agency_branding.revision+1;
 PERFORM public.contratpro_update_agency_settings(p_agency_id,jsonb_build_object('defaultLocale',p_data->>'defaultLocale','timeZone',p_data->>'timeZone','currency','MAD'),p_request_id);
 answer:=jsonb_build_object('agencyId',p_agency_id,'userId',actor);
 IF p_action='finalize' THEN UPDATE app_private.onboarding_drafts SET payload=p_data,result=answer,revision=revision+1,updated_at=clock_timestamp() WHERE user_id=actor;END IF;
 INSERT INTO app_private.registration_receipts VALUES(actor,p_request_id,input_value,answer);
 RETURN answer;
END $f$;

REVOKE ALL ON FUNCTION app_private.valid_personal_profile(jsonb),app_private.valid_onboarding(jsonb,boolean) FROM PUBLIC,anon,authenticated,service_role,contratpro_runtime,contratpro_platform_runtime;

GRANT EXECUTE ON FUNCTION app_private.valid_personal_profile(jsonb),app_private.valid_onboarding(jsonb,boolean) TO contratpro_agency_writer;

REVOKE ALL ON FUNCTION public.contratpro_account_profile(text,jsonb,uuid),public.contratpro_onboarding(text,jsonb,uuid,bigint,uuid) FROM PUBLIC,anon,authenticated,service_role,contratpro_runtime,contratpro_platform_runtime;

GRANT EXECUTE ON FUNCTION public.contratpro_account_profile(text,jsonb,uuid),public.contratpro_onboarding(text,jsonb,uuid,bigint,uuid) TO authenticated;

ALTER FUNCTION public.contratpro_account_profile(text,jsonb,uuid) OWNER TO contratpro_agency_writer;

ALTER FUNCTION public.contratpro_onboarding(text,jsonb,uuid,bigint,uuid) OWNER TO contratpro_agency_writer;

DO $snapshot$ BEGIN IF to_regprocedure('app_private.a2_snapshot(uuid,uuid)') IS NOT NULL THEN
 GRANT SELECT ON app_private.agency_business_details TO contratpro_rental_writer;
 CREATE POLICY business_document_read ON app_private.agency_business_details FOR SELECT TO contratpro_rental_writer USING(EXISTS(SELECT 1 FROM tenancy.memberships m WHERE m.agency_id=agency_business_details.agency_id AND m.user_id=app_private.canonical_auth_user() AND m.state='active'));
 EXECUTE $create$CREATE OR REPLACE FUNCTION app_private.a2_snapshot(aid uuid,rid uuid) RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE r tenancy.rental_contracts;o app_private.rental_operations;b app_private.agency_branding;secondary uuid;parties jsonb;pay jsonb;BEGIN
 SELECT * INTO STRICT r FROM tenancy.rental_contracts WHERE agency_id=aid AND id=rid;
 SELECT * INTO o FROM app_private.rental_operations WHERE agency_id=aid AND rental_id=rid;
 SELECT * INTO b FROM app_private.agency_branding WHERE agency_id=aid;
 SELECT secondary_client_id INTO secondary FROM app_private.rental_drivers WHERE agency_id=aid AND contract_id=rid;
 SELECT jsonb_build_object('agency',jsonb_build_object('name',a.name,'ice',a.ice,'ifNumber',a.if_number,'rc',a.rc,'address',a.address,'city',a.city,'phone',a.phone,'email',a.email,'country',extra.details->>'country','postalCode',extra.details->>'postalCode','website',extra.details->>'website','rcCity',extra.details->>'rcCity','businessStructure',extra.details->>'structure')||COALESCE(b.profile,'{}')||jsonb_build_object('logoData',b.logo_data,'brandingRevision',b.revision),
 'primaryDriver',app_private.rental_driver_payload(aid,r.client_id),'secondaryDriver',CASE WHEN secondary IS NULL THEN NULL ELSE app_private.rental_driver_payload(aid,secondary) END,
 'vehicle',jsonb_build_object('id',v.id,'registrationNumber',v.registration,'make',v.make,'model',v.model,'year',v.model_year,'mileage',v.mileage)) INTO parties
 FROM tenancy.agencies a LEFT JOIN app_private.agency_business_details extra ON extra.agency_id=a.id JOIN tenancy.vehicles v ON v.agency_id=a.id AND v.id=r.vehicle_id WHERE a.id=aid;
 SELECT jsonb_build_object('paidMinor',COALESCE(sum(paid_delta),0)::text,'remainingMinor',(r.total_minor-COALESCE(sum(paid_delta),0))::text,'depositHeldMinor',COALESCE(sum(deposit_delta),0)::text,
 'lastOperation',(SELECT jsonb_build_object('kind',q.kind,'amountMinor',q.amount_minor::text,'method',q.method,'date',q.payment_date,'reference',q.reference) FROM app_private.rental_payments q WHERE q.agency_id=aid AND q.rental_id=rid ORDER BY sequence DESC LIMIT 1)) INTO pay FROM app_private.rental_payments WHERE agency_id=aid AND rental_id=rid;
 parties:=jsonb_set(parties,'{agency}',(parties->'agency')||jsonb_build_object('signerName',(SELECT name FROM app_private.agency_signers WHERE agency_id=aid AND membership_id=o.signer_id AND enabled)));
 RETURN jsonb_build_object('schemaVersion',1,'agencyId',aid,'rentalId',rid,'version',r.version,'number',COALESCE(r.contract_number,''),'parties',parties,'operationsRevision',o.revision,'signerId',o.signer_id,
 'terms',jsonb_build_object('start',r.starts_at,'end',r.ends_at,'dailyRateMinor',r.daily_rate_minor::text,'depositMinor',r.deposit_minor::text,'totalMinor',r.total_minor::text,'billableDays',r.billable_days,'currency',r.currency,
 'pickup',o.pickup,'returnLocation',o.return_location,'payment',pay::text,'paidMinor',pay->>'paidMinor','remainingMinor',pay->>'remainingMinor','depositHeldMinor',pay->>'depositHeldMinor','paymentMethod',pay->'lastOperation'->>'method','paymentDate',pay->'lastOperation'->>'date','paymentReference',pay->'lastOperation'->>'reference'));
END $f$;$create$;
END IF;END $snapshot$;
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
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.personal_profiles'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.legal_documents'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.legal_acceptances'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.onboarding_drafts'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.agency_business_details'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.registration_receipts'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.legal_documents'::regclass AND relrowsecurity) THEN RAISE EXCEPTION 'D2 declared RLS invariant missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.legal_documents'::regclass AND relforcerowsecurity) THEN RAISE EXCEPTION 'D2 declared RLS invariant missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.agency_business_details'::regclass AND relrowsecurity) THEN RAISE EXCEPTION 'D2 declared RLS invariant missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.agency_business_details'::regclass AND relforcerowsecurity) THEN RAISE EXCEPTION 'D2 declared RLS invariant missing';END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace,
 LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
 WHERE (n.nspname||'.'||p.proname)=ANY(ARRAY['app_private.valid_personal_profile','app_private.valid_onboarding','public.contratpro_account_profile','public.contratpro_onboarding']::text[]) AND p.prosecdef AND a.grantee=0 AND a.privilege_type='EXECUTE') THEN RAISE EXCEPTION 'D2 definer PUBLIC execute leak';END IF;
END $d2_objects_post$;

DO $d2_security_post$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=ANY(ARRAY['contratpro_rental_writer','contratpro_agency_writer']::text[])
 AND (rolcanlogin OR rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication OR rolinherit)) THEN RAISE EXCEPTION 'D2 writer role widened';END IF;
END $d2_security_post$;
INSERT INTO supabase_migrations.schema_migrations(version) VALUES('20261127002700');
DO $d2_post$ BEGIN
 IF ARRAY(SELECT version FROM supabase_migrations.schema_migrations ORDER BY version) IS DISTINCT FROM ARRAY['20261115000000','20261115000100','20261115000200','20261115000300','20261115000400','20261115000500','20261115000600','20261116000700','20261118000800','20261118000900','20261118001000','20261119001100','20261119001200','20261120001300','20261122001400','20261122001500','20261124001600','20261124001700','20261124001800','20261124001900','20261124002000','20261125002100','20261125002200','20261125002300','20261126002400','20261126002500','20261126002600','20261127002700']::text[]
 THEN RAISE EXCEPTION 'D2 final history mismatch';END IF;
END $d2_post$;
COMMIT;
