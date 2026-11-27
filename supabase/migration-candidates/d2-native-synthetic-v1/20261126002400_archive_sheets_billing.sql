-- D2 NATIVE SYNTHETIC TEST CANDIDATE ONLY. NOT A MANAGED DEPLOYMENT ARTIFACT.
-- Source: supabase/migration-drafts/20261126002400_archive_sheets_billing.sql; raw SHA256 50260fc4c3b55d758e0860fbf7f807a0cec99eed3a661edd6cf23a2b6431adb0
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
 IF ARRAY(SELECT version FROM supabase_migrations.schema_migrations ORDER BY version) IS DISTINCT FROM ARRAY['20261115000000','20261115000100','20261115000200','20261115000300','20261115000400','20261115000500','20261115000600','20261116000700','20261118000800','20261118000900','20261118001000','20261119001100','20261119001200','20261120001300','20261122001400','20261122001500','20261124001600','20261124001700','20261124001800','20261124001900','20261124002000','20261125002100','20261125002200','20261125002300']::text[]
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
 IF wanted::text<>ALL(ARRAY['contratpro_rental_writer','contratpro_sheets_worker','contratpro_billing_writer']::text[]) THEN RAISE EXCEPTION 'D2 role outside manifest';END IF;
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
SELECT pg_temp.d2_authorize('contratpro_sheets_worker'::name);
SELECT pg_temp.d2_authorize('contratpro_billing_writer'::name);
-- Retained source statements; parser-classified design stop/outer BEGIN/ROLLBACK excluded.
SET LOCAL search_path=pg_catalog,pg_temp;

SET LOCAL row_security=on;

CREATE TABLE app_private.rental_archive_marks(agency_id uuid NOT NULL,rental_id uuid NOT NULL,archived boolean NOT NULL,revision integer NOT NULL DEFAULT 1,
 PRIMARY KEY(agency_id,rental_id),FOREIGN KEY(agency_id,rental_id) REFERENCES tenancy.rental_contracts(agency_id,id));

ALTER TABLE app_private.rental_archive_marks ENABLE ROW LEVEL SECURITY;

ALTER TABLE app_private.rental_archive_marks FORCE ROW LEVEL SECURITY;

REVOKE ALL ON app_private.rental_archive_marks FROM PUBLIC,anon,authenticated,service_role;

GRANT SELECT,INSERT,UPDATE ON app_private.rental_archive_marks TO contratpro_rental_writer;

CREATE POLICY archive_member ON app_private.rental_archive_marks TO contratpro_rental_writer USING(app_private.rental_member(agency_id) IS NOT NULL) WITH CHECK(app_private.rental_member(agency_id) IS NOT NULL);

CREATE TABLE app_private.archive_mark_receipts(agency_id uuid NOT NULL,actor uuid NOT NULL,request_id uuid NOT NULL,input jsonb NOT NULL,PRIMARY KEY(agency_id,actor,request_id));

ALTER TABLE app_private.archive_mark_receipts ENABLE ROW LEVEL SECURITY;

ALTER TABLE app_private.archive_mark_receipts FORCE ROW LEVEL SECURITY;

REVOKE ALL ON app_private.archive_mark_receipts FROM PUBLIC,anon,authenticated,service_role;

GRANT SELECT,INSERT ON app_private.archive_mark_receipts TO contratpro_rental_writer;

CREATE POLICY archive_receipt_member ON app_private.archive_mark_receipts TO contratpro_rental_writer USING(app_private.rental_member(agency_id) IS NOT NULL) WITH CHECK(app_private.rental_member(agency_id) IS NOT NULL);

CREATE TRIGGER archive_receipt_immutable BEFORE UPDATE OR DELETE ON app_private.archive_mark_receipts FOR EACH ROW EXECUTE FUNCTION app_private.rental_receipt_immutable();

CREATE INDEX rental_archive_dates ON tenancy.rental_contracts(agency_id,created_at DESC,id DESC);

CREATE INDEX rental_archive_state_dates ON tenancy.rental_contracts(agency_id,state,starts_at,id);

CREATE INDEX document_archive_versions ON app_private.rental_document_versions(agency_id,contract_id,version DESC);

CREATE INDEX signing_archive ON app_private.signing_sessions(agency_id,rental_id,version DESC);

CREATE INDEX archive_vehicle_registration ON tenancy.vehicles(agency_id,registration);

CREATE FUNCTION public.contratpro_archive(p_agency_id uuid,p_action text,p_input jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
<<archive_scope>>
DECLARE actor uuid;result jsonb;q text;pg integer;cutoff timestamptz;rid uuid;receipt jsonb;BEGIN
 actor:=app_private.rental_member(p_agency_id);
 IF jsonb_typeof(p_input) IS DISTINCT FROM 'object' OR pg_column_size(p_input)>4096 THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
 IF p_action='mark' THEN
  rid:=(p_input->>'rentalId')::uuid;
  IF jsonb_typeof(p_input->'archived') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
  PERFORM 1 FROM tenancy.rental_contracts WHERE agency_id=p_agency_id AND id=rid AND state IN('termine','annule') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Only completed/cancelled rentals may be archived' USING ERRCODE='40001';END IF;
  IF NOT EXISTS(SELECT 1 FROM tenancy.membership_roles mr JOIN tenancy.role_permissions rp ON rp.agency_id=mr.agency_id AND rp.role_id=mr.role_id WHERE mr.agency_id=p_agency_id AND mr.membership_id=actor AND rp.permission_key='agency.manage') THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
  SELECT input INTO receipt FROM app_private.archive_mark_receipts WHERE agency_id=p_agency_id AND archive_mark_receipts.actor=archive_scope.actor AND request_id=(p_input->>'requestId')::uuid;
  IF receipt IS NOT NULL THEN IF receipt IS DISTINCT FROM p_input THEN RAISE EXCEPTION 'Replay conflict' USING ERRCODE='40001';END IF;RETURN 'true';END IF;
  INSERT INTO app_private.rental_archive_marks VALUES(p_agency_id,rid,(p_input->>'archived')::boolean,1) ON CONFLICT(agency_id,rental_id) DO UPDATE SET archived=EXCLUDED.archived,revision=rental_archive_marks.revision+1;
  INSERT INTO tenancy.audit_events(agency_id,actor_membership_id,action,request_id,metadata) VALUES(p_agency_id,actor,'rental.archive-mark',(p_input->>'requestId')::uuid,jsonb_build_object('rentalId',rid,'archived',p_input->'archived'));
  INSERT INTO app_private.archive_mark_receipts VALUES(p_agency_id,actor,(p_input->>'requestId')::uuid,p_input);
  RETURN 'true';
 ELSIF p_action<>'search' THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
 pg:=(p_input->>'page')::integer;q:=btrim(p_input->>'query');cutoff:=COALESCE((p_input->>'asOf')::timestamptz,clock_timestamp());
 IF pg IS NULL OR pg NOT BETWEEN 1 AND 10000 OR q IS NULL OR length(q)>120 OR q~'[\x01-\x1f\x7f]' OR cutoff>clock_timestamp()+interval '1 minute' OR
  COALESCE(p_input->>'state','all') NOT IN('all','brouillon','confirme','en_cours','termine','annule') OR COALESCE(p_input->>'signature','all') NOT IN('all','none','agency','client','completed','issued') OR COALESCE(p_input->>'payment','all') NOT IN('all','unpaid','partial','paid') OR COALESCE(p_input->>'archived','all') NOT IN('all','yes','no') THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
 WITH source AS (
  SELECT r.*,COALESCE(mark.archived,false) archive_mark,COALESCE(d.payload->'parties',jsonb_build_object('primaryDriver',app_private.rental_driver_payload(r.agency_id,r.client_id),'secondaryDriver',CASE WHEN rd.secondary_client_id IS NULL THEN NULL ELSE app_private.rental_driver_payload(r.agency_id,rd.secondary_client_id) END,'vehicle',jsonb_build_object('registrationNumber',v.registration,'make',v.make,'model',v.model))) parties,
   EXISTS(SELECT 1 FROM app_private.signing_sessions s WHERE s.agency_id=r.agency_id AND s.rental_id=r.id AND s.agency_signature IS NOT NULL) agency_signed,
   EXISTS(SELECT 1 FROM app_private.signing_sessions s WHERE s.agency_id=r.agency_id AND s.rental_id=r.id AND s.client_signature IS NOT NULL) client_signed,
   EXISTS(SELECT 1 FROM app_private.signing_sessions s WHERE s.agency_id=r.agency_id AND s.rental_id=r.id AND s.state='completed') completed,
   EXISTS(SELECT 1 FROM app_private.contract_artifacts a WHERE a.agency_id=r.agency_id AND a.rental_id=r.id AND a.payload->>'status'='issued') issued,
   COALESCE((SELECT sum(paid_delta) FROM app_private.rental_payments p WHERE p.agency_id=r.agency_id AND p.rental_id=r.id),0) paid
  FROM tenancy.rental_contracts r JOIN tenancy.vehicles v ON v.agency_id=r.agency_id AND v.id=r.vehicle_id
  LEFT JOIN app_private.rental_drivers rd ON rd.agency_id=r.agency_id AND rd.contract_id=r.id
  LEFT JOIN app_private.rental_archive_marks mark ON mark.agency_id=r.agency_id AND mark.rental_id=r.id
  LEFT JOIN LATERAL(SELECT payload FROM app_private.rental_document_versions dv WHERE dv.agency_id=r.agency_id AND dv.contract_id=r.id ORDER BY version LIMIT 1) d ON true
  WHERE r.agency_id=p_agency_id AND r.created_at<=cutoff
 ),filtered AS (
  SELECT *,CASE WHEN paid>=total_minor THEN 'paid' WHEN paid>0 THEN 'partial' ELSE 'unpaid' END pay_status FROM source
  WHERE (COALESCE(p_input->>'state','all')='all' OR state=p_input->>'state')
   AND (COALESCE(p_input->>'archived','all')='all' OR archive_mark=(p_input->>'archived'='yes'))
   AND (NULLIF(p_input->>'from','') IS NULL OR ends_at>=((p_input->>'from')::date::timestamp AT TIME ZONE 'UTC'))
   AND (NULLIF(p_input->>'to','') IS NULL OR starts_at<(((p_input->>'to')::date+1)::timestamp AT TIME ZONE 'UTC'))
   AND (NULLIF(p_input->>'createdFrom','') IS NULL OR created_at>=((p_input->>'createdFrom')::date::timestamp AT TIME ZONE 'UTC'))
   AND (NULLIF(p_input->>'createdTo','') IS NULL OR created_at<(((p_input->>'createdTo')::date+1)::timestamp AT TIME ZONE 'UTC'))
   AND (q='' OR EXISTS(SELECT 1 FROM jsonb_each_text(jsonb_build_object('reference',contract_number)||COALESCE(parties->'primaryDriver','{}')||jsonb_build_object('secondary',parties->'secondaryDriver')||COALESCE(parties->'vehicle','{}')) e WHERE strpos(lower(e.value),lower(q))>0))
   AND (COALESCE(p_input->>'signature','all')='all' OR CASE p_input->>'signature' WHEN 'none' THEN NOT agency_signed AND NOT client_signed WHEN 'agency' THEN agency_signed WHEN 'client' THEN client_signed WHEN 'completed' THEN completed WHEN 'issued' THEN issued END)
 ),matched AS (SELECT * FROM filtered WHERE COALESCE(p_input->>'payment','all')='all' OR pay_status=p_input->>'payment')
 SELECT jsonb_build_object('asOf',cutoff,'total',(SELECT count(*) FROM matched),'items',COALESCE((SELECT jsonb_agg(x ORDER BY x.created DESC,x.uid DESC) FROM (
  SELECT id uid,created_at created,jsonb_build_object('id',id,'reference',contract_number,'state',state,'version',version,'createdAt',created_at,'start',starts_at,'end',ends_at,'client',parties->'primaryDriver'->>'fullName','vehicle',concat_ws(' ',parties->'vehicle'->>'registrationNumber',parties->'vehicle'->>'make',parties->'vehicle'->>'model'),'archived',archive_mark,'agencySigned',agency_signed,'clientSigned',client_signed,'completed',completed,'payment',pay_status) payload FROM matched ORDER BY created_at DESC,id DESC LIMIT 20 OFFSET (pg-1)*20
 ) x),'[]')) INTO result;
 -- Strip ordering-only projection keys; return only the minimal payload.
 RETURN jsonb_set(result,'{items}',COALESCE((SELECT jsonb_agg(e->'payload') FROM jsonb_array_elements(result->'items') e),'[]'));
END $f$;

ALTER FUNCTION public.contratpro_archive(uuid,text,jsonb) OWNER TO contratpro_rental_writer;

REVOKE ALL ON FUNCTION public.contratpro_archive(uuid,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;

GRANT EXECUTE ON FUNCTION public.contratpro_archive(uuid,text,jsonb) TO authenticated;

CREATE TABLE app_private.sheets_creation_requests(agency_id uuid NOT NULL,request_id uuid NOT NULL,actor uuid NOT NULL,title text NOT NULL CHECK(length(title) BETWEEN 1 AND 80),
 state text NOT NULL DEFAULT 'uncertain' CHECK(state IN('uncertain','confirmed','abandoned')),spreadsheet_id text,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(agency_id,request_id));

CREATE UNIQUE INDEX sheets_one_unresolved_creation ON app_private.sheets_creation_requests(agency_id) WHERE state='uncertain';

ALTER TABLE app_private.sheets_creation_requests ENABLE ROW LEVEL SECURITY;

ALTER TABLE app_private.sheets_creation_requests FORCE ROW LEVEL SECURITY;

REVOKE ALL ON app_private.sheets_creation_requests FROM PUBLIC,anon,authenticated,service_role;

GRANT SELECT,INSERT,UPDATE ON app_private.sheets_creation_requests TO contratpro_sheets_worker;

CREATE POLICY creation_internal ON app_private.sheets_creation_requests TO contratpro_sheets_worker USING(true) WITH CHECK(true);

ALTER FUNCTION app_private.sheets_command(uuid,uuid,text,jsonb) RENAME TO sheets_command_before_a4;

CREATE FUNCTION app_private.sheets_command(aid uuid,actor uuid,action text,p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE r app_private.sheets_creation_requests;c app_private.sheets_connections;j app_private.sheets_jobs;h app_private.sheets_heads;result jsonb;pg integer;BEGIN
 IF action IN('creation-list','creation-claim','creation-confirm','creation-abandon') THEN
  IF actor IS NULL OR jsonb_typeof(p) IS DISTINCT FROM 'object' OR pg_column_size(p)>4096 THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('sheets-creation:'||aid::text,0));
  IF action='creation-list' THEN SELECT jsonb_build_object('items',COALESCE(jsonb_agg(v),'[]'),'unresolved',EXISTS(SELECT 1 FROM app_private.sheets_creation_requests WHERE agency_id=aid AND state='uncertain')) INTO result FROM (SELECT request_id AS "requestId",title,state,spreadsheet_id AS "spreadsheetId",created_at AS "createdAt" FROM app_private.sheets_creation_requests WHERE agency_id=aid ORDER BY created_at DESC,request_id DESC LIMIT 50) v;RETURN result;END IF;
  SELECT * INTO r FROM app_private.sheets_creation_requests WHERE agency_id=aid AND request_id=(p->>'requestId')::uuid FOR UPDATE;
  IF action='creation-claim' THEN
   IF r.request_id IS NOT NULL THEN IF r.title IS DISTINCT FROM p->>'title' THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;RETURN jsonb_build_object('send',false,'state',r.state,'spreadsheetId',r.spreadsheet_id);END IF;
   IF COALESCE(length(btrim(p->>'title')),0) NOT BETWEEN 1 AND 80 OR p->>'title'~'[\x01-\x1f]' THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
   INSERT INTO app_private.sheets_creation_requests(agency_id,request_id,actor,title) VALUES(aid,(p->>'requestId')::uuid,actor,p->>'title');
   INSERT INTO app_private.sheets_audit(agency_id,actor,action,detail) VALUES(aid,actor,'spreadsheet-creation-armed',jsonb_build_object('requestId',p->>'requestId'));
   RETURN '{"send":true,"state":"uncertain"}';
  END IF;
  IF r.request_id IS NULL OR r.state='abandoned' THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
  IF action='creation-confirm' THEN
   IF COALESCE(p->>'spreadsheetId','') !~ '^[A-Za-z0-9_-]{10,150}$' OR (r.spreadsheet_id IS NOT NULL AND r.spreadsheet_id IS DISTINCT FROM p->>'spreadsheetId') THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
   UPDATE app_private.sheets_creation_requests SET state='confirmed',spreadsheet_id=p->>'spreadsheetId' WHERE agency_id=aid AND request_id=r.request_id;
  ELSE
   IF r.state<>'uncertain' OR p->'acknowledge' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
   UPDATE app_private.sheets_creation_requests SET state='abandoned' WHERE agency_id=aid AND request_id=r.request_id;
  END IF;
  INSERT INTO app_private.sheets_audit(agency_id,actor,action,detail) VALUES(aid,actor,action,jsonb_build_object('requestId',r.request_id,'spreadsheetId',p->>'spreadsheetId','previousOutcome','unknown'));
  RETURN 'true';
 ELSIF action='dashboard-page' THEN
  pg:=(p->>'page')::integer;IF pg IS NULL OR pg NOT BETWEEN 1 AND 10000 THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
  result:=app_private.sheets_command_before_a4(aid,actor,'dashboard',jsonb_build_object('contractId',p->>'contractId'));
  RETURN result||jsonb_build_object('page',pg,'total',(SELECT count(*) FROM app_private.sheets_jobs WHERE agency_id=aid AND (p->>'contractId' IS NULL OR contract_id=(p->>'contractId')::uuid)),
   'historyLimit',100,'jobs',COALESCE((SELECT jsonb_agg(v) FROM (SELECT contract_id AS "contractId",state,desired AS sequence,last_sequence AS "lastSequence",retryable,attempts,error_code AS error,sync_at AS "syncAt" FROM app_private.sheets_jobs WHERE agency_id=aid AND (p->>'contractId' IS NULL OR contract_id=(p->>'contractId')::uuid) ORDER BY not_before DESC,contract_id DESC LIMIT 20 OFFSET (pg-1)*20) v),'[]'));
 ELSIF action='resync' THEN
  IF actor IS NULL THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
  SELECT * INTO c FROM app_private.sheets_connections WHERE agency_id=aid FOR UPDATE;
  SELECT * INTO h FROM app_private.sheets_heads WHERE agency_id=aid AND contract_id=(p->>'contractId')::uuid FOR UPDATE;
  SELECT * INTO j FROM app_private.sheets_jobs WHERE agency_id=aid AND contract_id=h.contract_id FOR UPDATE;
  IF j.contract_id IS NULL OR j.state IN('processing','reconciliation-required') OR j.armed THEN RAISE EXCEPTION 'Resolve ambiguous operation first' USING ERRCODE='40001';END IF;
  UPDATE app_private.sheets_jobs SET state='pending',attempts=0,not_before=clock_timestamp(),retryable=false,error_code=NULL WHERE agency_id=aid AND contract_id=h.contract_id;
  INSERT INTO app_private.sheets_audit(agency_id,actor,action,contract_id,sequence) VALUES(aid,actor,'resync-requested',h.contract_id,h.sequence);RETURN 'true';
 END IF;
 result:=app_private.sheets_command_before_a4(aid,actor,action,p);
 IF action='result' AND p->>'code'='capacity' THEN UPDATE app_private.sheets_jobs SET error_code='capacity',retryable=false WHERE agency_id=aid AND contract_id=(p->>'contractId')::uuid AND lease=(p->>'lease')::uuid;END IF;
 RETURN result;
END $f$;

ALTER FUNCTION public.contratpro_sheets_agency(text,text) RENAME TO contratpro_sheets_agency_before_a4;

REVOKE ALL ON FUNCTION public.contratpro_sheets_agency_before_a4(text,text) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.contratpro_sheets_agency(p_payload text,p_mac text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE p jsonb;aid uuid;actor uuid;BEGIN
 IF octet_length(p_payload)>65536 OR p_mac IS DISTINCT FROM app_private.sheets_mac(p_payload) THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
 p:=p_payload::jsonb;aid:=(p->>'agencyId')::uuid;
 IF p->>'action' IN('creation-list','creation-claim','creation-confirm','creation-abandon','resync','dashboard-page') THEN
  PERFORM public.contratpro_sheets_agency_before_a4(p_payload:=jsonb_build_object('agencyId',aid,'action',CASE WHEN p->>'action'='dashboard-page' THEN 'dashboard' ELSE 'authorize' END,'input','{}'::jsonb)::text,p_mac:=app_private.sheets_mac(jsonb_build_object('agencyId',aid,'action',CASE WHEN p->>'action'='dashboard-page' THEN 'dashboard' ELSE 'authorize' END,'input','{}'::jsonb)::text));
  actor:=app_private.rental_member(aid);RETURN app_private.sheets_command(aid,actor,p->>'action',p->'input');
 END IF;
 RETURN public.contratpro_sheets_agency_before_a4(p_payload,p_mac);
END $f$;

ALTER FUNCTION app_private.sheets_command(uuid,uuid,text,jsonb) OWNER TO contratpro_sheets_worker;

ALTER FUNCTION public.contratpro_sheets_agency(text,text) OWNER TO contratpro_rental_writer;

REVOKE ALL ON FUNCTION app_private.sheets_command(uuid,uuid,text,jsonb),public.contratpro_sheets_agency(text,text) FROM PUBLIC,anon,authenticated,service_role;

GRANT EXECUTE ON FUNCTION app_private.sheets_command(uuid,uuid,text,jsonb) TO contratpro_sheets_worker,contratpro_rental_writer;

GRANT EXECUTE ON FUNCTION public.contratpro_sheets_agency(text,text) TO authenticated;

ALTER FUNCTION public.contratpro_billing_agency(uuid,text,jsonb) RENAME TO contratpro_billing_agency_before_a4;

REVOKE ALL ON FUNCTION public.contratpro_billing_agency_before_a4(uuid,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.contratpro_billing_agency(p_agency_id uuid,p_action text,p_input jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE actor uuid;pg integer;result jsonb;BEGIN
 IF p_action='history' THEN
  actor:=app_private.billing_member(p_agency_id,'billing.view');PERFORM set_config('contratpro.billing_agency',p_agency_id::text,true);
  pg:=(p_input->>'page')::integer;IF pg IS NULL OR pg NOT BETWEEN 1 AND 10000 THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
  SELECT jsonb_build_object('total',(SELECT count(*) FROM app_private.billing_payments WHERE agency_id=p_agency_id),'items',COALESCE(jsonb_agg(v),'[]')) INTO result FROM (
   SELECT to_jsonb(p)||jsonb_build_object('amount_minor',p.amount_minor::text) v FROM app_private.billing_payments p WHERE agency_id=p_agency_id ORDER BY created_at DESC,id DESC LIMIT 20 OFFSET (pg-1)*20) x;RETURN result;
 END IF;
 RETURN public.contratpro_billing_agency_before_a4(p_agency_id,p_action,p_input);
END $f$;

ALTER FUNCTION public.contratpro_billing_platform(text,jsonb) RENAME TO contratpro_billing_platform_before_a4;

REVOKE ALL ON FUNCTION public.contratpro_billing_platform_before_a4(text,jsonb) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.contratpro_billing_platform(p_action text,p_input jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE actor uuid;pg integer;result jsonb;resource text;rel text;ordering text;projection text;condition text;BEGIN
 actor:=app_private.billing_admin();PERFORM set_config('contratpro.billing_internal','true',true);
 IF jsonb_typeof(p_input) IS DISTINCT FROM 'object' OR pg_column_size(p_input)>32768 THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
 IF p_action='support-page' THEN
  pg:=(p_input->>'page')::integer;resource:=p_input->>'resource';IF pg IS NULL OR pg NOT BETWEEN 1 AND 10000 THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
  -- All identifiers/projections are fixed allowlists, never caller expressions.
  condition:='true';
  CASE resource
   WHEN 'agencies' THEN rel:='tenancy.agencies';ordering:='id';projection:='jsonb_build_object(''id'',id,''name'',name,''state'',state)';
   WHEN 'subscriptions' THEN rel:='app_private.billing_subscriptions';ordering:='agency_id';projection:='to_jsonb(t)';
   WHEN 'payments' THEN rel:='app_private.billing_payments';ordering:='created_at DESC,id DESC';projection:='jsonb_build_object(''id'',id,''agency_id'',agency_id,''plan_id'',plan_id,''source'',source,''state'',state,''reference'',reference,''amount_minor'',amount_minor::text,''currency'',currency,''invoice_reference'',invoice_reference,''period_start'',period_start,''period_end'',period_end)';
   WHEN 'usage' THEN rel:='app_private.billing_usage';ordering:='agency_id,metric,bucket';projection:='to_jsonb(t)||jsonb_build_object(''used'',used::text,''reserved'',reserved::text)';
   WHEN 'events' THEN rel:='app_private.billing_provider_events';ordering:='received_at DESC,provider,event_id';projection:='jsonb_build_object(''provider'',provider,''eventId'',event_id,''outcome'',outcome,''at'',received_at)';condition:='outcome<>''applied''';
   WHEN 'operations' THEN rel:='app_private.billing_provider_operations';ordering:='agency_id,id';projection:='to_jsonb(t)';condition:='state IN(''prepared'',''uncertain'')';
   WHEN 'audit' THEN rel:='app_private.billing_audit';ordering:='at DESC,id DESC';projection:='to_jsonb(t)';
   ELSE RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';
  END CASE;
  EXECUTE format('SELECT jsonb_build_object(''total'',(SELECT count(*) FROM %s WHERE %s),''items'',COALESCE(jsonb_agg(v),''[]'')) FROM (SELECT %s v FROM %s t WHERE %s ORDER BY %s LIMIT 20 OFFSET $1) x',rel,condition,projection,rel,condition,ordering) INTO result USING (pg-1)*20;RETURN result;
 END IF;
 RETURN public.contratpro_billing_platform_before_a4(p_action,p_input);
END $f$;

ALTER FUNCTION public.contratpro_billing_gateway(text,text) RENAME TO contratpro_billing_gateway_before_a4;

REVOKE ALL ON FUNCTION public.contratpro_billing_gateway_before_a4(text,text) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.contratpro_billing_gateway(p_payload text,p_mac text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE p jsonb;pay app_private.billing_payments;result jsonb;BEGIN
 IF length(p_payload)>32768 OR p_mac IS NULL OR p_mac IS DISTINCT FROM app_private.billing_mac(p_payload) THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
 p:=p_payload::jsonb;PERFORM set_config('contratpro.billing_internal','true',true);
 IF p->>'action'='recovery-context' THEN
  SELECT * INTO STRICT pay FROM app_private.billing_payments WHERE id=(p->>'paymentId')::uuid;
  IF pay.source<>'provider' OR p->>'provider' IS NULL OR length(p->>'provider') NOT BETWEEN 1 AND 60 OR pay.provider IS DISTINCT FROM p->>'provider' THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
  RETURN jsonb_build_object('paymentId',pay.id,'provider',pay.provider,'amountMinor',pay.amount_minor::text,'currency',pay.currency,'operations',(SELECT COALESCE(jsonb_agg(jsonb_build_object('operationId',id,'kind',kind,'state',state,'reference',provider_reference)),'[]') FROM app_private.billing_provider_operations WHERE payment_id=pay.id AND provider=pay.provider));
 END IF;
 result:=public.contratpro_billing_gateway_before_a4(p_payload,p_mac);
 IF p->>'action'='prepare' THEN SELECT * INTO STRICT pay FROM app_private.billing_payments WHERE id=(p->>'paymentId')::uuid;result:=result||jsonb_build_object('amountMinor',pay.amount_minor::text,'currency',pay.currency);END IF;
 RETURN result;
END $f$;

ALTER FUNCTION public.contratpro_billing_agency(uuid,text,jsonb) OWNER TO contratpro_billing_writer;

ALTER FUNCTION public.contratpro_billing_platform(text,jsonb) OWNER TO contratpro_billing_writer;

ALTER FUNCTION public.contratpro_billing_gateway(text,text) OWNER TO contratpro_billing_writer;

REVOKE ALL ON FUNCTION public.contratpro_billing_agency(uuid,text,jsonb),public.contratpro_billing_platform(text,jsonb),public.contratpro_billing_gateway(text,text) FROM PUBLIC,anon,authenticated,service_role;

GRANT EXECUTE ON FUNCTION public.contratpro_billing_agency(uuid,text,jsonb),public.contratpro_billing_platform(text,jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION public.contratpro_billing_gateway(text,text) TO anon;
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
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.rental_archive_marks'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.archive_mark_receipts'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.sheets_creation_requests'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.rental_archive_marks'::regclass AND relrowsecurity) THEN RAISE EXCEPTION 'D2 declared RLS invariant missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.rental_archive_marks'::regclass AND relforcerowsecurity) THEN RAISE EXCEPTION 'D2 declared RLS invariant missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.archive_mark_receipts'::regclass AND relrowsecurity) THEN RAISE EXCEPTION 'D2 declared RLS invariant missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.archive_mark_receipts'::regclass AND relforcerowsecurity) THEN RAISE EXCEPTION 'D2 declared RLS invariant missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.sheets_creation_requests'::regclass AND relrowsecurity) THEN RAISE EXCEPTION 'D2 declared RLS invariant missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.sheets_creation_requests'::regclass AND relforcerowsecurity) THEN RAISE EXCEPTION 'D2 declared RLS invariant missing';END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace,
 LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
 WHERE (n.nspname||'.'||p.proname)=ANY(ARRAY['public.contratpro_archive','app_private.sheets_command_before_a4','app_private.sheets_command','public.contratpro_sheets_agency_before_a4','public.contratpro_sheets_agency','public.contratpro_billing_agency_before_a4','public.contratpro_billing_agency','public.contratpro_billing_platform_before_a4','public.contratpro_billing_platform','public.contratpro_billing_gateway_before_a4','public.contratpro_billing_gateway']::text[]) AND p.prosecdef AND a.grantee=0 AND a.privilege_type='EXECUTE') THEN RAISE EXCEPTION 'D2 definer PUBLIC execute leak';END IF;
END $d2_objects_post$;

DO $d2_security_post$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=ANY(ARRAY['contratpro_rental_writer','contratpro_sheets_worker','contratpro_billing_writer']::text[])
 AND (rolcanlogin OR rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication OR rolinherit)) THEN RAISE EXCEPTION 'D2 writer role widened';END IF;
END $d2_security_post$;
INSERT INTO supabase_migrations.schema_migrations(version) VALUES('20261126002400');
DO $d2_post$ BEGIN
 IF ARRAY(SELECT version FROM supabase_migrations.schema_migrations ORDER BY version) IS DISTINCT FROM ARRAY['20261115000000','20261115000100','20261115000200','20261115000300','20261115000400','20261115000500','20261115000600','20261116000700','20261118000800','20261118000900','20261118001000','20261119001100','20261119001200','20261120001300','20261122001400','20261122001500','20261124001600','20261124001700','20261124001800','20261124001900','20261124002000','20261125002100','20261125002200','20261125002300','20261126002400']::text[]
 THEN RAISE EXCEPTION 'D2 final history mismatch';END IF;
END $d2_post$;
COMMIT;
