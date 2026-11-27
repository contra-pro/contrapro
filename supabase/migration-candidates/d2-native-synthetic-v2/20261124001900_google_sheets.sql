-- D2 NATIVE SYNTHETIC TEST CANDIDATE ONLY. NOT A MANAGED DEPLOYMENT ARTIFACT.
-- Source: supabase/migration-drafts/20261124001900_google_sheets.sql; raw SHA256 368799027b058224d2ff40a12bc10a41cd094544956b41bf2ae41f874c5f9465
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
 IF ARRAY(SELECT version FROM supabase_migrations.schema_migrations ORDER BY version) IS DISTINCT FROM ARRAY['20261115000000','20261115000100','20261115000200','20261115000300','20261115000400','20261115000500','20261115000600','20261116000700','20261118000800','20261118000900','20261118001000','20261119001100','20261119001200','20261120001300','20261122001400','20261122001500','20261124001600','20261124001700','20261124001800']::text[]
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
 IF wanted::text<>ALL(ARRAY['contratpro_rental_writer','contratpro_sheets_worker']::text[]) THEN RAISE EXCEPTION 'D2 role outside manifest';END IF;
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

CREATE ROLE contratpro_sheets_worker NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT NOCREATEROLE NOCREATEDB NOREPLICATION;

SELECT pg_temp.d2_authorize('contratpro_sheets_worker'::name);

GRANT USAGE ON SCHEMA public,app_private,tenancy TO contratpro_sheets_worker;

INSERT INTO tenancy.permissions(key,description) VALUES('sheets.view','View agency export health'),('sheets.manage','Manage agency Google Sheets export');

CREATE TABLE app_private.sheets_gateway_key(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),secret text NOT NULL CHECK(secret~'^[a-f0-9]{64}$'));

CREATE TABLE app_private.sheets_connections(agency_id uuid PRIMARY KEY REFERENCES tenancy.agencies(id),revision integer NOT NULL DEFAULT 0,credential_revision integer NOT NULL DEFAULT 0,
 envelope jsonb,health text NOT NULL DEFAULT 'disconnected' CHECK(health IN('connected','disconnected','reconnect-required')),enabled boolean NOT NULL DEFAULT false,
 destination jsonb,refresh_lease uuid,refresh_until timestamptz,refresh_armed boolean NOT NULL DEFAULT false,CHECK(envelope IS NULL OR pg_column_size(envelope)<32768));

CREATE TABLE app_private.sheets_oauth(agency_id uuid NOT NULL,state_hash text PRIMARY KEY CHECK(state_hash~'^[a-f0-9]{64}$'),actor uuid NOT NULL,envelope jsonb NOT NULL,expires_at timestamptz NOT NULL,used boolean NOT NULL DEFAULT false,connection_revision integer NOT NULL);

CREATE TABLE app_private.sheets_heads(agency_id uuid NOT NULL,contract_id uuid NOT NULL,sequence bigint NOT NULL CHECK(sequence>0),session_id uuid,rental_version integer NOT NULL,signature_version integer NOT NULL DEFAULT 0,
 PRIMARY KEY(agency_id,contract_id),FOREIGN KEY(agency_id,contract_id) REFERENCES tenancy.rental_contracts(agency_id,id));

CREATE TABLE app_private.sheets_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),agency_id uuid NOT NULL,contract_id uuid NOT NULL,sequence bigint NOT NULL,kind text NOT NULL,at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(agency_id,contract_id,sequence));

CREATE TABLE app_private.sheets_jobs(agency_id uuid NOT NULL,contract_id uuid NOT NULL,state text NOT NULL DEFAULT 'pending' CHECK(state IN('pending','processing','synchronized','failed','paused','reconciliation-required')),
 desired bigint NOT NULL,last_sequence bigint NOT NULL DEFAULT 0,destination_revision integer NOT NULL DEFAULT 0,claimed_destination jsonb,claimed_sequence bigint,lease uuid,lease_until timestamptz,armed boolean NOT NULL DEFAULT false,
 attempts integer NOT NULL DEFAULT 0,not_before timestamptz NOT NULL DEFAULT clock_timestamp(),sync_at timestamptz,fingerprint text,metadata_id integer,error_code text,retryable boolean NOT NULL DEFAULT false,
 PRIMARY KEY(agency_id,contract_id),FOREIGN KEY(agency_id,contract_id) REFERENCES app_private.sheets_heads(agency_id,contract_id));

CREATE TABLE app_private.sheets_rows(agency_id uuid NOT NULL,contract_id uuid NOT NULL,destination_revision integer NOT NULL,destination jsonb NOT NULL,metadata_id integer NOT NULL,last_sequence bigint NOT NULL,fingerprint text NOT NULL,at timestamptz NOT NULL,
 PRIMARY KEY(agency_id,contract_id,destination_revision));

CREATE TABLE app_private.sheets_audit(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),agency_id uuid NOT NULL,actor uuid,action text NOT NULL,contract_id uuid,sequence bigint,at timestamptz NOT NULL DEFAULT clock_timestamp(),detail jsonb NOT NULL DEFAULT '{}');

CREATE INDEX sheets_due ON app_private.sheets_jobs(not_before) WHERE state IN('pending','processing','failed');

DO $tables$ DECLARE t text;BEGIN
 FOREACH t IN ARRAY ARRAY['sheets_gateway_key','sheets_connections','sheets_oauth','sheets_heads','sheets_events','sheets_jobs','sheets_rows','sheets_audit'] LOOP
  EXECUTE format('ALTER TABLE app_private.%I ENABLE ROW LEVEL SECURITY',t);EXECUTE format('ALTER TABLE app_private.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON app_private.%I FROM PUBLIC,anon,authenticated,service_role',t);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE ON app_private.%I TO contratpro_sheets_worker',t);
  EXECUTE format('CREATE POLICY sheets_internal ON app_private.%I TO contratpro_sheets_worker USING(true) WITH CHECK(true)',t);
 END LOOP;END $tables$;

REVOKE INSERT,UPDATE ON app_private.sheets_gateway_key FROM contratpro_sheets_worker;

REVOKE UPDATE ON app_private.sheets_events,app_private.sheets_audit FROM contratpro_sheets_worker;

GRANT DELETE ON app_private.sheets_oauth TO contratpro_sheets_worker;

CREATE TRIGGER sheets_event_immutable BEFORE UPDATE OR DELETE ON app_private.sheets_events FOR EACH ROW EXECUTE FUNCTION app_private.rental_receipt_immutable();

CREATE TRIGGER sheets_audit_immutable BEFORE UPDATE OR DELETE ON app_private.sheets_audit FOR EACH ROW EXECUTE FUNCTION app_private.rental_receipt_immutable();

CREATE FUNCTION app_private.sheets_source() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE cid uuid;seq bigint;rv integer;sv integer:=0;sid uuid;current_sid uuid;k text;BEGIN
 IF TG_TABLE_NAME='rental_contracts' THEN
  cid:=NEW.id;rv:=NEW.version;k:=CASE WHEN TG_OP='INSERT' THEN 'created' ELSE 'rental:'||NEW.state END;
  IF TG_OP='UPDATE' AND NEW.version=OLD.version THEN RETURN NEW;END IF;
 ELSE
  IF TG_OP='UPDATE' AND ROW(NEW.version,NEW.state,NEW.agency_signature,NEW.client_signature,NEW.final) IS NOT DISTINCT FROM ROW(OLD.version,OLD.state,OLD.agency_signature,OLD.client_signature,OLD.final) THEN RETURN NEW;END IF;
  cid:=NEW.rental_id;rv:=(NEW.original->>'rentalVersion')::integer;sv:=NEW.version;sid:=NEW.id;k:='signature:'||NEW.state;
  -- A late observation on an older session cannot replace the current session.
  IF TG_OP='UPDATE' THEN
   SELECT session_id INTO current_sid FROM app_private.sheets_heads WHERE agency_id=NEW.agency_id AND contract_id=cid FOR UPDATE;
   IF current_sid IS NOT NULL AND current_sid<>sid THEN RETURN NEW;END IF;
  END IF;
 END IF;
 INSERT INTO app_private.sheets_heads AS h(agency_id,contract_id,sequence,session_id,rental_version,signature_version) VALUES(NEW.agency_id,cid,1,sid,rv,sv)
 ON CONFLICT(agency_id,contract_id) DO UPDATE SET sequence=h.sequence+1,rental_version=greatest(h.rental_version,rv),session_id=COALESCE(sid,h.session_id),signature_version=CASE WHEN sid IS NULL THEN h.signature_version ELSE sv END RETURNING sequence INTO seq;
 INSERT INTO app_private.sheets_events(agency_id,contract_id,sequence,kind) VALUES(NEW.agency_id,cid,seq,k);
 INSERT INTO app_private.sheets_jobs AS j(agency_id,contract_id,desired) VALUES(NEW.agency_id,cid,seq)
 ON CONFLICT(agency_id,contract_id) DO UPDATE SET desired=seq,state=CASE WHEN j.state IN('processing','reconciliation-required') THEN j.state ELSE 'pending' END,
 attempts=CASE WHEN j.state IN('processing','reconciliation-required') THEN j.attempts ELSE 0 END,not_before=clock_timestamp();
 RETURN NEW;END $f$;

ALTER FUNCTION app_private.sheets_source() OWNER TO contratpro_sheets_worker;

CREATE TRIGGER zz_sheets_rental AFTER INSERT OR UPDATE ON tenancy.rental_contracts FOR EACH ROW EXECUTE FUNCTION app_private.sheets_source();

CREATE TRIGGER zz_sheets_signature AFTER INSERT OR UPDATE ON app_private.signing_sessions FOR EACH ROW EXECUTE FUNCTION app_private.sheets_source();

INSERT INTO app_private.sheets_heads(agency_id,contract_id,sequence,rental_version) SELECT agency_id,id,1,version FROM tenancy.rental_contracts;

UPDATE app_private.sheets_heads h SET session_id=x.id,signature_version=x.version FROM (
 SELECT DISTINCT ON(s.agency_id,s.rental_id) s.agency_id,s.rental_id,s.id,s.version FROM app_private.signing_sessions s
 JOIN app_private.signing_events e ON e.agency_id=s.agency_id AND e.session_id=s.id AND e.sequence=1 ORDER BY s.agency_id,s.rental_id,(e.event::jsonb->>'at')::timestamptz DESC,s.id DESC
) x WHERE h.agency_id=x.agency_id AND h.contract_id=x.rental_id;

INSERT INTO app_private.sheets_events(agency_id,contract_id,sequence,kind) SELECT agency_id,contract_id,1,'baseline' FROM app_private.sheets_heads;

INSERT INTO app_private.sheets_jobs(agency_id,contract_id,desired) SELECT agency_id,contract_id,sequence FROM app_private.sheets_heads;

GRANT SELECT ON tenancy.rental_contracts,app_private.rental_drivers,app_private.signing_sessions TO contratpro_sheets_worker;

GRANT SELECT(id,agency_id,first_name,last_name,phone,email) ON tenancy.clients TO contratpro_sheets_worker;

GRANT SELECT(id,agency_id,registration,make,model) ON tenancy.vehicles TO contratpro_sheets_worker;

DO $read$ DECLARE t text;BEGIN
 FOREACH t IN ARRAY ARRAY['tenancy.rental_contracts','tenancy.clients','tenancy.vehicles','app_private.rental_drivers','app_private.signing_sessions'] LOOP
  EXECUTE format('CREATE POLICY sheets_source_read ON %s FOR SELECT TO contratpro_sheets_worker USING(agency_id=nullif(current_setting(''contratpro.sheets_agency'',true),'''')::uuid)',t);
 END LOOP;END $read$;

CREATE FUNCTION app_private.sheets_snapshot(aid uuid,cid uuid) RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE r tenancy.rental_contracts;h app_private.sheets_heads;s app_private.signing_sessions;c record;v record;secondary_name text;BEGIN
 PERFORM set_config('contratpro.sheets_agency',aid::text,true);
 SELECT * INTO STRICT r FROM tenancy.rental_contracts WHERE agency_id=aid AND id=cid;
 SELECT * INTO STRICT h FROM app_private.sheets_heads WHERE agency_id=aid AND contract_id=cid;
 SELECT * INTO s FROM app_private.signing_sessions WHERE agency_id=aid AND id=h.session_id AND (original->>'rentalVersion')::integer=r.version;
 SELECT first_name||' '||last_name AS name,phone,email INTO c FROM tenancy.clients WHERE agency_id=aid AND id=r.client_id;
 SELECT registration,make,model INTO v FROM tenancy.vehicles WHERE agency_id=aid AND id=r.vehicle_id;
 SELECT c2.first_name||' '||c2.last_name INTO secondary_name FROM app_private.rental_drivers d JOIN tenancy.clients c2 ON c2.agency_id=d.agency_id AND c2.id=d.secondary_client_id WHERE d.agency_id=aid AND d.contract_id=cid;
 RETURN jsonb_build_object('agencyId',aid,'contractId',cid,'sequence',h.sequence,'rentalVersion',r.version,'signatureVersion',CASE WHEN s.id IS NULL THEN 0 ELSE h.signature_version END,'values',jsonb_build_object(
 'reference',COALESCE(r.contract_number,''),'createdAt',to_char(r.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'clientName',c.name,'primaryDriver',c.name,'clientPhone',c.phone,'clientEmail',c.email,'secondaryDriver',COALESCE(secondary_name,''),
 'registration',v.registration,'make',v.make,'model',v.model,'start',to_char(r.starts_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'end',to_char(r.ends_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
 'days',r.billable_days::text,'rate',(r.daily_rate_minor/100)::text||'.'||lpad((r.daily_rate_minor%100)::text,2,'0'),'deposit',(r.deposit_minor/100)::text||'.'||lpad((r.deposit_minor%100)::text,2,'0'),'total',(r.total_minor/100)::text||'.'||lpad((r.total_minor%100)::text,2,'0'),'currency',r.currency,'state',r.state,
 'agencySignature',CASE WHEN s.agency_signature IS NOT NULL THEN 'signed' ELSE 'pending' END,'clientSignature',CASE WHEN s.client_signature IS NOT NULL THEN 'signed' ELSE 'pending' END,'completion',COALESCE(s.state,'not-started')));
END $f$;

CREATE FUNCTION app_private.sheets_mac(message text) RETURNS text LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE secret_hex text;k bytea;a bytea;b bytea;i integer;BEGIN
 SELECT secret INTO secret_hex FROM app_private.sheets_gateway_key WHERE singleton;IF secret_hex IS NULL THEN RAISE EXCEPTION 'Unavailable' USING ERRCODE='55000';END IF;
 k:=decode(secret_hex||repeat('00',32),'hex');a:=k;b:=k;FOR i IN 0..63 LOOP a:=set_byte(a,i,get_byte(k,i)#54);b:=set_byte(b,i,get_byte(k,i)#92);END LOOP;
 RETURN encode(sha256(b||sha256(a||convert_to(message,'UTF8'))),'hex');END $f$;

CREATE FUNCTION app_private.sheets_command(aid uuid,p_actor uuid,action text,p jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE c app_private.sheets_connections;j app_private.sheets_jobs;h app_private.sheets_heads;o app_private.sheets_oauth;cid uuid;target text;d jsonb;BEGIN
 IF action='purge' THEN DELETE FROM app_private.sheets_oauth WHERE expires_at<clock_timestamp();RETURN 'true';END IF;
 IF action='next' THEN SELECT q.agency_id INTO aid FROM app_private.sheets_jobs q JOIN app_private.sheets_connections x USING(agency_id) WHERE x.enabled AND x.health='connected' AND (q.state='pending' OR q.state='failed' AND q.retryable OR q.state='processing' AND q.lease_until<clock_timestamp()) AND q.not_before<=clock_timestamp() ORDER BY q.not_before LIMIT 1;RETURN jsonb_build_object('agencyId',aid);END IF;
 INSERT INTO app_private.sheets_connections(agency_id) VALUES(aid) ON CONFLICT DO NOTHING;
 SELECT * INTO STRICT c FROM app_private.sheets_connections WHERE agency_id=aid FOR UPDATE;
 IF action='authorize' THEN RETURN 'true';END IF;
 IF action='dashboard' THEN RETURN jsonb_build_object('connection',jsonb_build_object('revision',c.revision,'health',c.health,'enabled',c.enabled,'destination',c.destination),'jobs',COALESCE((SELECT jsonb_agg(jsonb_build_object('contractId',q.contract_id,'state',CASE WHEN NOT c.enabled AND q.state='pending' THEN 'paused' ELSE q.state END,'sequence',q.desired,'lastSequence',q.last_sequence,'attempts',q.attempts,'error',q.error_code,'retryable',q.retryable,'syncAt',q.sync_at)) FROM (SELECT * FROM app_private.sheets_jobs WHERE agency_id=aid AND (p->>'contractId' IS NULL OR contract_id=(p->>'contractId')::uuid) ORDER BY not_before DESC LIMIT 100) q),'[]'::jsonb),
 'history',COALESCE((SELECT jsonb_agg(jsonb_build_object('contractId',x.contract_id,'sequence',x.sequence,'at',x.at,'destinationRevision',x.detail->'destinationRevision')) FROM (SELECT * FROM app_private.sheets_audit WHERE agency_id=aid AND detail->>'state'='synchronized' AND (p->>'contractId' IS NULL OR contract_id=(p->>'contractId')::uuid) ORDER BY at DESC LIMIT 100) x),'[]'::jsonb));END IF;
 IF action='oauth-start' THEN
  DELETE FROM app_private.sheets_oauth WHERE agency_id=aid AND (expires_at<clock_timestamp() OR used);
  IF (SELECT count(*) FROM app_private.sheets_oauth WHERE agency_id=aid)>10 THEN RAISE EXCEPTION 'Too many attempts' USING ERRCODE='22023';END IF;
  INSERT INTO app_private.sheets_oauth VALUES(aid,p->>'hash',p_actor,p->'envelope',clock_timestamp()+interval '10 minutes',false,c.revision);RETURN 'true';
 ELSIF action='oauth-consume' THEN
  SELECT * INTO o FROM app_private.sheets_oauth WHERE agency_id=aid AND state_hash=p->>'hash' AND actor=p_actor AND NOT used AND expires_at>clock_timestamp() FOR UPDATE;
  IF o.state_hash IS NULL OR o.actor IS DISTINCT FROM p_actor OR o.connection_revision<>c.revision THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
  UPDATE app_private.sheets_oauth SET used=true WHERE state_hash=o.state_hash;RETURN jsonb_build_object('envelope',o.envelope,'revision',c.revision,'credentialRevision',c.credential_revision);
 ELSIF action='connect' THEN
  IF c.revision<>(p->>'revision')::integer OR c.refresh_lease IS NOT NULL THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
  UPDATE app_private.sheets_connections SET envelope=p->'envelope',credential_revision=credential_revision+1,revision=revision+1,health='connected',enabled=false WHERE agency_id=aid;
 ELSIF action='disconnect' THEN
  UPDATE app_private.sheets_connections SET envelope=NULL,health='disconnected',enabled=false,revision=revision+1,credential_revision=credential_revision+1,refresh_lease=NULL,refresh_until=NULL,refresh_armed=false WHERE agency_id=aid;
 ELSIF action='configure' THEN
  IF c.revision<>(p->>'revision')::integer THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
  d:=p->'destination';IF d IS NOT NULL AND d<>'null'::jsonb THEN
   IF c.health<>'connected' OR jsonb_typeof(d) IS DISTINCT FROM 'object' OR d->>'spreadsheetId' IS NULL OR d->>'sheetId' IS NULL OR d->>'revision' IS NULL OR d->>'spreadsheetId' !~ '^[A-Za-z0-9_-]{10,150}$' OR (d->>'sheetId')::integer<0 OR jsonb_typeof(d->'columns') IS DISTINCT FROM 'array' OR jsonb_array_length(d->'columns') NOT BETWEEN 1 AND 25 OR (d->>'revision')::integer<>c.revision+1 THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(d->'columns') x WHERE x NOT IN('reference','createdAt','clientName','clientPhone','clientEmail','primaryDriver','secondaryDriver','registration','make','model','start','end','pickup','returnLocation','days','rate','deposit','total','currency','payment','state','agencySignature','clientSignature','completion','lastSync') OR x IS NULL) OR (SELECT count(DISTINCT x) FROM jsonb_array_elements_text(d->'columns') x)<>jsonb_array_length(d->'columns') THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
  ELSE d:=c.destination;END IF;
  IF COALESCE((p->>'enabled')::boolean,false) AND (d IS NULL OR c.health<>'connected') THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
  UPDATE app_private.sheets_connections SET destination=d,enabled=(p->>'enabled')::boolean,revision=revision+1 WHERE agency_id=aid;
  UPDATE app_private.sheets_jobs SET state=CASE WHEN state IN('processing','reconciliation-required') THEN state ELSE 'pending' END,attempts=CASE WHEN state IN('processing','reconciliation-required') THEN attempts ELSE 0 END,not_before=clock_timestamp() WHERE agency_id=aid;
 ELSIF action='credentials' THEN RETURN jsonb_build_object('envelope',c.envelope,'revision',c.credential_revision,'health',c.health);
 ELSIF action='refresh-claim' THEN
  IF c.health<>'connected' OR c.credential_revision<>(p->>'revision')::integer THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
  IF c.refresh_lease IS NOT NULL THEN
   IF c.refresh_until>clock_timestamp() THEN RETURN 'null';END IF;
   IF c.refresh_armed THEN UPDATE app_private.sheets_connections SET health='reconnect-required',enabled=false WHERE agency_id=aid;RETURN 'null';END IF;
  END IF;
  UPDATE app_private.sheets_connections SET refresh_lease=gen_random_uuid(),refresh_until=clock_timestamp()+interval '1 minute',refresh_armed=true WHERE agency_id=aid RETURNING * INTO c;
  RETURN jsonb_build_object('lease',c.refresh_lease);
 ELSIF action IN('refresh-result','revoked') THEN
  IF c.credential_revision<>(p->>'revision')::integer OR (action='refresh-result' AND c.refresh_lease IS DISTINCT FROM (p->>'lease')::uuid) THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
  UPDATE app_private.sheets_connections SET envelope=CASE WHEN action='refresh-result' AND p->'envelope' IS NOT NULL THEN p->'envelope' ELSE envelope END,credential_revision=credential_revision+CASE WHEN action='refresh-result' AND p->'envelope' IS NOT NULL THEN 1 ELSE 0 END,
   health=CASE WHEN action='revoked' OR p->'envelope' IS NULL THEN 'reconnect-required' ELSE health END,enabled=CASE WHEN action='revoked' OR p->'envelope' IS NULL THEN false ELSE enabled END,refresh_lease=NULL,refresh_until=NULL,refresh_armed=false WHERE agency_id=aid;RETURN 'true';
 ELSIF action='claim' THEN
  IF NOT c.enabled OR c.health<>'connected' OR c.destination IS NULL THEN RETURN 'null';END IF;
  SELECT q.contract_id INTO cid FROM app_private.sheets_jobs q WHERE q.agency_id=aid AND (q.state='pending' OR q.state='failed' AND q.retryable OR q.state='processing' AND q.lease_until<clock_timestamp()) AND q.not_before<=clock_timestamp() ORDER BY q.not_before LIMIT 1;
  IF cid IS NULL THEN RETURN 'null';END IF;
  SELECT * INTO h FROM app_private.sheets_heads WHERE agency_id=aid AND contract_id=cid FOR UPDATE;
  SELECT * INTO j FROM app_private.sheets_jobs WHERE agency_id=aid AND contract_id=cid FOR UPDATE;
  IF j.state='processing' AND j.armed THEN UPDATE app_private.sheets_jobs SET state='reconciliation-required',error_code='uncertain' WHERE agency_id=aid AND contract_id=cid;RETURN 'null';END IF;
  IF j.attempts>=5 THEN UPDATE app_private.sheets_jobs SET state='failed',retryable=false,error_code='unavailable' WHERE agency_id=aid AND contract_id=cid;RETURN 'null';END IF;
  UPDATE app_private.sheets_jobs SET state='processing',lease=gen_random_uuid(),lease_until=clock_timestamp()+interval '2 minutes',armed=false,claimed_sequence=h.sequence,claimed_destination=c.destination,destination_revision=(c.destination->>'revision')::integer,attempts=attempts+1,sync_at=clock_timestamp(),retryable=false WHERE agency_id=aid AND contract_id=cid RETURNING * INTO j;
  RETURN jsonb_build_object('agencyId',aid,'contractId',cid,'lease',j.lease,'sequence',j.claimed_sequence,'destination',j.claimed_destination,'snapshot',app_private.sheets_snapshot(aid,cid),'known',EXISTS(SELECT 1 FROM app_private.sheets_rows WHERE agency_id=aid AND contract_id=cid AND destination->>'spreadsheetId'=j.claimed_destination->>'spreadsheetId' AND destination->>'sheetId'=j.claimed_destination->>'sheetId'),'reconcile',false,'syncAt',j.sync_at);
 ELSE
  cid:=(p->>'contractId')::uuid;
  SELECT * INTO h FROM app_private.sheets_heads WHERE agency_id=aid AND contract_id=cid FOR UPDATE;
  SELECT * INTO STRICT j FROM app_private.sheets_jobs WHERE agency_id=aid AND contract_id=cid FOR UPDATE;
  IF action='resolve-destination' THEN
   IF j.state<>'reconciliation-required' OR j.lease_until>clock_timestamp() OR p->>'acknowledge' IS DISTINCT FROM 'true' OR c.destination IS NULL OR
    (c.destination->>'spreadsheetId'=j.claimed_destination->>'spreadsheetId' AND c.destination->>'sheetId'=j.claimed_destination->>'sheetId') THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
   INSERT INTO app_private.sheets_audit(agency_id,actor,action,contract_id,sequence,detail) VALUES(aid,p_actor,'abandoned-unknown-destination',cid,j.claimed_sequence,jsonb_build_object('lease',j.lease,'destination',j.claimed_destination,'fingerprint',j.fingerprint,'outcome','unknown'));
   UPDATE app_private.sheets_jobs SET state='pending',armed=false,lease=NULL,attempts=0,not_before=clock_timestamp(),error_code=NULL WHERE agency_id=aid AND contract_id=cid;
  ELSIF action='retry' THEN
   IF j.state<>'failed' OR NOT j.retryable OR j.attempts>=5 THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
   UPDATE app_private.sheets_jobs SET state='pending' WHERE agency_id=aid AND contract_id=cid;
  ELSIF action='reconcile-context' THEN
   IF j.state<>'reconciliation-required' OR NOT j.armed THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
   RETURN jsonb_build_object('destination',j.claimed_destination,'sequence',j.claimed_sequence,'fingerprint',j.fingerprint,'lease',j.lease);
  ELSE
   IF j.lease IS DISTINCT FROM (p->>'lease')::uuid THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
   IF action='arm' THEN
    IF j.state<>'processing' OR j.armed OR j.lease_until<=clock_timestamp() OR NOT c.enabled OR c.destination IS DISTINCT FROM j.claimed_destination OR h.sequence<>j.claimed_sequence THEN
     IF NOT j.armed THEN UPDATE app_private.sheets_jobs SET state='pending',lease=NULL WHERE agency_id=aid AND contract_id=cid;END IF;RETURN 'false';END IF;
    IF p->>'fingerprint' !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
    UPDATE app_private.sheets_jobs SET armed=true,fingerprint=p->>'fingerprint' WHERE agency_id=aid AND contract_id=cid;RETURN 'true';
   ELSIF action IN('result','reconciled') THEN
    IF NOT j.armed OR j.state NOT IN('processing','reconciliation-required') THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
    target:=p->>'state';IF target NOT IN('synchronized','failed','reconciliation-required') OR action='reconciled' AND target<>'synchronized' THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
    IF target='synchronized' THEN
     INSERT INTO app_private.sheets_rows VALUES(aid,cid,j.destination_revision,j.claimed_destination,(p->>'metadataId')::integer,j.claimed_sequence,j.fingerprint,j.sync_at)
     ON CONFLICT(agency_id,contract_id,destination_revision) DO UPDATE SET metadata_id=EXCLUDED.metadata_id,last_sequence=EXCLUDED.last_sequence,fingerprint=EXCLUDED.fingerprint,at=EXCLUDED.at;
    END IF;
    UPDATE app_private.sheets_jobs SET state=CASE WHEN target='synchronized' AND (desired>j.claimed_sequence OR c.destination IS DISTINCT FROM j.claimed_destination) THEN 'pending' ELSE target END,
     last_sequence=CASE WHEN target='synchronized' THEN j.claimed_sequence ELSE last_sequence END,metadata_id=CASE WHEN target='synchronized' THEN (p->>'metadataId')::integer ELSE metadata_id END,
     armed=target='reconciliation-required',retryable=target='failed' AND p->>'code' IN('quota','unavailable') AND attempts<5,error_code=CASE WHEN p->>'code' IN('quota','unavailable','revoked','forbidden','conflict','uncertain','invalid') THEN p->>'code' ELSE NULL END,
     attempts=CASE WHEN target='synchronized' THEN 0 ELSE attempts END,not_before=clock_timestamp()+make_interval(secs=>least(3600,30*power(2,least(j.attempts,7)))::integer) WHERE agency_id=aid AND contract_id=cid;
   ELSE RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
  END IF;
 END IF;
 INSERT INTO app_private.sheets_audit(agency_id,actor,action,contract_id,sequence,detail) VALUES(aid,p_actor,action,cid,j.claimed_sequence,jsonb_build_object('state',CASE WHEN action IN('result','reconciled') THEN p->>'state' END,'destinationRevision',j.destination_revision));RETURN 'true';
END $f$;

CREATE FUNCTION public.contratpro_sheets_agency(p_payload text,p_mac text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE p jsonb;aid uuid;actor uuid;cap text;BEGIN
 IF octet_length(p_payload)>65536 OR p_mac IS DISTINCT FROM app_private.sheets_mac(p_payload) THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
 p:=p_payload::jsonb;aid:=(p->>'agencyId')::uuid;actor:=app_private.rental_member(aid);cap:=CASE WHEN p->>'action'='dashboard' THEN 'sheets.view' ELSE 'sheets.manage' END;
 IF NOT EXISTS(SELECT 1 FROM tenancy.membership_roles mr JOIN tenancy.role_permissions rp ON rp.agency_id=mr.agency_id AND mr.role_id=rp.role_id WHERE mr.agency_id=aid AND mr.membership_id=actor AND rp.permission_key IN(cap,'sheets.manage')) OR p->>'action' NOT IN('authorize','dashboard','oauth-start','oauth-consume','connect','disconnect','configure','retry','resolve-destination') THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
 RETURN app_private.sheets_command(aid,actor,p->>'action',p->'input');END $f$;

CREATE FUNCTION public.contratpro_sheets_worker(p_payload text,p_mac text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE p jsonb;BEGIN
 IF octet_length(p_payload)>65536 OR p_mac IS DISTINCT FROM app_private.sheets_mac(p_payload) THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
 p:=p_payload::jsonb;IF p->>'action' NOT IN('next','credentials','refresh-claim','refresh-result','revoked','claim','arm','result','reconcile-context','reconciled','purge') THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
 RETURN app_private.sheets_command((p->>'agencyId')::uuid,NULL,p->>'action',p->'input');END $f$;

DO $acl$ DECLARE f regprocedure;BEGIN
 FOR f IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='app_private' AND p.proname LIKE 'sheets_%' OR n.nspname='public' AND p.proname IN('contratpro_sheets_agency','contratpro_sheets_worker') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f);EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO contratpro_sheets_worker',f);
 END LOOP;END $acl$;

ALTER FUNCTION app_private.sheets_command(uuid,uuid,text,jsonb) SECURITY DEFINER;

ALTER FUNCTION app_private.sheets_command(uuid,uuid,text,jsonb) OWNER TO contratpro_sheets_worker;

ALTER FUNCTION public.contratpro_sheets_worker(text,text) OWNER TO contratpro_sheets_worker;

ALTER FUNCTION public.contratpro_sheets_agency(text,text) OWNER TO contratpro_rental_writer;

GRANT SELECT ON app_private.sheets_gateway_key TO contratpro_rental_writer;

CREATE POLICY sheets_mac_read ON app_private.sheets_gateway_key FOR SELECT TO contratpro_rental_writer USING(true);

GRANT EXECUTE ON FUNCTION app_private.sheets_mac(text),app_private.sheets_command(uuid,uuid,text,jsonb) TO contratpro_rental_writer;

GRANT EXECUTE ON FUNCTION public.contratpro_sheets_agency(text,text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.contratpro_sheets_worker(text,text) TO anon,authenticated;
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
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.sheets_gateway_key'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.sheets_connections'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.sheets_oauth'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.sheets_heads'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.sheets_events'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.sheets_jobs'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.sheets_rows'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='app_private.sheets_audit'::regclass AND relkind='r' AND relowner='postgres'::regrole) THEN RAISE EXCEPTION 'D2 expected relation/owner missing';END IF;

 IF EXISTS(SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace,
 LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
 WHERE (n.nspname||'.'||p.proname)=ANY(ARRAY['app_private.sheets_source','app_private.sheets_snapshot','app_private.sheets_mac','app_private.sheets_command','public.contratpro_sheets_agency','public.contratpro_sheets_worker']::text[]) AND p.prosecdef AND a.grantee=0 AND a.privilege_type='EXECUTE') THEN RAISE EXCEPTION 'D2 definer PUBLIC execute leak';END IF;
END $d2_objects_post$;

DO $d2_security_post$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=ANY(ARRAY['contratpro_rental_writer','contratpro_sheets_worker']::text[])
 AND (rolcanlogin OR rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication OR rolinherit)) THEN RAISE EXCEPTION 'D2 writer role widened';END IF;
END $d2_security_post$;
INSERT INTO supabase_migrations.schema_migrations(version) VALUES('20261124001900');
DO $d2_post$ BEGIN
 IF ARRAY(SELECT version FROM supabase_migrations.schema_migrations ORDER BY version) IS DISTINCT FROM ARRAY['20261115000000','20261115000100','20261115000200','20261115000300','20261115000400','20261115000500','20261115000600','20261116000700','20261118000800','20261118000900','20261118001000','20261119001100','20261119001200','20261120001300','20261122001400','20261122001500','20261124001600','20261124001700','20261124001800','20261124001900']::text[]
 THEN RAISE EXCEPTION 'D2 final history mismatch';END IF;
END $d2_post$;
COMMIT;
