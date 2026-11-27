-- D2 NATIVE SYNTHETIC TEST CANDIDATE ONLY. NOT A MANAGED DEPLOYMENT ARTIFACT.
-- Source: supabase/migration-drafts/20261124001700_signing_engine.sql; raw SHA256 79fd03dbfab28c3fb14941519c847333f9598aec26ee0d1bc9616a6e634c2b44
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
 IF ARRAY(SELECT version FROM supabase_migrations.schema_migrations ORDER BY version) IS DISTINCT FROM ARRAY['20261115000000','20261115000100','20261115000200','20261115000300','20261115000400','20261115000500','20261115000600','20261116000700','20261118000800','20261118000900','20261118001000','20261119001100','20261119001200','20261120001300','20261122001400','20261122001500','20261124001600']::text[]
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

INSERT INTO tenancy.permissions(key,description) VALUES('contracts.sign','Sign and manage agency contract signing sessions');

CREATE TABLE app_private.signing_gateway_key(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),secret text NOT NULL CHECK(secret~'^[a-f0-9]{64}$'));

CREATE TABLE app_private.signing_sessions(
 agency_id uuid NOT NULL, id uuid NOT NULL, rental_id uuid NOT NULL, artifact_id uuid NOT NULL, version integer NOT NULL DEFAULT 1 CHECK(version>0),
 state text NOT NULL CHECK(state IN('awaiting_agency','agency_signed','awaiting_client','client_signed','finalization_pending','completed','expired','declined','cancelled','failed','reconciliation_required')),
 locale text NOT NULL CHECK(locale IN('fr','ar')), assurance text NOT NULL CHECK(assurance IN('simple','external-advanced','external-qualified-requested')),
 provider_id text, original jsonb NOT NULL, client_id uuid NOT NULL, client_name text NOT NULL, expires_at timestamptz NOT NULL, agency_member_id uuid NOT NULL,
 agency_signature jsonb, client_signature jsonb, intermediate jsonb, final jsonb,
 PRIMARY KEY(agency_id,id), FOREIGN KEY(agency_id,rental_id) REFERENCES tenancy.rental_contracts(agency_id,id),
 FOREIGN KEY(agency_id,artifact_id) REFERENCES app_private.contract_artifacts(agency_id,id)
);

CREATE UNIQUE INDEX one_pending_signing ON app_private.signing_sessions(agency_id,rental_id)
 WHERE state NOT IN('completed','expired','declined','cancelled','failed');

CREATE TABLE app_private.signing_invitations(
 agency_id uuid NOT NULL, session_id uuid NOT NULL, token_hash text PRIMARY KEY CHECK(token_hash~'^[a-f0-9]{64}$'), code_hash text NOT NULL CHECK(code_hash~'^[a-f0-9]{64}$'),
 expires_at timestamptz NOT NULL, revoked boolean NOT NULL DEFAULT false, consumed boolean NOT NULL DEFAULT false,
 failures integer NOT NULL DEFAULT 0 CHECK(failures>=0), challenge_id uuid, verified_until timestamptz,
 FOREIGN KEY(agency_id,session_id) REFERENCES app_private.signing_sessions(agency_id,id)
);

CREATE TABLE app_private.signing_events(
 agency_id uuid NOT NULL, session_id uuid NOT NULL, sequence integer NOT NULL, previous_hash text NOT NULL, hash text NOT NULL CHECK(hash~'^[a-f0-9]{64}$'), event text NOT NULL,
 PRIMARY KEY(agency_id,session_id,sequence), FOREIGN KEY(agency_id,session_id) REFERENCES app_private.signing_sessions(agency_id,id)
);

CREATE TABLE app_private.signing_receipts(
 agency_id uuid NOT NULL, session_id uuid NOT NULL, request_id uuid NOT NULL, action text NOT NULL, actor text NOT NULL, input jsonb NOT NULL, result jsonb NOT NULL,
 PRIMARY KEY(agency_id,session_id,request_id,action), FOREIGN KEY(agency_id,session_id) REFERENCES app_private.signing_sessions(agency_id,id)
);

CREATE TABLE app_private.signing_objects(
 agency_id uuid NOT NULL, session_id uuid NOT NULL, kind text NOT NULL CHECK(kind IN('agency','final')), key text NOT NULL, checksum text NOT NULL CHECK(checksum~'^[a-f0-9]{64}$'),
 intent jsonb NOT NULL, retained boolean NOT NULL DEFAULT false, PRIMARY KEY(agency_id,session_id,kind), UNIQUE(agency_id,key),
 FOREIGN KEY(agency_id,session_id) REFERENCES app_private.signing_sessions(agency_id,id)
);

CREATE TABLE app_private.signing_rate(bucket text NOT NULL,window_start timestamptz NOT NULL,count integer NOT NULL,PRIMARY KEY(bucket,window_start));

CREATE INDEX signing_rate_expiry ON app_private.signing_rate(window_start);

CREATE TABLE app_private.signing_provider_operations(
 agency_id uuid NOT NULL, session_id uuid NOT NULL, id uuid PRIMARY KEY, provider_id text NOT NULL, operation jsonb NOT NULL,
 state text NOT NULL CHECK(state IN('claimed','accepted','rejected','unknown')), transaction_id text,
 FOREIGN KEY(agency_id,session_id) REFERENCES app_private.signing_sessions(agency_id,id),UNIQUE(provider_id,transaction_id)
);

CREATE TABLE app_private.signing_provider_inbox(provider_id text NOT NULL,event_id text NOT NULL,hash text NOT NULL,payload jsonb NOT NULL,PRIMARY KEY(provider_id,event_id));

CREATE UNIQUE INDEX signing_provider_party ON app_private.signing_provider_operations(agency_id,session_id,(operation->>'party'));

DO $tables$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['signing_gateway_key','signing_sessions','signing_invitations','signing_events','signing_receipts','signing_objects','signing_rate','signing_provider_operations','signing_provider_inbox'] LOOP
  EXECUTE format('ALTER TABLE app_private.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE app_private.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON app_private.%I FROM PUBLIC,anon,authenticated,service_role',t);
  EXECUTE format('GRANT SELECT ON app_private.%I TO contratpro_rental_writer',t);
  IF t NOT IN('signing_gateway_key','signing_rate','signing_provider_inbox') THEN
   EXECUTE format('CREATE POLICY signing_scope ON app_private.%I TO contratpro_rental_writer USING(agency_id=nullif(current_setting(''contratpro.signing_agency'',true),'''')::uuid) WITH CHECK(agency_id=nullif(current_setting(''contratpro.signing_agency'',true),'''')::uuid)',t);
  ELSE EXECUTE format('CREATE POLICY signing_internal ON app_private.%I TO contratpro_rental_writer USING(true) WITH CHECK(true)',t); END IF;
 END LOOP;
END $tables$;

GRANT INSERT,UPDATE ON app_private.signing_sessions,app_private.signing_invitations,app_private.signing_objects,app_private.signing_provider_operations TO contratpro_rental_writer;

GRANT INSERT ON app_private.signing_events,app_private.signing_receipts,app_private.signing_provider_inbox TO contratpro_rental_writer;

GRANT INSERT,UPDATE,DELETE ON app_private.signing_rate TO contratpro_rental_writer;

CREATE TRIGGER signing_event_immutable BEFORE UPDATE OR DELETE ON app_private.signing_events FOR EACH ROW EXECUTE FUNCTION app_private.rental_receipt_immutable();

CREATE TRIGGER signing_receipt_immutable BEFORE UPDATE OR DELETE ON app_private.signing_receipts FOR EACH ROW EXECUTE FUNCTION app_private.rental_receipt_immutable();

CREATE TRIGGER signing_inbox_immutable BEFORE UPDATE OR DELETE ON app_private.signing_provider_inbox FOR EACH ROW EXECUTE FUNCTION app_private.rental_receipt_immutable();

CREATE FUNCTION app_private.signing_binding_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Immutable signing history' USING ERRCODE='42501';END IF;
 IF ROW(NEW.agency_id,NEW.id,NEW.rental_id,NEW.artifact_id,NEW.original,NEW.client_id,NEW.client_name,NEW.locale,NEW.assurance,NEW.provider_id,NEW.agency_member_id)
  IS DISTINCT FROM ROW(OLD.agency_id,OLD.id,OLD.rental_id,OLD.artifact_id,OLD.original,OLD.client_id,OLD.client_name,OLD.locale,OLD.assurance,OLD.provider_id,OLD.agency_member_id)
  OR (OLD.agency_signature IS NOT NULL AND NEW.agency_signature IS DISTINCT FROM OLD.agency_signature)
  OR (OLD.client_signature IS NOT NULL AND NEW.client_signature IS DISTINCT FROM OLD.client_signature)
  OR (OLD.intermediate IS NOT NULL AND NEW.intermediate IS DISTINCT FROM OLD.intermediate)
  OR (OLD.final IS NOT NULL AND NEW.final IS DISTINCT FROM OLD.final)
  OR (OLD.state IN('completed','expired','declined','cancelled','failed') AND NEW IS DISTINCT FROM OLD)
 THEN RAISE EXCEPTION 'Immutable signing binding' USING ERRCODE='42501';END IF;RETURN NEW;END $f$;

CREATE TRIGGER signing_binding_guard BEFORE UPDATE OR DELETE ON app_private.signing_sessions FOR EACH ROW EXECUTE FUNCTION app_private.signing_binding_immutable();

CREATE FUNCTION app_private.signing_mac(message text) RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE secret_hex text; k bytea; a bytea; b bytea; i integer; BEGIN
 SELECT secret INTO secret_hex FROM app_private.signing_gateway_key WHERE singleton;
 IF secret_hex IS NULL THEN RAISE EXCEPTION 'Signing unavailable' USING ERRCODE='55000'; END IF;
 k:=decode(secret_hex||repeat('00',32),'hex');a:=k;b:=k;
 FOR i IN 0..63 LOOP a:=set_byte(a,i,get_byte(k,i)#54);b:=set_byte(b,i,get_byte(k,i)#92);END LOOP;
 RETURN encode(sha256(b||sha256(a||convert_to(message,'UTF8'))),'hex');END $f$;

CREATE FUNCTION app_private.signing_allowed(aid uuid) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE actor uuid;BEGIN
 actor:=app_private.rental_member(aid);
 IF NOT EXISTS(SELECT 1 FROM tenancy.membership_roles mr JOIN tenancy.role_permissions rp ON rp.agency_id=mr.agency_id AND rp.role_id=mr.role_id
  WHERE mr.agency_id=aid AND mr.membership_id=actor AND rp.permission_key='contracts.sign') THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
 RETURN actor;END $f$;

CREATE FUNCTION app_private.signing_view(s app_private.signing_sessions) RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $f$
 SELECT jsonb_build_object('id',s.id,'agencyId',s.agency_id,'rentalId',s.rental_id,'artifactId',s.artifact_id,'version',s.version,'state',s.state,'locale',s.locale,'assurance',s.assurance,
 'providerId',s.provider_id,'original',s.original,'clientId',s.client_id,'clientName',s.client_name,'expiresAt',s.expires_at,'agencySignature',s.agency_signature,'clientSignature',s.client_signature,'intermediate',s.intermediate,'final',s.final)
$f$;

CREATE FUNCTION app_private.signing_event(aid uuid,sid uuid,kind text,data jsonb) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE n integer;prev text;body text;BEGIN
 SELECT sequence+1,hash INTO n,prev FROM app_private.signing_events WHERE agency_id=aid AND session_id=sid ORDER BY sequence DESC LIMIT 1;
 n:=COALESCE(n,1);prev:=COALESCE(prev,repeat('0',64));
 body:=jsonb_build_object('kind',kind,'at',clock_timestamp(),'data',data)::text;
 INSERT INTO app_private.signing_events VALUES(aid,sid,n,prev,encode(sha256(convert_to(prev||'|'||n::text||'|'||body,'UTF8')),'hex'),body);
END $f$;

CREATE FUNCTION app_private.signing_transition(aid uuid,sid uuid,target text,data jsonb) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
BEGIN
 UPDATE app_private.signing_sessions SET state=target,version=version+1 WHERE agency_id=aid AND id=sid;
 PERFORM app_private.signing_event(aid,sid,target,data);
 IF target IN('completed','expired','declined','cancelled','failed') THEN UPDATE app_private.signing_invitations SET revoked=(target<>'completed'),verified_until=NULL WHERE agency_id=aid AND session_id=sid;END IF;
END $f$;

CREATE FUNCTION app_private.signing_command(aid uuid,actor uuid,token text,action text,p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE s app_private.signing_sessions; inv app_private.signing_invitations; receipt app_private.signing_receipts; obj app_private.signing_objects;
 sid uuid;req uuid;art jsonb;parties jsonb;result jsonb;who text;cap jsonb;sig jsonb;selected_kind text;requested_action text:=action;checked text;counted integer;bucket text;op app_private.signing_provider_operations;x record;
BEGIN
 IF jsonb_typeof(p)<>'object' OR pg_column_size(p)>100000 THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
 IF token IS NOT NULL THEN
  -- Lookup is performed by the gateway under a narrow temporary lookup policy.
  SELECT * INTO inv FROM app_private.signing_invitations WHERE token_hash=token;
  IF inv.token_hash IS NULL OR inv.revoked OR inv.expires_at<=clock_timestamp() OR inv.failures>=5 THEN RETURN jsonb_build_object('ok',false,'code','expired');END IF;
  aid:=inv.agency_id;sid:=inv.session_id;
 ELSE sid:=(p->>'sessionId')::uuid;END IF;
 PERFORM set_config('contratpro.signing_agency',aid::text,true);
 PERFORM pg_advisory_xact_lock(hashtextextended('documents:'||aid::text,0));
 IF action='list' AND actor IS NOT NULL THEN
  FOR x IN SELECT id FROM app_private.signing_sessions WHERE agency_id=aid AND rental_id=(p->>'rentalId')::uuid AND expires_at<=clock_timestamp() AND state NOT IN('completed','expired','declined','cancelled','failed') FOR UPDATE LOOP
   PERFORM app_private.signing_transition(aid,x.id,'expired','{}');END LOOP;
  SELECT COALESCE(jsonb_agg(app_private.signing_view(x) ORDER BY x.id),'[]'::jsonb) INTO result FROM app_private.signing_sessions x WHERE agency_id=aid AND rental_id=(p->>'rentalId')::uuid;
  RETURN jsonb_build_object('ok',true,'value',result);
 END IF;
 IF action='create' AND actor IS NOT NULL THEN
  req:=(p->>'requestId')::uuid;sid:=req;
  SELECT * INTO s FROM app_private.signing_sessions WHERE agency_id=aid AND id=sid;
  IF s.id IS NULL THEN
   SELECT payload INTO art FROM app_private.contract_artifacts WHERE agency_id=aid AND id=(p->>'artifactId')::uuid AND payload->>'status'='issued';
   IF art IS NULL THEN RAISE EXCEPTION 'Missing' USING ERRCODE='P0002';END IF;
   PERFORM 1 FROM tenancy.rental_contracts WHERE agency_id=aid AND id=(art->>'rentalId')::uuid AND version=(art->>'rentalVersion')::integer AND state IN('confirme','en_cours','termine') FOR UPDATE;
   IF NOT FOUND OR EXISTS(SELECT 1 FROM app_private.contract_artifacts WHERE agency_id=aid AND rental_id=(art->>'rentalId')::uuid AND payload->>'status'='issued' AND (payload->>'createdAt')::timestamptz>(art->>'createdAt')::timestamptz) THEN RAISE EXCEPTION 'Superseded' USING ERRCODE='40001';END IF;
   IF p->>'assurance' NOT IN('simple','external-advanced','external-qualified-requested') OR p->>'locale' NOT IN('fr','ar') OR jsonb_array_length(art->'signing'->'zones')<2 THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
   IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(art->'signing'->'zones') z WHERE z->>'party'='agency') OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(art->'signing'->'zones') z WHERE z->>'party'='client') THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
   FOR x IN SELECT id FROM app_private.signing_sessions WHERE agency_id=aid AND rental_id=(art->>'rentalId')::uuid AND expires_at<=clock_timestamp() AND state NOT IN('completed','expired','declined','cancelled','failed') FOR UPDATE LOOP
    PERFORM app_private.signing_transition(aid,x.id,'expired','{}');END LOOP;
   SELECT payload->'parties' INTO parties FROM app_private.rental_document_versions WHERE agency_id=aid AND contract_id=(art->>'rentalId')::uuid AND version=(art->>'rentalVersion')::integer;
   INSERT INTO app_private.signing_sessions(agency_id,id,rental_id,artifact_id,state,locale,assurance,provider_id,original,client_id,client_name,expires_at,agency_member_id)
    VALUES(aid,sid,(art->>'rentalId')::uuid,(art->>'id')::uuid,'awaiting_agency',p->>'locale',p->>'assurance',p->>'providerId',art,(parties->'primaryDriver'->>'clientId')::uuid,parties->'primaryDriver'->>'fullName',clock_timestamp()+interval '7 days',actor) RETURNING * INTO s;
   PERFORM app_private.signing_event(aid,sid,'created',jsonb_build_object('actor',actor,'assurance',s.assurance,'originalChecksum',art->>'checksum','artifactId',s.artifact_id,'rentalVersion',art->'rentalVersion','templateVersionId',art->'templateVersionId','evidencePolicy','local-simple-v1-no-ip-device'));
  END IF;
 ELSE
  SELECT * INTO s FROM app_private.signing_sessions WHERE agency_id=aid AND id=sid;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Missing' USING ERRCODE='P0002';END IF;
  IF actor IS NOT NULL THEN PERFORM 1 FROM tenancy.rental_contracts WHERE agency_id=aid AND id=s.rental_id FOR UPDATE;END IF;
  SELECT * INTO s FROM app_private.signing_sessions WHERE agency_id=aid AND id=sid FOR UPDATE;
 END IF;
 IF token IS NOT NULL THEN SELECT * INTO inv FROM app_private.signing_invitations WHERE token_hash=token FOR UPDATE;END IF;
 IF s.state NOT IN('completed','expired','declined','cancelled','failed') AND s.expires_at<=clock_timestamp() THEN
  PERFORM app_private.signing_transition(aid,sid,'expired','{}');SELECT * INTO s FROM app_private.signing_sessions WHERE agency_id=aid AND id=sid;
 END IF;
 IF action IN('get','document') THEN
  IF action='document' AND token IS NOT NULL AND NOT(inv.consumed OR COALESCE(inv.verified_until>clock_timestamp(),false)) THEN RETURN jsonb_build_object('ok',false,'code','verification-failed');END IF;
  RETURN jsonb_build_object('ok',true,'value',app_private.signing_view(s)||jsonb_build_object('clientVerified',token IS NOT NULL AND (inv.consumed OR COALESCE(inv.verified_until>clock_timestamp(),false))));END IF;
 IF action='provider-read' AND actor IS NOT NULL THEN
  SELECT * INTO op FROM app_private.signing_provider_operations WHERE agency_id=aid AND session_id=sid AND id=(p->>'operationId')::uuid;
  IF op.id IS NULL THEN RAISE EXCEPTION 'Missing' USING ERRCODE='P0002';END IF;
  RETURN jsonb_build_object('ok',true,'value',jsonb_build_object('id',op.id,'transactionId',op.transaction_id,'providerId',op.provider_id,'version',s.version));
 END IF;
 IF action='evidence' AND actor IS NOT NULL THEN
  SELECT COALESCE(jsonb_agg(jsonb_build_object('sequence',sequence,'previousHash',previous_hash,'hash',hash,'event',event) ORDER BY sequence),'[]'::jsonb) INTO result FROM app_private.signing_events WHERE agency_id=aid AND session_id=sid;
  RETURN jsonb_build_object('ok',true,'value',jsonb_build_object('session',app_private.signing_view(s),'events',result,
   'signatureArtifacts',jsonb_build_object('agency',CASE WHEN s.agency_signature IS NULL THEN NULL ELSE jsonb_build_object('text',(SELECT intent->>'captureText' FROM app_private.signing_objects WHERE agency_id=aid AND session_id=sid AND signing_objects.kind='agency'),'checksum',s.agency_signature->>'artifactChecksum') END,
    'client',CASE WHEN s.client_signature IS NULL THEN NULL ELSE jsonb_build_object('text',(SELECT input->>'captureText' FROM app_private.signing_receipts WHERE agency_id=aid AND session_id=sid AND signing_receipts.action='client-sign' LIMIT 1),'checksum',s.client_signature->>'artifactChecksum') END),
   'limitations','Technical evidence only; server time is not an independently certified timestamp.'));
 END IF;
 IF s.state='expired' THEN RETURN jsonb_build_object('ok',false,'code','expired');END IF;
 IF action='verify' AND token IS NOT NULL AND inv.consumed THEN RETURN jsonb_build_object('ok',false,'code','consumed');END IF;
 req:=(p->>'requestId')::uuid;who:=COALESCE(actor::text,token);
 IF req IS NULL THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
 SELECT * INTO receipt FROM app_private.signing_receipts WHERE agency_id=aid AND session_id=sid AND request_id=req AND signing_receipts.action=requested_action;
 IF receipt.request_id IS NOT NULL THEN
  IF receipt.input<>p OR receipt.actor<>who THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
  RETURN receipt.result;
 END IF;
 IF action<>'create' AND (p->>'version')::integer IS DISTINCT FROM s.version THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
 IF s.state IN('completed','declined','cancelled','failed') THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
 IF action='verify' AND token IS NOT NULL THEN
  IF s.state<>'awaiting_client' OR inv.consumed THEN RETURN jsonb_build_object('ok',false,'code','consumed');END IF;
  IF p->>'codeHash' IS DISTINCT FROM inv.code_hash THEN
   UPDATE app_private.signing_invitations SET failures=failures+1 WHERE token_hash=token;
   PERFORM app_private.signing_event(aid,sid,'verification-failed',jsonb_build_object('method','separate-code','outcome','rejected'));
   RETURN jsonb_build_object('ok',false,'code','verification-failed');
  END IF;
  UPDATE app_private.signing_invitations SET challenge_id=gen_random_uuid(),verified_until=LEAST(clock_timestamp()+interval '10 minutes',expires_at) WHERE token_hash=token RETURNING * INTO inv;
  PERFORM app_private.signing_event(aid,sid,'client-verification',jsonb_build_object('method','invitation-and-separate-code','identityAssurance','possession-not-legal-identity'));
  result:=jsonb_build_object('challengeId',inv.challenge_id,'session',app_private.signing_view(s)||'{"clientVerified":true}'::jsonb);
 ELSIF action IN('invite','renew') AND actor IS NOT NULL THEN
  IF s.state NOT IN('agency_signed','awaiting_client') OR s.assurance<>'simple' OR p->>'tokenHash' !~ '^[a-f0-9]{64}$' OR p->>'codeHash' !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
  IF EXISTS(SELECT 1 FROM app_private.signing_invitations WHERE agency_id=aid AND session_id=sid AND NOT revoked) THEN
   PERFORM app_private.signing_event(aid,sid,'invitation-revoked',jsonb_build_object('actor',actor,'reason','replacement-invitation'));END IF;
  UPDATE app_private.signing_invitations SET revoked=true,verified_until=NULL WHERE agency_id=aid AND session_id=sid;
  INSERT INTO app_private.signing_invitations(agency_id,session_id,token_hash,code_hash,expires_at) VALUES(aid,sid,p->>'tokenHash',p->>'codeHash',LEAST(clock_timestamp()+interval '24 hours',s.expires_at)) RETURNING * INTO inv;
  PERFORM app_private.signing_transition(aid,sid,'awaiting_client',jsonb_build_object('actor',actor,'invitationRef',req,'expiresAt',inv.expires_at,'delivery','prepared-not-sent','renewal',action='renew'));
 ELSIF action='stage-agency' AND actor IS NOT NULL THEN
  IF actor<>s.agency_member_id THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
  IF s.state<>'awaiting_agency' OR s.assurance<>'simple' THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
  selected_kind:='agency';
 ELSIF action='agency-sign' AND actor IS NOT NULL THEN
  IF actor<>s.agency_member_id THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
  IF s.state<>'awaiting_agency' OR s.assurance<>'simple' THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
  SELECT * INTO obj FROM app_private.signing_objects WHERE agency_id=aid AND session_id=sid AND signing_objects.kind='agency';
  IF obj.key IS NULL OR obj.intent<>p->'intent' THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
  cap:=(p->'intent'->>'captureText')::jsonb;checked:=s.original->>'checksum';
  IF cap->>'reviewedChecksum' IS DISTINCT FROM checked OR cap->'consent' IS DISTINCT FROM 'true'::jsonb OR cap->'reviewed' IS DISTINCT FROM 'true'::jsonb OR cap->'identityConfirmed' IS DISTINCT FROM 'true'::jsonb OR cap->>'consentVersion' IS DISTINCT FROM 'simple-'||s.locale||'-v1' THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
  sig:=cap||jsonb_build_object('method','typed','assurance','simple','artifactChecksum',encode(sha256(convert_to(p->'intent'->>'captureText','UTF8')),'hex'),'fontHash',p->'intent'->>'fontHash','at',clock_timestamp(),'actor',app_private.canonical_auth_user(),'authority',actor,'verification','authenticated-account-and-contracts.sign');
  UPDATE app_private.signing_sessions SET agency_signature=sig,intermediate=jsonb_build_object('key',obj.key,'checksum',obj.checksum) WHERE agency_id=aid AND id=sid;
  UPDATE app_private.signing_objects SET retained=true WHERE agency_id=aid AND session_id=sid AND signing_objects.kind='agency';
  PERFORM app_private.signing_transition(aid,sid,'agency_signed',sig||jsonb_build_object('consentText',CASE s.locale WHEN 'fr' THEN 'Je confirme mon identité déclarée, avoir examiné ce document et vouloir le signer par une signature électronique simple sous forme de mon nom saisi. Cette méthode ne constitue pas une signature électronique qualifiée.' ELSE 'أؤكد هويتي المصرح بها وأنني راجعت هذا المستند وأوافق على توقيعه بتوقيع إلكتروني بسيط عبر كتابة اسمي. هذه الطريقة ليست توقيعاً إلكترونياً مؤهلاً.' END,'documentChecksum',obj.checksum));
 ELSIF action='client-sign' AND token IS NOT NULL THEN
  IF s.state<>'awaiting_client' OR inv.consumed THEN RETURN jsonb_build_object('ok',false,'code','consumed');END IF;
  IF inv.verified_until IS NULL OR inv.verified_until<=clock_timestamp() OR (p->>'challengeId')::uuid IS DISTINCT FROM inv.challenge_id THEN RETURN jsonb_build_object('ok',false,'code','verification-failed');END IF;
  cap:=(p->>'captureText')::jsonb;
  IF cap->>'reviewedChecksum' IS DISTINCT FROM s.intermediate->>'checksum' OR cap->'consent' IS DISTINCT FROM 'true'::jsonb OR cap->'reviewed' IS DISTINCT FROM 'true'::jsonb OR cap->'identityConfirmed' IS DISTINCT FROM 'true'::jsonb OR cap->>'consentVersion' IS DISTINCT FROM 'simple-'||s.locale||'-v1' OR lower(btrim(cap->>'typedName'))<>lower(btrim(s.client_name)) THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
  sig:=cap||jsonb_build_object('method','typed','assurance','simple','artifactChecksum',encode(sha256(convert_to(p->>'captureText','UTF8')),'hex'),'fontHash',p->>'fontHash','at',clock_timestamp(),'actor',s.client_id,'authority','self-declared-client','verification','invitation-separate-code-self-asserted-name');
  UPDATE app_private.signing_sessions SET client_signature=sig WHERE agency_id=aid AND id=sid;
  UPDATE app_private.signing_invitations SET consumed=true,verified_until=NULL WHERE token_hash=token;
  PERFORM app_private.signing_transition(aid,sid,'client_signed',sig||jsonb_build_object('originalChecksum',s.original->>'checksum','consentText',CASE s.locale WHEN 'fr' THEN 'Je confirme mon identité déclarée, avoir examiné ce document et vouloir le signer par une signature électronique simple sous forme de mon nom saisi. Cette méthode ne constitue pas une signature électronique qualifiée.' ELSE 'أؤكد هويتي المصرح بها وأنني راجعت هذا المستند وأوافق على توقيعه بتوقيع إلكتروني بسيط عبر كتابة اسمي. هذه الطريقة ليست توقيعاً إلكترونياً مؤهلاً.' END));
 ELSIF action='decline' AND token IS NOT NULL THEN
  IF s.state<>'awaiting_client' OR inv.consumed THEN RETURN jsonb_build_object('ok',false,'code','consumed');END IF;
  PERFORM app_private.signing_transition(aid,sid,'declined',jsonb_build_object('actor','invitation-holder','identityVerified',false));
 ELSIF action='cancel' AND actor IS NOT NULL THEN PERFORM app_private.signing_transition(aid,sid,'cancelled',jsonb_build_object('actor',actor));
 ELSIF action='finalize-prepare' THEN
  IF s.assurance<>'simple' OR s.agency_signature IS NULL OR s.client_signature IS NULL OR s.state NOT IN('client_signed','finalization_pending','reconciliation_required') THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
  IF s.state<>'finalization_pending' THEN PERFORM app_private.signing_transition(aid,sid,'finalization_pending','{}');END IF;
 ELSIF action='stage-final' THEN
  IF s.state<>'finalization_pending' OR s.assurance<>'simple' THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;selected_kind:='final';
 ELSIF action='complete' THEN
  IF s.state<>'finalization_pending' OR s.assurance<>'simple' THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
  SELECT * INTO obj FROM app_private.signing_objects WHERE agency_id=aid AND session_id=sid AND signing_objects.kind='final';
  IF obj.key IS NULL OR obj.checksum IS DISTINCT FROM p->>'checksum' THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
  UPDATE app_private.signing_sessions SET final=jsonb_build_object('key',obj.key,'checksum',obj.checksum) WHERE agency_id=aid AND id=sid;
  UPDATE app_private.signing_objects SET retained=true WHERE agency_id=aid AND session_id=sid AND signing_objects.kind='final';
  PERFORM app_private.signing_transition(aid,sid,'completed',jsonb_build_object('originalChecksum',s.original->>'checksum','finalChecksum',obj.checksum,'assurance','simple','cryptographicPdfSignature',false));
 ELSIF action='finalize-failed' THEN
  IF s.state<>'finalization_pending' THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
  PERFORM app_private.signing_transition(aid,sid,'reconciliation_required',jsonb_build_object('reason','finalization-or-storage-failure'));
 ELSIF action='provider-claim' AND actor IS NOT NULL THEN
  IF s.assurance='simple' OR p->>'providerId' IS DISTINCT FROM s.provider_id THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
  IF p->'operation'->>'checksum' IS DISTINCT FROM s.original->>'checksum' OR COALESCE(p->'operation'->>'party','') NOT IN('agency','client')
   OR (p->'operation'->>'party'='client' AND s.agency_signature IS NULL) OR (p->'operation'->>'party'='agency' AND s.agency_signature IS NOT NULL) THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
  INSERT INTO app_private.signing_provider_operations VALUES(aid,sid,(p->'operation'->>'id')::uuid,s.provider_id,p->'operation','claimed',NULL);
  PERFORM app_private.signing_transition(aid,sid,'reconciliation_required',jsonb_build_object('reason','provider-dispatch-claimed','operation',p->'operation'));
 ELSIF action='provider-result' AND actor IS NOT NULL THEN
  SELECT * INTO op FROM app_private.signing_provider_operations WHERE id=(p->>'operationId')::uuid AND agency_id=aid AND session_id=sid FOR UPDATE;
  IF op.id IS NULL OR op.state<>'claimed' OR p->>'outcome' NOT IN('accepted','rejected','unknown') THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
  UPDATE app_private.signing_provider_operations SET state=p->>'outcome',transaction_id=p->>'transactionId' WHERE id=op.id;
  PERFORM app_private.signing_transition(aid,sid,CASE WHEN p->>'outcome'='rejected' THEN 'failed' ELSE 'reconciliation_required' END,jsonb_build_object('providerOutcome',p->>'outcome','operationId',op.id));
 ELSIF action='provider-reconciled' AND actor IS NOT NULL THEN
  SELECT * INTO op FROM app_private.signing_provider_operations WHERE agency_id=aid AND session_id=sid AND id=(p->>'operationId')::uuid;
  IF op.id IS NULL OR s.assurance='simple' OR p->>'outcome' NOT IN('pending','rejected','unknown') THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
  IF p->>'outcome'='rejected' THEN UPDATE app_private.signing_provider_operations SET state='rejected' WHERE id=op.id;
   PERFORM app_private.signing_transition(aid,sid,'failed',jsonb_build_object('providerOutcome','confirmed-rejected','operationId',op.id));
  ELSE PERFORM app_private.signing_event(aid,sid,'provider-reconciliation',jsonb_build_object('providerOutcome',p->>'outcome','operationId',op.id));END IF;
 ELSIF action<>'create' THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
 IF selected_kind IS NOT NULL THEN
  IF p->>'checksum' !~ '^[a-f0-9]{64}$' OR p->>'key' IS DISTINCT FROM aid::text||'/issued/'||sid::text||'/'||(p->>'checksum')||'.pdf' THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
  INSERT INTO app_private.signing_objects VALUES(aid,sid,selected_kind,p->>'key',p->>'checksum',p->'intent',false) ON CONFLICT DO NOTHING;
  SELECT * INTO obj FROM app_private.signing_objects WHERE agency_id=aid AND session_id=sid AND signing_objects.kind=selected_kind;
  IF obj.key IS DISTINCT FROM p->>'key' OR obj.intent IS DISTINCT FROM p->'intent' THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
 END IF;
 SELECT * INTO s FROM app_private.signing_sessions WHERE agency_id=aid AND id=sid;
 result:=jsonb_build_object('ok',true,'value',COALESCE(result,app_private.signing_view(s)));
 INSERT INTO app_private.signing_receipts VALUES(aid,sid,req,action,who,p,result);RETURN result;
END $f$;

CREATE FUNCTION public.contratpro_signing_agency(p_payload text,p_mac text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE p jsonb;aid uuid;actor uuid;BEGIN
 IF octet_length(p_payload)>131072 OR p_mac IS DISTINCT FROM app_private.signing_mac(p_payload) THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
 p:=p_payload::jsonb;aid:=(p->>'agencyId')::uuid;actor:=app_private.signing_allowed(aid);
 RETURN app_private.signing_command(aid,actor,NULL,p->>'action',p->'input');END $f$;

CREATE POLICY signing_invite_lookup ON app_private.signing_invitations FOR SELECT TO contratpro_rental_writer USING(token_hash=current_setting('contratpro.signing_token',true));

CREATE FUNCTION public.contratpro_signing_public(p_payload text,p_mac text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE p jsonb;token text;n integer;b text;BEGIN
 IF octet_length(p_payload)>131072 OR p_mac IS DISTINCT FROM app_private.signing_mac(p_payload) THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
 p:=p_payload::jsonb;token:=p->'input'->>'tokenHash';
 IF p->>'action'='provider-webhook' THEN
  PERFORM set_config('contratpro.signing_operation',p->'input'->>'operationId',true);
  DECLARE o app_private.signing_provider_operations;old_hash text;BEGIN
   SELECT * INTO o FROM app_private.signing_provider_operations WHERE id=(p->'input'->>'operationId')::uuid;
   IF o.id IS NULL OR o.provider_id IS DISTINCT FROM p->'input'->>'providerId' OR o.transaction_id IS DISTINCT FROM p->'input'->>'transactionId' THEN RAISE EXCEPTION 'Unbound observation' USING ERRCODE='42501';END IF;
   PERFORM set_config('contratpro.signing_agency',o.agency_id::text,true);
   PERFORM 1 FROM app_private.signing_sessions WHERE agency_id=o.agency_id AND id=o.session_id FOR UPDATE;
   SELECT hash INTO old_hash FROM app_private.signing_provider_inbox WHERE provider_id=o.provider_id AND event_id=p->'input'->>'eventId';
   IF old_hash IS NOT NULL THEN IF old_hash<>p->'input'->>'hash' THEN RAISE EXCEPTION 'Conflicting observation' USING ERRCODE='40001';END IF;RETURN '{"ok":true,"value":{"duplicate":true}}'::jsonb;END IF;
   INSERT INTO app_private.signing_provider_inbox VALUES(o.provider_id,p->'input'->>'eventId',p->'input'->>'hash',p->'input');
   PERFORM app_private.signing_event(o.agency_id,o.session_id,'authenticated-provider-observation',p->'input');
   RETURN '{"ok":true,"value":{"admitted":true,"signatureVerified":false}}'::jsonb;
  END;
 END IF;
 IF token !~ '^[a-f0-9]{64}$' OR p->>'action' NOT IN('get','document','verify','client-sign','decline','finalize-prepare','stage-final','complete','finalize-failed') THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
 FOREACH b IN ARRAY ARRAY['global',token] LOOP
  INSERT INTO app_private.signing_rate VALUES(b,date_trunc('minute',clock_timestamp()),1) ON CONFLICT(bucket,window_start) DO UPDATE SET count=signing_rate.count+1 RETURNING count INTO n;
  IF n>(CASE WHEN b='global' THEN 300 ELSE 30 END) THEN RETURN jsonb_build_object('ok',false,'code','rate-limited');END IF;
 END LOOP;
 DELETE FROM app_private.signing_rate WHERE window_start<clock_timestamp()-interval '7 days';
 PERFORM set_config('contratpro.signing_token',token,true);
 RETURN app_private.signing_command(NULL,NULL,token,p->>'action',p->'input');END $f$;

CREATE FUNCTION public.contratpro_signing_object_access(p_key text,p_write boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE aid uuid;BEGIN
 IF p_key !~ '^[a-f0-9-]{36}/issued/[a-f0-9-]{36}/[a-f0-9]{64}\.pdf$' THEN RETURN false;END IF;
 aid:=split_part(p_key,'/',1)::uuid;PERFORM app_private.signing_allowed(aid);PERFORM set_config('contratpro.signing_agency',aid::text,true);
 RETURN EXISTS(SELECT 1 FROM app_private.signing_objects WHERE agency_id=aid AND key=p_key AND (NOT p_write OR NOT retained));
EXCEPTION WHEN invalid_text_representation OR insufficient_privilege THEN RETURN false;END $f$;

CREATE POLICY signing_object_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='contract-documents' AND public.contratpro_signing_object_access(name,false));

CREATE POLICY signing_object_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='contract-documents' AND public.contratpro_signing_object_access(name,true));

CREATE POLICY signing_operation_lookup ON app_private.signing_provider_operations FOR SELECT TO contratpro_rental_writer
 USING(id=nullif(current_setting('contratpro.signing_operation',true),'')::uuid);

CREATE FUNCTION app_private.signing_supersede() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE aid uuid;rid uuid;x record;BEGIN
 aid:=NEW.agency_id;
 IF TG_TABLE_NAME='rental_contracts' THEN rid:=NEW.id;
 ELSE rid:=NEW.rental_id;IF NEW.payload->>'status'<>'issued' THEN RETURN NEW;END IF;END IF;
 PERFORM set_config('contratpro.signing_agency',aid::text,true);
 FOR x IN SELECT id FROM app_private.signing_sessions WHERE agency_id=aid AND rental_id=rid AND state NOT IN('completed','expired','declined','cancelled','failed') FOR UPDATE LOOP
  PERFORM app_private.signing_transition(aid,x.id,'cancelled',jsonb_build_object('reason','superseded-document-or-rental'));
 END LOOP;RETURN NEW;END $f$;

CREATE TRIGGER signing_artifact_fence AFTER INSERT ON app_private.contract_artifacts FOR EACH ROW EXECUTE FUNCTION app_private.signing_supersede();

CREATE TRIGGER signing_rental_fence AFTER UPDATE ON tenancy.rental_contracts FOR EACH ROW WHEN(OLD.version IS DISTINCT FROM NEW.version) EXECUTE FUNCTION app_private.signing_supersede();

DO $acl$ DECLARE f regprocedure;BEGIN
 FOR f IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE (n.nspname='app_private' AND p.proname IN('signing_mac','signing_allowed','signing_view','signing_event','signing_transition','signing_command','signing_supersede','signing_binding_immutable')) OR (n.nspname='public' AND p.proname IN('contratpro_signing_agency','contratpro_signing_public','contratpro_signing_object_access')) LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO contratpro_rental_writer',f);
 END LOOP;END $acl$;

ALTER FUNCTION public.contratpro_signing_agency(text,text) OWNER TO contratpro_rental_writer;

ALTER FUNCTION public.contratpro_signing_public(text,text) OWNER TO contratpro_rental_writer;

ALTER FUNCTION public.contratpro_signing_object_access(text,boolean) OWNER TO contratpro_rental_writer;

GRANT EXECUTE ON FUNCTION public.contratpro_signing_agency(text,text),public.contratpro_signing_object_access(text,boolean) TO authenticated;

GRANT EXECUTE ON FUNCTION public.contratpro_signing_public(text,text) TO anon,authenticated;
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
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.signing_gateway_key'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.signing_sessions'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.signing_invitations'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.signing_events'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.signing_receipts'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.signing_objects'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.signing_rate'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.signing_provider_operations'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.signing_provider_inbox'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;

 IF EXISTS(SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace,
 LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
 WHERE (n.nspname||'.'||p.proname)=ANY(ARRAY['app_private.signing_binding_immutable','app_private.signing_mac','app_private.signing_allowed','app_private.signing_view','app_private.signing_event','app_private.signing_transition','app_private.signing_command','public.contratpro_signing_agency','public.contratpro_signing_public','public.contratpro_signing_object_access','app_private.signing_supersede']::text[]) AND p.prosecdef AND a.grantee=0 AND a.privilege_type='EXECUTE') THEN RAISE EXCEPTION 'D2 definer PUBLIC execute leak';END IF;
END $d2_objects_post$;

DO $d2_security_post$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=ANY(ARRAY['contratpro_rental_writer']::text[])
 AND (rolcanlogin OR rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication OR rolinherit)) THEN RAISE EXCEPTION 'D2 writer role widened';END IF;
END $d2_security_post$;
INSERT INTO supabase_migrations.schema_migrations(version) VALUES('20261124001700');
DO $d2_post$ BEGIN
 IF ARRAY(SELECT version FROM supabase_migrations.schema_migrations ORDER BY version) IS DISTINCT FROM ARRAY['20261115000000','20261115000100','20261115000200','20261115000300','20261115000400','20261115000500','20261115000600','20261116000700','20261118000800','20261118000900','20261118001000','20261119001100','20261119001200','20261120001300','20261122001400','20261122001500','20261124001600','20261124001700']::text[]
 THEN RAISE EXCEPTION 'D2 final history mismatch';END IF;
END $d2_post$;
COMMIT;
