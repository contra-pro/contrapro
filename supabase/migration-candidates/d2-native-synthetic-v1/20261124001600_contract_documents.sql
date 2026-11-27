-- D2 NATIVE SYNTHETIC TEST CANDIDATE ONLY. NOT A MANAGED DEPLOYMENT ARTIFACT.
-- Source: supabase/migration-drafts/20261124001600_contract_documents.sql; raw SHA256 99ef99d667346ce00d0f981c4eb7a79816f4c592fb56210cf946029a64b18b4d
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
 IF ARRAY(SELECT version FROM supabase_migrations.schema_migrations ORDER BY version) IS DISTINCT FROM ARRAY['20261115000000','20261115000100','20261115000200','20261115000300','20261115000400','20261115000500','20261115000600','20261116000700','20261118000800','20261118000900','20261118001000','20261119001100','20261119001200','20261120001300','20261122001400','20261122001500']::text[]
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

DO $d2_storage_owner$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class c WHERE c.oid='storage.objects'::regclass AND pg_catalog.pg_has_role(current_user,c.relowner,'USAGE')) THEN RAISE EXCEPTION 'D2 provider policy owner authority missing; no ownership/grant workaround';END IF;
END $d2_storage_owner$;

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

GRANT SELECT(agency_id,membership_id,role_id) ON tenancy.membership_roles TO contratpro_rental_writer;

GRANT SELECT(agency_id,id,key) ON tenancy.roles TO contratpro_rental_writer;

GRANT SELECT(agency_id,role_id,permission_key) ON tenancy.role_permissions TO contratpro_rental_writer;

CREATE POLICY document_member_roles ON tenancy.membership_roles FOR SELECT TO contratpro_rental_writer
 USING(membership_id IN(SELECT id FROM tenancy.memberships WHERE user_id=app_private.canonical_auth_user() AND state='active'));

CREATE POLICY document_roles ON tenancy.roles FOR SELECT TO contratpro_rental_writer
 USING(agency_id IN(SELECT agency_id FROM tenancy.memberships WHERE user_id=app_private.canonical_auth_user() AND state='active'));

CREATE POLICY document_permissions ON tenancy.role_permissions FOR SELECT TO contratpro_rental_writer
 USING(agency_id IN(SELECT agency_id FROM tenancy.memberships WHERE user_id=app_private.canonical_auth_user() AND state='active'));

CREATE TABLE app_private.document_renderer_key (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), secret text NOT NULL CHECK(secret~'^[a-f0-9]{64}$')
);

ALTER TABLE app_private.document_renderer_key ENABLE ROW LEVEL SECURITY;

ALTER TABLE app_private.document_renderer_key FORCE ROW LEVEL SECURITY;

REVOKE ALL ON app_private.document_renderer_key FROM PUBLIC,anon,authenticated,service_role;

GRANT SELECT ON app_private.document_renderer_key TO contratpro_rental_writer;

CREATE POLICY renderer_key_read ON app_private.document_renderer_key FOR SELECT TO contratpro_rental_writer USING(true);

CREATE FUNCTION app_private.document_renderer_mac(message text) RETURNS text
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE secret_hex text; key_bytes bytea; ipad bytea; opad bytea; i integer;
BEGIN
 SELECT secret INTO secret_hex FROM app_private.document_renderer_key WHERE singleton;
 IF secret_hex IS NULL THEN RAISE EXCEPTION 'Renderer unavailable' USING ERRCODE='55000'; END IF;
 key_bytes:=decode(secret_hex||repeat('00',32),'hex'); ipad:=key_bytes; opad:=key_bytes;
 FOR i IN 0..63 LOOP ipad:=set_byte(ipad,i,get_byte(key_bytes,i)#54); opad:=set_byte(opad,i,get_byte(key_bytes,i)#92); END LOOP;
 RETURN encode(sha256(opad||sha256(ipad||convert_to(message,'UTF8'))),'hex');
END $f$;

REVOKE ALL ON FUNCTION app_private.document_renderer_mac(text) FROM PUBLIC,anon,authenticated,service_role;

GRANT EXECUTE ON FUNCTION app_private.document_renderer_mac(text) TO contratpro_rental_writer;

CREATE TABLE app_private.contract_templates (
 agency_id uuid NOT NULL REFERENCES tenancy.agencies(id), id uuid NOT NULL,
 name text NOT NULL CHECK(length(name) BETWEEN 1 AND 120), archived boolean NOT NULL DEFAULT false,
 is_default boolean NOT NULL DEFAULT false, revision integer NOT NULL DEFAULT 0,
 PRIMARY KEY(agency_id,id), CHECK(NOT archived OR NOT is_default)
);

CREATE UNIQUE INDEX contract_template_default ON app_private.contract_templates(agency_id) WHERE is_default;

CREATE TABLE app_private.contract_template_versions (
 agency_id uuid NOT NULL, template_id uuid NOT NULL, id uuid NOT NULL, revision integer NOT NULL CHECK(revision>0),
 payload jsonb NOT NULL CHECK(pg_column_size(payload)<524288),
 PRIMARY KEY(agency_id,id), UNIQUE(agency_id,template_id,revision),
 FOREIGN KEY(agency_id,template_id) REFERENCES app_private.contract_templates(agency_id,id)
);

CREATE TABLE app_private.contract_objects (
 agency_id uuid NOT NULL REFERENCES tenancy.agencies(id), key text NOT NULL, checksum text NOT NULL CHECK(checksum~'^[a-f0-9]{64}$'),
 kind text NOT NULL CHECK(kind IN('originals','drafts','issued')), state text NOT NULL DEFAULT 'pending' CHECK(state IN('pending','retained','deleting')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), PRIMARY KEY(agency_id,key),
 CHECK(key LIKE agency_id::text||'/'||kind||'/%')
);

CREATE TABLE app_private.contract_generation_jobs (
 agency_id uuid NOT NULL, request_id uuid NOT NULL, rental_id uuid NOT NULL, rental_version integer NOT NULL,
 template_version_id uuid NOT NULL, input jsonb NOT NULL CHECK(pg_column_size(input)<100000), snapshot jsonb NOT NULL,
 PRIMARY KEY(agency_id,request_id), FOREIGN KEY(agency_id,rental_id,rental_version) REFERENCES app_private.rental_document_versions(agency_id,contract_id,version),
 FOREIGN KEY(agency_id,template_version_id) REFERENCES app_private.contract_template_versions(agency_id,id)
);

CREATE TABLE app_private.contract_artifacts (
 agency_id uuid NOT NULL, id uuid NOT NULL, request_id uuid NOT NULL, rental_id uuid NOT NULL, rental_version integer NOT NULL,
 payload jsonb NOT NULL, PRIMARY KEY(agency_id,id), UNIQUE(agency_id,request_id),
 FOREIGN KEY(agency_id,request_id) REFERENCES app_private.contract_generation_jobs(agency_id,request_id)
);

CREATE TABLE app_private.rental_template_selections (
 agency_id uuid NOT NULL, rental_id uuid NOT NULL, template_version_id uuid NOT NULL,
 PRIMARY KEY(agency_id,rental_id), FOREIGN KEY(agency_id,rental_id) REFERENCES tenancy.rental_contracts(agency_id,id),
 FOREIGN KEY(agency_id,template_version_id) REFERENCES app_private.contract_template_versions(agency_id,id)
);

DO $tables$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['contract_templates','contract_template_versions','contract_objects','contract_generation_jobs','contract_artifacts','rental_template_selections'] LOOP
  EXECUTE format('ALTER TABLE app_private.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE app_private.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON app_private.%I FROM PUBLIC,anon,authenticated,service_role',t);
  EXECUTE format('GRANT SELECT,INSERT ON app_private.%I TO contratpro_rental_writer',t);
  EXECUTE format('CREATE POLICY document_member ON app_private.%I TO contratpro_rental_writer USING(app_private.rental_member(agency_id) IS NOT NULL) WITH CHECK(app_private.rental_member(agency_id) IS NOT NULL)',t);
 END LOOP;
END $tables$;

GRANT UPDATE ON app_private.contract_templates,app_private.contract_objects,app_private.rental_template_selections TO contratpro_rental_writer;

CREATE TRIGGER template_version_immutable BEFORE UPDATE OR DELETE ON app_private.contract_template_versions FOR EACH ROW EXECUTE FUNCTION app_private.rental_receipt_immutable();

CREATE TRIGGER generation_job_immutable BEFORE UPDATE OR DELETE ON app_private.contract_generation_jobs FOR EACH ROW EXECUTE FUNCTION app_private.rental_receipt_immutable();

CREATE TRIGGER contract_artifact_immutable BEFORE UPDATE OR DELETE ON app_private.contract_artifacts FOR EACH ROW EXECUTE FUNCTION app_private.rental_receipt_immutable();

CREATE FUNCTION public.contratpro_documents(p_agency_id uuid,p_action text,p_input jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE actor uuid; tid uuid; ver app_private.contract_template_versions; tpl app_private.contract_templates;
 job app_private.contract_generation_jobs; result jsonb; obj app_private.contract_objects; snapshot jsonb; rid uuid; req uuid; new_id uuid;
 required_keys text[];
BEGIN
 actor:=app_private.rental_member(p_agency_id);
 IF jsonb_typeof(p_input)<>'object' OR pg_column_size(p_input)>524288 THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023'; END IF;
 required_keys:=CASE p_action
  WHEN 'reserve' THEN ARRAY['key','checksum','kind'] WHEN 'save' THEN ARRAY['templateId','id','expectedRevision','name','format','originalKey','checksum','config']
  WHEN 'begin' THEN ARRAY['requestId','rentalId','rentalVersion','templateVersionId','status','issueDate','custom']
  WHEN 'finish' THEN ARRAY['requestId','key','checksum','sourceChecksum','attestation'] WHEN 'archive' THEN ARRAY['templateId'] WHEN 'default' THEN ARRAY['templateId']
  WHEN 'version' THEN ARRAY['id'] WHEN 'artifact' THEN ARRAY['id'] WHEN 'history' THEN ARRAY['rentalId'] WHEN 'selection' THEN ARRAY['rentalId']
  WHEN 'select' THEN ARRAY['rentalId','templateVersionId'] WHEN 'cleanup-finish' THEN ARRAY['key'] ELSE ARRAY[]::text[] END;
 -- Serializes defaults, version appends, request reservations and issuance per agency.
 PERFORM pg_advisory_xact_lock(hashtextextended('documents:'||p_agency_id::text,0));
 IF p_action='capabilities' THEN RETURN '{"contractVersion":1,"privateStorage":true}'::jsonb; END IF;
 IF p_action IN('save','archive','default','cleanup','cleanup-finish') OR (p_action='reserve' AND p_input->>'kind'='originals') THEN
  IF NOT EXISTS(SELECT 1 FROM tenancy.membership_roles mr JOIN tenancy.roles r ON r.agency_id=mr.agency_id AND r.id=mr.role_id
   JOIN tenancy.role_permissions rp ON rp.agency_id=r.agency_id AND rp.role_id=r.id
   WHERE mr.agency_id=p_agency_id AND mr.membership_id=actor AND r.key='owner' AND rp.permission_key='agency.manage') THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
 END IF;
 IF NOT(p_input ?& required_keys) OR EXISTS(SELECT 1 FROM jsonb_each(p_input) e WHERE e.value='null'::jsonb) THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023'; END IF;
 IF p_action='list' THEN
  SELECT COALESCE(jsonb_agg(jsonb_build_object('agencyId',t.agency_id,'id',t.id,'name',t.name,'archived',t.archived,'isDefault',t.is_default,
   'versions',(SELECT COALESCE(jsonb_agg(v.payload ORDER BY v.revision DESC),'[]'::jsonb) FROM app_private.contract_template_versions v WHERE v.agency_id=t.agency_id AND v.template_id=t.id)) ORDER BY t.name,t.id),'[]'::jsonb)
  INTO result FROM app_private.contract_templates t WHERE t.agency_id=p_agency_id; RETURN result;
 ELSIF p_action='version' THEN
  SELECT payload INTO result FROM app_private.contract_template_versions WHERE agency_id=p_agency_id AND id=(p_input->>'id')::uuid;
 ELSIF p_action='selection' THEN
  SELECT to_jsonb(template_version_id) INTO result FROM app_private.rental_template_selections WHERE agency_id=p_agency_id AND rental_id=(p_input->>'rentalId')::uuid;
  RETURN COALESCE(result,'null'::jsonb);
 ELSIF p_action='select' THEN
  rid:=(p_input->>'rentalId')::uuid;
  PERFORM 1 FROM tenancy.rental_contracts WHERE agency_id=p_agency_id AND id=rid AND state='brouillon' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001'; END IF;
  SELECT * INTO ver FROM app_private.contract_template_versions WHERE agency_id=p_agency_id AND id=(p_input->>'templateVersionId')::uuid;
  IF ver.id IS NULL OR NOT EXISTS(SELECT 1 FROM app_private.contract_templates WHERE agency_id=p_agency_id AND id=ver.template_id AND NOT archived) THEN RAISE EXCEPTION 'Missing' USING ERRCODE='P0002'; END IF;
  INSERT INTO app_private.rental_template_selections VALUES(p_agency_id,rid,ver.id) ON CONFLICT(agency_id,rental_id) DO UPDATE SET template_version_id=EXCLUDED.template_version_id;
  RETURN to_jsonb(ver.id);
 ELSIF p_action='history' THEN
  SELECT COALESCE(jsonb_agg(payload ORDER BY rental_version DESC,id),'[]'::jsonb) INTO result FROM app_private.contract_artifacts WHERE agency_id=p_agency_id AND rental_id=(p_input->>'rentalId')::uuid;
 ELSIF p_action='artifact' THEN
  SELECT payload INTO result FROM app_private.contract_artifacts WHERE agency_id=p_agency_id AND id=(p_input->>'id')::uuid;
 ELSIF p_action='cleanup' THEN
  -- Seven-day safety window; only unused original uploads. Generation jobs and
  -- issued artifacts are retained indefinitely, including failed attempts.
  UPDATE app_private.contract_objects o SET state='deleting' WHERE o.agency_id=p_agency_id AND o.kind='originals' AND o.state='pending'
   AND o.created_at<clock_timestamp()-interval '7 days' AND NOT EXISTS(SELECT 1 FROM app_private.contract_template_versions v WHERE v.agency_id=o.agency_id AND v.payload->>'originalKey'=o.key);
  SELECT COALESCE(jsonb_agg(key),'[]'::jsonb) INTO result FROM (SELECT key FROM app_private.contract_objects WHERE agency_id=p_agency_id AND state='deleting' ORDER BY key LIMIT 100) c; RETURN result;
 ELSIF p_action='cleanup-finish' THEN
  DELETE FROM app_private.contract_objects WHERE agency_id=p_agency_id AND key=p_input->>'key' AND state='deleting'; RETURN 'true';
 ELSIF p_action='reserve' THEN
  IF p_input->>'checksum' !~ '^[a-f0-9]{64}$' OR p_input->>'kind' NOT IN('originals','drafts','issued') OR
   p_input->>'key' !~ ('^'||p_agency_id::text||'/'||(p_input->>'kind')||'/[a-f0-9-]{36}/'||(p_input->>'checksum')||'\.(pdf|docx)$') THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023'; END IF;
  IF p_input->>'kind'<>'originals' AND NOT EXISTS(SELECT 1 FROM app_private.contract_generation_jobs WHERE agency_id=p_agency_id AND request_id=(p_input->>'requestId')::uuid) THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
  INSERT INTO app_private.contract_objects(agency_id,key,checksum,kind) VALUES(p_agency_id,p_input->>'key',p_input->>'checksum',p_input->>'kind') ON CONFLICT DO NOTHING; RETURN 'true';
 ELSIF p_action='save' THEN
  tid:=(p_input->>'templateId')::uuid; new_id:=(p_input->>'id')::uuid;
  INSERT INTO app_private.contract_templates(agency_id,id,name) VALUES(p_agency_id,tid,p_input->>'name') ON CONFLICT DO NOTHING;
  SELECT * INTO STRICT tpl FROM app_private.contract_templates WHERE agency_id=p_agency_id AND id=tid FOR UPDATE;
  IF tpl.archived OR tpl.revision<>(p_input->>'expectedRevision')::integer THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001'; END IF;
  SELECT * INTO obj FROM app_private.contract_objects WHERE agency_id=p_agency_id AND key=p_input->>'originalKey' AND kind='originals' AND checksum=p_input->>'checksum';
  IF obj.key IS NULL OR obj.state='deleting' OR p_input->>'format' NOT IN('pdf','docx') OR jsonb_typeof(p_input->'config')<>'object' OR
   jsonb_typeof(p_input->'config'->'mappings') IS DISTINCT FROM 'array' OR jsonb_typeof(p_input->'config'->'signatures') IS DISTINCT FROM 'array' OR
   jsonb_typeof(p_input->'config'->'custom') IS DISTINCT FROM 'array' OR COALESCE(p_input->'config'->>'locale','') NOT IN('fr','ar') THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023'; END IF;
  result:=jsonb_build_object('agencyId',p_agency_id,'templateId',tid,'id',new_id,'revision',tpl.revision+1,'name',p_input->>'name','format',p_input->>'format','originalKey',obj.key,'checksum',obj.checksum,'config',p_input->'config');
  INSERT INTO app_private.contract_template_versions VALUES(p_agency_id,tid,new_id,tpl.revision+1,result);
  UPDATE app_private.contract_templates SET name=p_input->>'name',revision=revision+1 WHERE agency_id=p_agency_id AND id=tid;
  UPDATE app_private.contract_objects SET state='retained' WHERE agency_id=p_agency_id AND key=obj.key; RETURN result;
 ELSIF p_action IN('archive','default') THEN
  tid:=(p_input->>'templateId')::uuid;
  SELECT * INTO tpl FROM app_private.contract_templates WHERE agency_id=p_agency_id AND id=tid;
  IF tpl.id IS NULL OR tpl.archived THEN RAISE EXCEPTION 'Missing' USING ERRCODE='P0002'; END IF;
  IF p_action='archive' THEN UPDATE app_private.contract_templates SET archived=true,is_default=false WHERE agency_id=p_agency_id AND id=tid;
  ELSE UPDATE app_private.contract_templates SET is_default=false WHERE agency_id=p_agency_id AND is_default;
   UPDATE app_private.contract_templates SET is_default=true WHERE agency_id=p_agency_id AND id=tid; END IF; RETURN 'true';
 ELSIF p_action='begin' THEN
  req:=(p_input->>'requestId')::uuid; rid:=(p_input->>'rentalId')::uuid;
  SELECT * INTO job FROM app_private.contract_generation_jobs WHERE agency_id=p_agency_id AND request_id=req;
  IF job.request_id IS NOT NULL THEN
   IF job.input<>p_input THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001'; END IF;
  ELSE
   SELECT * INTO ver FROM app_private.contract_template_versions WHERE agency_id=p_agency_id AND id=(p_input->>'templateVersionId')::uuid;
   IF ver.id IS NULL OR NOT EXISTS(SELECT 1 FROM app_private.contract_templates WHERE agency_id=p_agency_id AND id=ver.template_id AND NOT archived) THEN RAISE EXCEPTION 'Missing' USING ERRCODE='P0002'; END IF;
   SELECT payload INTO snapshot FROM app_private.rental_document_versions WHERE agency_id=p_agency_id AND contract_id=rid AND version=(p_input->>'rentalVersion')::integer;
   IF snapshot IS NULL OR p_input->>'status' NOT IN('draft','issued') OR p_input->>'issueDate' !~ '^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023'; END IF;
   -- Do not issue a stale source rental. Existing artifacts remain historically readable.
   IF NOT EXISTS(SELECT 1 FROM tenancy.rental_contracts WHERE agency_id=p_agency_id AND id=rid AND version=(p_input->>'rentalVersion')::integer AND state IN('confirme','en_cours','termine')) THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001'; END IF;
   INSERT INTO app_private.contract_generation_jobs VALUES(p_agency_id,req,rid,(p_input->>'rentalVersion')::integer,ver.id,p_input,snapshot) RETURNING * INTO job;
  END IF;
  SELECT payload INTO result FROM app_private.contract_artifacts WHERE agency_id=p_agency_id AND request_id=req;
  SELECT * INTO STRICT ver FROM app_private.contract_template_versions WHERE agency_id=p_agency_id AND id=job.template_version_id;
  RETURN jsonb_build_object('artifact',result,'snapshot',job.snapshot,'template',ver.payload,'fingerprint',job.request_id);
 ELSIF p_action='finish' THEN
  req:=(p_input->>'requestId')::uuid;
  IF p_input->>'attestation' IS DISTINCT FROM app_private.document_renderer_mac(concat_ws('|',p_agency_id::text,req::text,p_input->>'key',p_input->>'checksum',p_input->>'sourceChecksum')) THEN
   RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
  SELECT payload INTO result FROM app_private.contract_artifacts WHERE agency_id=p_agency_id AND request_id=req;
  IF result IS NOT NULL THEN RETURN result; END IF;
  SELECT * INTO job FROM app_private.contract_generation_jobs WHERE agency_id=p_agency_id AND request_id=req;
  SELECT * INTO obj FROM app_private.contract_objects WHERE agency_id=p_agency_id AND key=p_input->>'key' AND checksum=p_input->>'checksum';
  IF job.request_id IS NULL OR obj.key IS NULL OR obj.state='deleting' OR obj.kind<>(CASE WHEN job.input->>'status'='issued' THEN 'issued' ELSE 'drafts' END) OR
   obj.key NOT LIKE p_agency_id::text||'/'||obj.kind||'/'||req::text||'/%' THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023'; END IF;
  SELECT * INTO STRICT ver FROM app_private.contract_template_versions WHERE agency_id=p_agency_id AND id=job.template_version_id;
  IF p_input->>'sourceChecksum'<>ver.payload->>'checksum' THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001'; END IF;
  new_id:=gen_random_uuid();
  result:=jsonb_build_object('id',new_id,'agencyId',p_agency_id,'rentalId',job.rental_id,'rentalVersion',job.rental_version,'templateVersionId',job.template_version_id,
   'key',obj.key,'checksum',obj.checksum,'sourceChecksum',ver.payload->>'checksum','status',job.input->>'status','requestId',req,'createdAt',clock_timestamp(),
   'signing',jsonb_build_object('order',jsonb_build_array('agency','client'),'evidence',NULL,'zones',ver.payload->'config'->'signatures'));
  INSERT INTO app_private.contract_artifacts VALUES(p_agency_id,new_id,req,job.rental_id,job.rental_version,result);
  UPDATE app_private.contract_objects SET state='retained' WHERE agency_id=p_agency_id AND key=obj.key;
  RETURN result;
 ELSE RAISE EXCEPTION 'Invalid' USING ERRCODE='22023'; END IF;
 IF result IS NULL THEN RAISE EXCEPTION 'Missing' USING ERRCODE='P0002'; END IF; RETURN result;
END $f$;

REVOKE ALL ON FUNCTION public.contratpro_documents(uuid,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;

ALTER FUNCTION public.contratpro_documents(uuid,text,jsonb) OWNER TO contratpro_rental_writer;

GRANT EXECUTE ON FUNCTION public.contratpro_documents(uuid,text,jsonb) TO authenticated;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES('contract-documents','contract-documents',false,10485760,ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);

CREATE FUNCTION public.contratpro_document_object_access(p_key text,p_write boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE aid uuid; obj app_private.contract_objects;
BEGIN
 IF p_key !~ '^[a-f0-9-]{36}/(originals|drafts|issued)/[a-f0-9-]{36}/[a-f0-9]{64}\.(pdf|docx)$' THEN RETURN false; END IF;
 aid:=split_part(p_key,'/',1)::uuid; PERFORM app_private.rental_member(aid);
 SELECT * INTO obj FROM app_private.contract_objects WHERE agency_id=aid AND key=p_key;
 RETURN obj.key IS NOT NULL AND (NOT p_write OR obj.state='pending');
EXCEPTION WHEN invalid_text_representation OR insufficient_privilege THEN RETURN false;
END $f$;

REVOKE ALL ON FUNCTION public.contratpro_document_object_access(text,boolean) FROM PUBLIC,anon,authenticated,service_role;

ALTER FUNCTION public.contratpro_document_object_access(text,boolean) OWNER TO contratpro_rental_writer;

GRANT EXECUTE ON FUNCTION public.contratpro_document_object_access(text,boolean) TO authenticated;

CREATE POLICY contract_object_read ON storage.objects FOR SELECT TO authenticated
 USING(bucket_id='contract-documents' AND public.contratpro_document_object_access(name,false));

CREATE POLICY contract_object_insert ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(bucket_id='contract-documents' AND public.contratpro_document_object_access(name,true));

GRANT DELETE ON app_private.contract_objects TO contratpro_rental_writer;

CREATE FUNCTION public.contratpro_document_cleanup_access(p_key text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE aid uuid; BEGIN
 IF p_key !~ '^[a-f0-9-]{36}/originals/[a-f0-9-]{36}/[a-f0-9]{64}\.(pdf|docx)$' THEN RETURN false; END IF;
 aid:=split_part(p_key,'/',1)::uuid; PERFORM app_private.rental_member(aid);
 RETURN EXISTS(SELECT 1 FROM app_private.contract_objects WHERE agency_id=aid AND key=p_key AND state='deleting');
EXCEPTION WHEN invalid_text_representation OR insufficient_privilege THEN RETURN false;
END $f$;

REVOKE ALL ON FUNCTION public.contratpro_document_cleanup_access(text) FROM PUBLIC,anon,authenticated,service_role;

ALTER FUNCTION public.contratpro_document_cleanup_access(text) OWNER TO contratpro_rental_writer;

GRANT EXECUTE ON FUNCTION public.contratpro_document_cleanup_access(text) TO authenticated;

CREATE POLICY contract_orphan_delete ON storage.objects FOR DELETE TO authenticated
 USING(bucket_id='contract-documents' AND public.contratpro_document_cleanup_access(name));
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
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.document_renderer_key'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.contract_templates'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.contract_template_versions'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.contract_objects'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.contract_generation_jobs'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.contract_artifacts'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.rental_template_selections'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.document_renderer_key'::regclass AND relrowsecurity) THEN RAISE EXCEPTION 'D2 declared RLS invariant missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.document_renderer_key'::regclass AND relforcerowsecurity) THEN RAISE EXCEPTION 'D2 declared RLS invariant missing';END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace,
 LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
 WHERE (n.nspname||'.'||p.proname)=ANY(ARRAY['app_private.document_renderer_mac','public.contratpro_documents','public.contratpro_document_object_access','public.contratpro_document_cleanup_access']::text[]) AND p.prosecdef AND a.grantee=0 AND a.privilege_type='EXECUTE') THEN RAISE EXCEPTION 'D2 definer PUBLIC execute leak';END IF;
END $d2_objects_post$;
DO $d2_bucket_post$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='contract-documents' AND name='contract-documents' AND NOT public AND file_size_limit=10485760 AND allowed_mime_types=ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']) THEN RAISE EXCEPTION 'D2 private bucket configuration mismatch';END IF;
END $d2_bucket_post$;
DO $d2_security_post$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=ANY(ARRAY['contratpro_rental_writer']::text[])
 AND (rolcanlogin OR rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication OR rolinherit)) THEN RAISE EXCEPTION 'D2 writer role widened';END IF;
END $d2_security_post$;
INSERT INTO supabase_migrations.schema_migrations(version) VALUES('20261124001600');
DO $d2_post$ BEGIN
 IF ARRAY(SELECT version FROM supabase_migrations.schema_migrations ORDER BY version) IS DISTINCT FROM ARRAY['20261115000000','20261115000100','20261115000200','20261115000300','20261115000400','20261115000500','20261115000600','20261116000700','20261118000800','20261118000900','20261118001000','20261119001100','20261119001200','20261120001300','20261122001400','20261122001500','20261124001600']::text[]
 THEN RAISE EXCEPTION 'D2 final history mismatch';END IF;
END $d2_post$;
COMMIT;
