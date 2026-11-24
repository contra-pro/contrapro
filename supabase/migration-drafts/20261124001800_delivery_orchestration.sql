-- BUILD-FIRST ONLY. Requires reviewed 0013-0017. Never apply unchanged.
BEGIN;
DO $guard$ BEGIN RAISE EXCEPTION 'LOCAL DESIGN ONLY: delivery activation deferred';END $guard$;
SET LOCAL search_path=pg_catalog,pg_temp;
SET LOCAL row_security=on;
CREATE ROLE contratpro_delivery_worker NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT NOCREATEROLE NOCREATEDB NOREPLICATION;
GRANT USAGE ON SCHEMA app_private,tenancy,public TO contratpro_delivery_worker;
INSERT INTO tenancy.permissions(key,description) VALUES('contracts.deliver','Manage contract delivery and recipient access');
CREATE TABLE app_private.delivery_gateway_key(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),secret text NOT NULL CHECK(secret~'^[a-f0-9]{64}$'));
CREATE TABLE app_private.delivery_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),agency_id uuid NOT NULL,session_id uuid NOT NULL,event_key text NOT NULL,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN('pending','processing','materialized','failed')),lease uuid,lease_until timestamptz,attempts integer NOT NULL DEFAULT 0,error_code text,expires_at timestamptz NOT NULL DEFAULT clock_timestamp()+interval '7 days',
 UNIQUE(agency_id,event_key),FOREIGN KEY(agency_id,session_id) REFERENCES app_private.signing_sessions(agency_id,id));
CREATE TABLE app_private.delivery_downloads(agency_id uuid NOT NULL,session_id uuid NOT NULL,id uuid NOT NULL,token_hash text NOT NULL UNIQUE CHECK(token_hash~'^[a-f0-9]{64}$'),
 checksum text NOT NULL,client_id uuid NOT NULL,expires_at timestamptz NOT NULL,revoked boolean NOT NULL DEFAULT false,PRIMARY KEY(agency_id,id),FOREIGN KEY(agency_id,session_id) REFERENCES app_private.signing_sessions(agency_id,id));
CREATE TABLE app_private.delivery_jobs(id uuid PRIMARY KEY,agency_id uuid NOT NULL,session_id uuid NOT NULL,event_key text NOT NULL,purpose text NOT NULL CHECK(purpose IN('invitation','verification-code','reminder','final-document','agency-notification')),
 channel text NOT NULL CHECK(channel IN('email','manual-whatsapp','manual-out-of-band')),state text NOT NULL DEFAULT 'queued' CHECK(state IN('queued','processing','accepted','delivered','failed','bounced','cancelled','uncertain')),
 token_hash text,grant_id uuid,checksum text NOT NULL,intent_hash text NOT NULL,attempts integer NOT NULL DEFAULT 0,not_before timestamptz NOT NULL DEFAULT clock_timestamp(),expires_at timestamptz NOT NULL,
 lease uuid,lease_until timestamptz,armed_at timestamptz,provider_id text UNIQUE,error_code text,retryable boolean NOT NULL DEFAULT false,obsolete boolean NOT NULL DEFAULT false,
 manual_status text NOT NULL DEFAULT 'not-shared' CHECK(manual_status IN('not-shared','copied-link','copied-message','whatsapp-open-requested','reported-sent')),
 FOREIGN KEY(agency_id,session_id) REFERENCES app_private.signing_sessions(agency_id,id),FOREIGN KEY(agency_id,grant_id) REFERENCES app_private.delivery_downloads(agency_id,id),
 CHECK(purpose<>'verification-code' OR channel<>'email'),UNIQUE(agency_id,event_key,purpose,channel));
CREATE TABLE app_private.delivery_payloads(job_id uuid PRIMARY KEY REFERENCES app_private.delivery_jobs(id),agency_id uuid NOT NULL,envelope jsonb NOT NULL CHECK(pg_column_size(envelope)<65536));
CREATE TABLE app_private.delivery_inbox(event_id text PRIMARY KEY,provider_id text NOT NULL,hash text NOT NULL,state text NOT NULL CHECK(state IN('accepted','delivered','failed','bounced')),at timestamptz NOT NULL,received_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE app_private.delivery_rate(bucket text NOT NULL,window_start timestamptz NOT NULL,count integer NOT NULL,PRIMARY KEY(bucket,window_start));
CREATE INDEX delivery_due ON app_private.delivery_jobs(not_before) WHERE state IN('queued','failed','processing');
CREATE INDEX delivery_inbox_provider ON app_private.delivery_inbox(provider_id,at);
CREATE INDEX delivery_rate_expiry ON app_private.delivery_rate(window_start);
DO $tables$ DECLARE t text;BEGIN
 FOREACH t IN ARRAY ARRAY['delivery_gateway_key','delivery_events','delivery_downloads','delivery_jobs','delivery_payloads','delivery_inbox','delivery_rate'] LOOP
  EXECUTE format('ALTER TABLE app_private.%I ENABLE ROW LEVEL SECURITY',t);EXECUTE format('ALTER TABLE app_private.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON app_private.%I FROM PUBLIC,anon,authenticated,service_role',t);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE ON app_private.%I TO contratpro_rental_writer,contratpro_delivery_worker',t);
  EXECUTE format('CREATE POLICY delivery_worker ON app_private.%I TO contratpro_delivery_worker USING(true) WITH CHECK(true)',t);
  IF t NOT IN('delivery_gateway_key','delivery_inbox','delivery_rate') THEN
   EXECUTE format('CREATE POLICY delivery_agency ON app_private.%I TO contratpro_rental_writer USING(agency_id=nullif(current_setting(''contratpro.signing_agency'',true),'''')::uuid) WITH CHECK(agency_id=nullif(current_setting(''contratpro.signing_agency'',true),'''')::uuid)',t);
  ELSE EXECUTE format('CREATE POLICY delivery_internal ON app_private.%I TO contratpro_rental_writer USING(true) WITH CHECK(true)',t);END IF;
 END LOOP;END $tables$;
REVOKE INSERT,UPDATE ON app_private.delivery_gateway_key FROM contratpro_rental_writer,contratpro_delivery_worker;
REVOKE INSERT,UPDATE ON app_private.delivery_inbox FROM contratpro_rental_writer;
REVOKE UPDATE ON app_private.delivery_inbox FROM contratpro_delivery_worker;
GRANT DELETE ON app_private.delivery_payloads,app_private.delivery_rate TO contratpro_rental_writer,contratpro_delivery_worker;
CREATE TRIGGER delivery_inbox_immutable BEFORE UPDATE OR DELETE ON app_private.delivery_inbox FOR EACH ROW EXECUTE FUNCTION app_private.rental_receipt_immutable();
REVOKE UPDATE ON app_private.delivery_payloads FROM contratpro_rental_writer,contratpro_delivery_worker;
CREATE FUNCTION app_private.delivery_binding_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Immutable delivery history' USING ERRCODE='42501';END IF;
 IF TG_TABLE_NAME='delivery_downloads' THEN
  IF ROW(NEW.agency_id,NEW.session_id,NEW.id,NEW.token_hash,NEW.checksum,NEW.client_id,NEW.expires_at) IS DISTINCT FROM ROW(OLD.agency_id,OLD.session_id,OLD.id,OLD.token_hash,OLD.checksum,OLD.client_id,OLD.expires_at) OR (OLD.revoked AND NOT NEW.revoked) THEN RAISE EXCEPTION 'Immutable download binding' USING ERRCODE='42501';END IF;
 ELSE
  IF ROW(NEW.agency_id,NEW.session_id,NEW.id,NEW.event_key,NEW.purpose,NEW.channel,NEW.token_hash,NEW.grant_id,NEW.checksum,NEW.intent_hash,NEW.expires_at) IS DISTINCT FROM ROW(OLD.agency_id,OLD.session_id,OLD.id,OLD.event_key,OLD.purpose,OLD.channel,OLD.token_hash,OLD.grant_id,OLD.checksum,OLD.intent_hash,OLD.expires_at) OR (OLD.provider_id IS NOT NULL AND NEW.provider_id IS DISTINCT FROM OLD.provider_id) OR (OLD.obsolete AND NOT NEW.obsolete) THEN RAISE EXCEPTION 'Immutable delivery binding' USING ERRCODE='42501';END IF;
 END IF;RETURN NEW;END $f$;
CREATE TRIGGER delivery_job_binding BEFORE UPDATE OR DELETE ON app_private.delivery_jobs FOR EACH ROW EXECUTE FUNCTION app_private.delivery_binding_guard();
CREATE TRIGGER delivery_grant_binding BEFORE UPDATE OR DELETE ON app_private.delivery_downloads FOR EACH ROW EXECUTE FUNCTION app_private.delivery_binding_guard();
GRANT SELECT ON app_private.signing_sessions,app_private.signing_invitations,app_private.rental_document_versions,app_private.signing_events TO contratpro_delivery_worker;
GRANT SELECT(agency_id,session_id,request_id,input,action) ON app_private.signing_receipts TO contratpro_delivery_worker;
-- UPDATE(id) exists solely to permit FOR UPDATE row locks. The existing immutable
-- signing-binding trigger still rejects identifier changes. No public table grants.
GRANT UPDATE(id) ON app_private.signing_sessions TO contratpro_delivery_worker;
GRANT INSERT ON app_private.signing_events TO contratpro_delivery_worker;
CREATE POLICY delivery_signing_read ON app_private.signing_sessions TO contratpro_delivery_worker USING(agency_id=nullif(current_setting('contratpro.signing_agency',true),'')::uuid) WITH CHECK(agency_id=nullif(current_setting('contratpro.signing_agency',true),'')::uuid);
CREATE POLICY delivery_invitation_read ON app_private.signing_invitations FOR SELECT TO contratpro_delivery_worker USING(agency_id=nullif(current_setting('contratpro.signing_agency',true),'')::uuid);
CREATE POLICY delivery_invitation_reference ON app_private.signing_receipts FOR SELECT TO contratpro_delivery_worker USING(agency_id=nullif(current_setting('contratpro.signing_agency',true),'')::uuid);
CREATE POLICY delivery_snapshot_read ON app_private.rental_document_versions FOR SELECT TO contratpro_delivery_worker USING(agency_id=nullif(current_setting('contratpro.signing_agency',true),'')::uuid);
CREATE POLICY delivery_evidence ON app_private.signing_events TO contratpro_delivery_worker USING(agency_id=nullif(current_setting('contratpro.signing_agency',true),'')::uuid) WITH CHECK(agency_id=nullif(current_setting('contratpro.signing_agency',true),'')::uuid);
GRANT EXECUTE ON FUNCTION app_private.signing_event(uuid,uuid,text,jsonb) TO contratpro_delivery_worker;

CREATE FUNCTION app_private.delivery_mac(message text) RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE secret_hex text;k bytea;a bytea;b bytea;i integer;BEGIN
 SELECT secret INTO secret_hex FROM app_private.delivery_gateway_key WHERE singleton;IF secret_hex IS NULL THEN RAISE EXCEPTION 'Delivery unavailable' USING ERRCODE='55000';END IF;
 k:=decode(secret_hex||repeat('00',32),'hex');a:=k;b:=k;FOR i IN 0..63 LOOP a:=set_byte(a,i,get_byte(k,i)#54);b:=set_byte(b,i,get_byte(k,i)#92);END LOOP;
 RETURN encode(sha256(b||sha256(a||convert_to(message,'UTF8'))),'hex');END $f$;
CREATE FUNCTION app_private.delivery_allowed(aid uuid) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE actor uuid;BEGIN actor:=app_private.rental_member(aid);
 IF NOT EXISTS(SELECT 1 FROM tenancy.membership_roles mr JOIN tenancy.role_permissions rp ON rp.agency_id=mr.agency_id AND rp.role_id=mr.role_id WHERE mr.agency_id=aid AND mr.membership_id=actor AND rp.permission_key='contracts.deliver') THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;RETURN actor;END $f$;
CREATE FUNCTION app_private.delivery_view(j app_private.delivery_jobs) RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $f$
 SELECT jsonb_build_object('id',j.id,'agencyId',j.agency_id,'sessionId',j.session_id,'purpose',j.purpose,'channel',j.channel,'state',j.state,'attempts',j.attempts,'notBefore',j.not_before,'expiresAt',j.expires_at,'providerId',j.provider_id,'errorCode',j.error_code,'manualStatus',j.manual_status,'retryable',j.retryable,'obsolete',j.obsolete)
$f$;
CREATE FUNCTION app_private.delivery_context(aid uuid,sid uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE s app_private.signing_sessions;inv app_private.signing_invitations;parties jsonb;doc jsonb;ref uuid;ev app_private.delivery_events;BEGIN
 SELECT * INTO STRICT s FROM app_private.signing_sessions WHERE agency_id=aid AND id=sid;
 SELECT payload INTO doc FROM app_private.rental_document_versions WHERE agency_id=aid AND contract_id=s.rental_id AND version=(s.original->>'rentalVersion')::integer;parties:=doc->'parties';
 SELECT * INTO inv FROM app_private.signing_invitations WHERE agency_id=aid AND session_id=sid AND NOT revoked AND NOT consumed AND failures<5 AND expires_at>clock_timestamp() ORDER BY expires_at DESC LIMIT 1;
 IF inv.token_hash IS NOT NULL THEN SELECT request_id INTO ref FROM app_private.signing_receipts WHERE agency_id=aid AND session_id=sid AND input->>'tokenHash'=inv.token_hash AND action IN('invite','renew') LIMIT 1;END IF;
 SELECT * INTO ev FROM app_private.delivery_events WHERE agency_id=aid AND session_id=sid AND event_key='completed:'||sid::text;
 RETURN jsonb_build_object('agencyId',aid,'sessionId',sid,'rentalId',s.rental_id,'state',s.state,'locale',s.locale,'agencyName',parties->'agency'->>'name','agencyEmail',COALESCE(parties->'agency'->>'email',''),'clientEmail',COALESCE(parties->'primaryDriver'->>'email',''),'clientPhone',COALESCE(parties->'primaryDriver'->>'phone',''),'reference',doc->>'number','originalChecksum',s.original->>'checksum',
 'invitation',CASE WHEN inv.token_hash IS NULL THEN NULL ELSE jsonb_build_object('hash',inv.token_hash,'requestId',ref,'expiresAt',inv.expires_at) END,'final',s.final,'eventId',ev.id,'eventExpiresAt',ev.expires_at);
END $f$;
CREATE FUNCTION app_private.delivery_valid(j app_private.delivery_jobs) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE s app_private.signing_sessions;BEGIN
 SELECT * INTO s FROM app_private.signing_sessions WHERE agency_id=j.agency_id AND id=j.session_id;
 IF j.obsolete OR j.expires_at<=clock_timestamp() THEN RETURN false;END IF;
 IF j.purpose IN('invitation','verification-code','reminder') THEN RETURN s.state='awaiting_client' AND s.expires_at>clock_timestamp() AND s.original->>'checksum'=j.checksum AND EXISTS(SELECT 1 FROM app_private.signing_invitations WHERE agency_id=j.agency_id AND session_id=j.session_id AND token_hash=j.token_hash AND NOT revoked AND NOT consumed AND failures<5 AND expires_at>clock_timestamp() AND expires_at>=j.expires_at);END IF;
 RETURN s.state='completed' AND s.final->>'checksum'=j.checksum AND (j.purpose='agency-notification' OR EXISTS(SELECT 1 FROM app_private.delivery_downloads WHERE agency_id=j.agency_id AND session_id=j.session_id AND client_id=s.client_id AND id=j.grant_id AND NOT revoked AND expires_at>clock_timestamp() AND expires_at>=j.expires_at AND checksum=j.checksum));
END $f$;
CREATE FUNCTION app_private.delivery_observe(jid uuid,target text,event_ref text) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE j app_private.delivery_jobs;rank_old integer;rank_new integer;BEGIN
 SELECT * INTO j FROM app_private.delivery_jobs WHERE id=jid FOR UPDATE;
 rank_old:=CASE j.state WHEN 'accepted' THEN 1 WHEN 'delivered' THEN 2 WHEN 'failed' THEN 3 WHEN 'bounced' THEN 4 ELSE 0 END;
 rank_new:=CASE target WHEN 'accepted' THEN 1 WHEN 'delivered' THEN 2 WHEN 'failed' THEN 3 WHEN 'bounced' THEN 4 ELSE 0 END;
 IF rank_new>=rank_old AND j.state<>'cancelled' THEN UPDATE app_private.delivery_jobs SET state=target,retryable=false,error_code=CASE WHEN target IN('failed','bounced') THEN 'provider-'||target ELSE NULL END WHERE id=jid;END IF;
 PERFORM app_private.signing_event(j.agency_id,j.session_id,'delivery-provider-observation',jsonb_build_object('jobId',j.id,'state',target,'eventRef',event_ref));
END $f$;

CREATE FUNCTION app_private.delivery_command(aid uuid,actor uuid,action text,p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE s app_private.signing_sessions;j app_private.delivery_jobs;g app_private.delivery_downloads;ev app_private.delivery_events;v jsonb;item jsonb;result jsonb;payload jsonb;x record;sid uuid;jid uuid;n integer;finger text;request_state text;
BEGIN
 IF jsonb_typeof(p)<>'object' OR pg_column_size(p)>250000 THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
 IF action='claim-event' THEN
  UPDATE app_private.delivery_events SET state='failed',error_code='materialization-retry-exhausted' WHERE state='processing' AND lease_until<clock_timestamp() AND attempts>=5;
  SELECT * INTO ev FROM app_private.delivery_events WHERE expires_at>clock_timestamp() AND attempts<5 AND (state='pending' OR state='processing' AND lease_until<clock_timestamp()) ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1;
  IF ev.id IS NULL THEN RETURN 'null';END IF;
  UPDATE app_private.delivery_events SET state='processing',lease=gen_random_uuid(),lease_until=clock_timestamp()+interval '2 minutes',attempts=attempts+1 WHERE id=ev.id RETURNING * INTO ev;
  PERFORM set_config('contratpro.signing_agency',ev.agency_id::text,true);
  RETURN jsonb_build_object('id',ev.id,'lease',ev.lease,'context',app_private.delivery_context(ev.agency_id,ev.session_id));
 END IF;
 IF action='claim' THEN
  FOR x IN SELECT id,agency_id,session_id FROM app_private.delivery_jobs WHERE channel='email' AND ((state='queued' OR state='failed' AND retryable AND attempts<5) AND not_before<=clock_timestamp() OR state='processing' AND lease_until<clock_timestamp()) ORDER BY not_before,id LIMIT 30 LOOP
   PERFORM set_config('contratpro.signing_agency',x.agency_id::text,true);
   PERFORM 1 FROM app_private.signing_sessions WHERE agency_id=x.agency_id AND id=x.session_id FOR UPDATE SKIP LOCKED;IF NOT FOUND THEN CONTINUE;END IF;
   SELECT * INTO j FROM app_private.delivery_jobs WHERE id=x.id AND (((state='queued' OR state='failed' AND retryable AND attempts<5) AND not_before<=clock_timestamp()) OR state='processing' AND lease_until<clock_timestamp()) FOR UPDATE SKIP LOCKED;IF j.id IS NULL THEN CONTINUE;END IF;
   IF j.state='processing' AND j.armed_at IS NOT NULL THEN UPDATE app_private.delivery_jobs SET state='uncertain',retryable=false,error_code='lease-expired-after-dispatch' WHERE id=j.id;
    PERFORM app_private.signing_event(j.agency_id,j.session_id,'delivery-uncertain',jsonb_build_object('jobId',j.id,'reason','expired-dispatch-lease'));CONTINUE;END IF;
   IF NOT app_private.delivery_valid(j) OR j.attempts>=5 THEN UPDATE app_private.delivery_jobs SET state=CASE WHEN attempts>=5 THEN 'failed' ELSE 'cancelled' END,retryable=false,error_code='expired-or-exhausted' WHERE id=j.id;DELETE FROM app_private.delivery_payloads WHERE job_id=j.id;CONTINUE;END IF;
   UPDATE app_private.delivery_jobs SET state='processing',lease=gen_random_uuid(),lease_until=clock_timestamp()+interval '2 minutes',armed_at=NULL,attempts=attempts+1 WHERE id=j.id RETURNING * INTO j;
   SELECT envelope INTO payload FROM app_private.delivery_payloads WHERE job_id=j.id;
   RETURN jsonb_build_object('job',app_private.delivery_view(j),'lease',j.lease,'envelope',payload);
  END LOOP;RETURN 'null';
 END IF;
 IF action='webhook' THEN
  SELECT hash INTO finger FROM app_private.delivery_inbox WHERE event_id=p->>'eventId';
  IF finger IS NOT NULL THEN IF finger<>p->>'hash' THEN RAISE EXCEPTION 'Conflicting event' USING ERRCODE='40001';END IF;RETURN '{"duplicate":true}';END IF;
  IF p->>'state' NOT IN('accepted','delivered','failed','bounced') OR p->>'hash' !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
  INSERT INTO app_private.delivery_inbox(event_id,provider_id,hash,state,at) VALUES(p->>'eventId',p->>'providerId',p->>'hash',p->>'state',(p->>'at')::timestamptz);
  SELECT * INTO j FROM app_private.delivery_jobs WHERE provider_id=p->>'providerId';
  IF j.id IS NOT NULL THEN PERFORM set_config('contratpro.signing_agency',j.agency_id::text,true);PERFORM 1 FROM app_private.signing_sessions WHERE agency_id=j.agency_id AND id=j.session_id FOR UPDATE;
   PERFORM app_private.delivery_observe(j.id,p->>'state',p->>'eventId');END IF;RETURN '{"admitted":true}';
 END IF;
 IF action='download' THEN
  INSERT INTO app_private.delivery_rate VALUES('download-global',date_trunc('minute',clock_timestamp()),1) ON CONFLICT(bucket,window_start) DO UPDATE SET count=delivery_rate.count+1 RETURNING count INTO n;
  IF n>300 THEN RETURN '{"denied":"rate-limited"}';END IF;
  SELECT * INTO g FROM app_private.delivery_downloads WHERE token_hash=p->>'tokenHash' AND NOT revoked AND expires_at>clock_timestamp();IF g.id IS NULL THEN RETURN '{"denied":"not-found"}';END IF;
  PERFORM set_config('contratpro.signing_agency',g.agency_id::text,true);SELECT * INTO s FROM app_private.signing_sessions WHERE agency_id=g.agency_id AND id=g.session_id;
  INSERT INTO app_private.delivery_rate VALUES(p->>'tokenHash',date_trunc('minute',clock_timestamp()),1) ON CONFLICT(bucket,window_start) DO UPDATE SET count=delivery_rate.count+1 RETURNING count INTO n;
  IF n>30 THEN RETURN '{"denied":"rate-limited"}';END IF;
  IF s.state<>'completed' OR s.final->>'checksum' IS DISTINCT FROM g.checksum OR s.client_id<>g.client_id THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
  RETURN s.final;
 END IF;
 IF action='purge-expired' THEN
  DELETE FROM app_private.delivery_payloads WHERE job_id IN(SELECT q.id FROM app_private.delivery_jobs q JOIN app_private.delivery_payloads d ON d.job_id=q.id WHERE q.expires_at<=clock_timestamp() OR q.state IN('delivered','bounced','cancelled') LIMIT 1000);RETURN 'true';
 END IF;
 IF action='dashboard' THEN
  IF COALESCE((p->>'page')::integer,0) NOT BETWEEN 1 AND 10000 OR COALESCE(p->>'filter','') NOT IN('all','queued','processing','accepted','delivered','failed','bounced','cancelled','uncertain') THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
  PERFORM set_config('contratpro.signing_agency',aid::text,true);
  RETURN jsonb_build_object('items',(SELECT COALESCE(jsonb_agg(v),'[]'::jsonb) FROM (SELECT app_private.delivery_view(q)||jsonb_build_object('rentalId',s.rental_id) AS v FROM app_private.delivery_jobs q JOIN app_private.signing_sessions s ON s.agency_id=q.agency_id AND s.id=q.session_id WHERE q.agency_id=aid AND (p->>'filter'='all' OR q.state=p->>'filter') ORDER BY q.not_before DESC,q.id LIMIT 20 OFFSET ((p->>'page')::integer-1)*20) page),
   'total',(SELECT count(*) FROM app_private.delivery_jobs WHERE agency_id=aid AND (p->>'filter'='all' OR state=p->>'filter')));
 END IF;
 IF p ? 'jobId' THEN
  SELECT * INTO j FROM app_private.delivery_jobs WHERE id=(p->>'jobId')::uuid AND (aid IS NULL OR agency_id=aid);IF j.id IS NULL THEN RAISE EXCEPTION 'Missing' USING ERRCODE='P0002';END IF;aid:=j.agency_id;sid:=j.session_id;
 ELSE sid:=(p->>'sessionId')::uuid;END IF;
 PERFORM set_config('contratpro.signing_agency',aid::text,true);
 SELECT * INTO s FROM app_private.signing_sessions WHERE agency_id=aid AND id=sid FOR UPDATE;IF s.id IS NULL THEN RAISE EXCEPTION 'Missing' USING ERRCODE='P0002';END IF;
 IF j.id IS NOT NULL THEN SELECT * INTO j FROM app_private.delivery_jobs WHERE id=j.id FOR UPDATE;END IF;
 IF action='context' THEN RETURN app_private.delivery_context(aid,sid);END IF;
 IF action='list' THEN
  SELECT COALESCE(jsonb_agg(app_private.delivery_view(d) ORDER BY d.not_before,d.id),'[]'::jsonb) INTO result FROM app_private.delivery_jobs d WHERE agency_id=aid AND session_id=sid;
  RETURN jsonb_build_object('jobs',result,'events',(SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'state',state,'errorCode',error_code)),'[]'::jsonb) FROM app_private.delivery_events WHERE agency_id=aid AND session_id=sid),
    'downloads',(SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'expiresAt',expires_at,'revoked',revoked)),'[]'::jsonb) FROM app_private.delivery_downloads WHERE agency_id=aid AND session_id=sid));
 ELSIF action='prepare-final' THEN
  IF s.state<>'completed' OR s.final IS NULL OR p->>'tokenHash' !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
  SELECT * INTO g FROM app_private.delivery_downloads WHERE agency_id=aid AND id=(p->>'grantId')::uuid;
  IF g.id IS NULL THEN
   INSERT INTO app_private.delivery_downloads VALUES(aid,sid,(p->>'grantId')::uuid,p->>'tokenHash',s.final->>'checksum',s.client_id,clock_timestamp()+interval '48 hours',false) RETURNING * INTO g;
   PERFORM app_private.signing_event(aid,sid,'download-access-created',jsonb_build_object('grantId',g.id,'expiresAt',g.expires_at,'actor',actor));
  END IF;
  IF g.session_id<>sid OR g.token_hash IS DISTINCT FROM p->>'tokenHash' OR g.revoked OR g.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
  RETURN jsonb_build_object('id',g.id,'expiresAt',g.expires_at,'checksum',g.checksum);
 ELSIF action='queue' THEN
  IF jsonb_typeof(p->'jobs')<>'array' OR jsonb_array_length(p->'jobs') NOT BETWEEN 1 AND 3 THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p->'jobs') a JOIN jsonb_array_elements(p->'jobs') b ON a->>'purpose'='verification-code' AND b->>'purpose' IN('invitation','reminder') WHERE a->>'channel'=b->>'channel') THEN RAISE EXCEPTION 'Separate channels required' USING ERRCODE='22023';END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p->'jobs') LOOP
   IF item->>'purpose' IN('invitation','reminder','verification-code') AND EXISTS(SELECT 1 FROM app_private.delivery_jobs WHERE agency_id=aid AND token_hash=item->>'tokenHash' AND channel=item->>'channel' AND
    ((purpose='verification-code' AND item->>'purpose' IN('invitation','reminder')) OR (purpose IN('invitation','reminder') AND item->>'purpose'='verification-code'))) THEN RAISE EXCEPTION 'Separate channels required' USING ERRCODE='22023';END IF;
   IF item->>'purpose' IN('invitation','reminder') AND EXISTS(SELECT 1 FROM app_private.delivery_jobs WHERE agency_id=aid AND token_hash=item->>'tokenHash' AND purpose='invitation' AND channel<>item->>'channel') THEN RAISE EXCEPTION 'Renew before changing channels' USING ERRCODE='40001';END IF;
   IF item->>'purpose'='verification-code' AND EXISTS(SELECT 1 FROM app_private.delivery_jobs WHERE agency_id=aid AND token_hash=item->>'tokenHash' AND purpose='verification-code' AND channel<>item->>'channel') THEN RAISE EXCEPTION 'Renew before changing channels' USING ERRCODE='40001';END IF;
   jid:=(item->>'id')::uuid;SELECT * INTO j FROM app_private.delivery_jobs WHERE id=jid;
   IF j.id IS NOT NULL THEN IF j.agency_id<>aid OR j.session_id<>sid OR j.intent_hash IS DISTINCT FROM item->>'intentHash' THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;CONTINUE;END IF;
   SELECT count(*) INTO n FROM app_private.delivery_jobs WHERE agency_id=aid AND not_before>clock_timestamp()-interval '1 hour';IF n>=100 THEN RAISE EXCEPTION 'Queue rate exceeded' USING ERRCODE='22023';END IF;
   IF item->>'purpose'='reminder' AND (SELECT count(*) FROM app_private.delivery_jobs WHERE agency_id=aid AND token_hash=item->>'tokenHash' AND purpose='reminder')>=3 THEN RAISE EXCEPTION 'Reminder limit' USING ERRCODE='22023';END IF;
   IF (item->'envelope'->>'expiresAt')::timestamptz IS DISTINCT FROM (item->>'expiresAt')::timestamptz OR item->>'intentHash' !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
   INSERT INTO app_private.delivery_jobs(id,agency_id,session_id,event_key,purpose,channel,token_hash,grant_id,checksum,intent_hash,not_before,expires_at)
    VALUES(jid,aid,sid,item->>'eventKey',item->>'purpose',item->>'channel',item->>'tokenHash',(item->>'grantId')::uuid,item->>'checksum',item->>'intentHash',clock_timestamp()+make_interval(mins=>LEAST(1080,GREATEST(0,COALESCE((item->>'delayMinutes')::integer,0)))),(item->>'expiresAt')::timestamptz) RETURNING * INTO j;
   IF NOT app_private.delivery_valid(j) THEN RAISE EXCEPTION 'Expired or obsolete' USING ERRCODE='22023';END IF;
   INSERT INTO app_private.delivery_payloads VALUES(jid,aid,item->'envelope');
   PERFORM app_private.signing_event(aid,sid,'delivery-queued',jsonb_build_object('jobId',jid,'purpose',j.purpose,'channel',j.channel,'actor',actor));
  END LOOP;RETURN app_private.delivery_command(aid,actor,'list',jsonb_build_object('sessionId',sid));
 ELSIF action='materialize-done' OR action='materialize-failed' THEN
  UPDATE app_private.delivery_events SET state=CASE action WHEN 'materialize-done' THEN 'materialized' ELSE 'failed' END,error_code=CASE action WHEN 'materialize-failed' THEN 'recipient-or-payload-unavailable' ELSE NULL END WHERE id=(p->>'eventId')::uuid AND agency_id=aid AND lease=(p->>'lease')::uuid AND state='processing';IF NOT FOUND THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;RETURN 'true';
 ELSIF action='revoke' THEN
  UPDATE app_private.delivery_downloads SET revoked=true WHERE agency_id=aid AND session_id=sid AND id=(p->>'grantId')::uuid;
  PERFORM app_private.signing_event(aid,sid,'download-access-revoked',jsonb_build_object('grantId',p->>'grantId','actor',actor));RETURN 'true';
 ELSIF action='manual' OR action='material' THEN
  IF j.channel='email' OR NOT app_private.delivery_valid(j) THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
  IF action='material' THEN SELECT envelope INTO payload FROM app_private.delivery_payloads WHERE job_id=j.id;RETURN jsonb_build_object('job',app_private.delivery_view(j),'envelope',payload);END IF;
  IF p->>'observed' NOT IN('copied-link','copied-message','whatsapp-open-requested','reported-sent') OR (p->>'observed'='whatsapp-open-requested' AND j.channel<>'manual-whatsapp') OR (p->>'observed'='copied-link' AND j.purpose='verification-code') THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
  UPDATE app_private.delivery_jobs SET manual_status=p->>'observed' WHERE id=j.id;
  PERFORM app_private.signing_event(aid,sid,'manual-sharing-action',jsonb_build_object('jobId',j.id,'observed',p->>'observed','actor',actor,'deliveryConfirmed',false));
 ELSIF action='cancel' THEN
  UPDATE app_private.delivery_jobs SET obsolete=true,state=CASE WHEN armed_at IS NOT NULL AND state='processing' THEN 'uncertain' WHEN state IN('queued','failed','processing') THEN 'cancelled' ELSE state END,retryable=false WHERE id=j.id;
 ELSIF action='retry' THEN
  IF j.state<>'failed' OR NOT j.retryable OR j.attempts>=5 OR j.provider_id IS NOT NULL OR j.not_before>clock_timestamp() OR NOT app_private.delivery_valid(j) THEN RAISE EXCEPTION 'Unsafe retry' USING ERRCODE='40001';END IF;
  UPDATE app_private.delivery_jobs SET state='queued' WHERE id=j.id;
 ELSIF action='reconcile-context' THEN RETURN app_private.delivery_view(j);
 ELSIF action='reconciled' THEN
  IF j.provider_id IS NULL OR p->>'state' NOT IN('accepted','delivered','failed','bounced') THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
  PERFORM app_private.delivery_observe(j.id,p->>'state','reconciliation');
 ELSIF action='arm' THEN
  IF j.state<>'processing' OR j.lease IS DISTINCT FROM (p->>'lease')::uuid OR j.lease_until<=clock_timestamp() OR j.armed_at IS NOT NULL OR NOT app_private.delivery_valid(j) THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
  UPDATE app_private.delivery_jobs SET armed_at=clock_timestamp() WHERE id=j.id;
 ELSIF action='result' THEN
  IF j.lease IS DISTINCT FROM (p->>'lease')::uuid OR j.armed_at IS NULL OR j.state NOT IN('processing','uncertain') THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
  request_state:=p->>'state';IF request_state NOT IN('accepted','failed','uncertain') THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
  UPDATE app_private.delivery_jobs SET state=request_state,provider_id=CASE WHEN request_state='accepted' THEN p->>'providerId' ELSE provider_id END,retryable=request_state='failed' AND p->>'errorCode'='rate-limit' AND attempts<5 AND NOT obsolete,
   error_code=CASE WHEN request_state='failed' THEN CASE WHEN p->>'errorCode'='rate-limit' THEN 'rate-limit' ELSE 'rejected' END WHEN request_state='uncertain' THEN 'transport-unknown' ELSE NULL END,
   not_before=clock_timestamp()+make_interval(secs=>LEAST(3600,30*power(2,LEAST(attempts,7)))::integer) WHERE id=j.id RETURNING * INTO j;
  PERFORM app_private.signing_event(aid,sid,'delivery-result',jsonb_build_object('jobId',j.id,'state',j.state,'providerId',j.provider_id));
  IF j.provider_id IS NOT NULL THEN FOR x IN SELECT * FROM app_private.delivery_inbox WHERE provider_id=j.provider_id ORDER BY at,event_id LOOP PERFORM app_private.delivery_observe(j.id,x.state,x.event_id);END LOOP;END IF;
 ELSIF action='purge' THEN
  DELETE FROM app_private.delivery_payloads d USING app_private.delivery_jobs q WHERE d.job_id=q.id AND q.agency_id=aid AND q.session_id=sid AND (q.expires_at<=clock_timestamp() OR q.state IN('delivered','bounced','cancelled'));
 ELSE RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
 IF j.id IS NOT NULL THEN SELECT * INTO j FROM app_private.delivery_jobs WHERE id=j.id;RETURN app_private.delivery_view(j);END IF;RETURN 'true';
END $f$;

CREATE FUNCTION public.contratpro_delivery_agency(p_payload text,p_mac text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE p jsonb;aid uuid;actor uuid;BEGIN
 IF octet_length(p_payload)>250000 OR p_mac IS DISTINCT FROM app_private.delivery_mac(p_payload) THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
 p:=p_payload::jsonb;aid:=(p->>'agencyId')::uuid;actor:=app_private.delivery_allowed(aid);
 IF p->>'action' NOT IN('context','list','dashboard','prepare-final','queue','material','manual','retry','cancel','revoke','purge') THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
 PERFORM set_config('contratpro.signing_agency',aid::text,true);RETURN app_private.delivery_command(aid,actor,p->>'action',p->'input');END $f$;
CREATE FUNCTION public.contratpro_delivery_worker(p_payload text,p_mac text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE p jsonb;BEGIN
 IF octet_length(p_payload)>250000 OR p_mac IS DISTINCT FROM app_private.delivery_mac(p_payload) THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
 p:=p_payload::jsonb;IF p->>'action' NOT IN('claim-event','claim','arm','result','reconcile-context','reconciled','webhook','prepare-final','queue','context','materialize-done','materialize-failed','download','purge','purge-expired') THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
 RETURN app_private.delivery_command((p->>'agencyId')::uuid,NULL,p->>'action',p->'input');END $f$;
CREATE FUNCTION app_private.delivery_fence() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE aid uuid;sid uuid;gid uuid;BEGIN
 aid:=NEW.agency_id;IF TG_TABLE_NAME='signing_sessions' THEN sid:=NEW.id;ELSE sid:=NEW.session_id;END IF;
 IF TG_TABLE_NAME='signing_sessions' THEN
  IF NEW.state='completed' AND OLD.state<>'completed' THEN INSERT INTO app_private.delivery_events(agency_id,session_id,event_key) VALUES(aid,sid,'completed:'||sid::text) ON CONFLICT DO NOTHING;END IF;
  IF NEW.state='awaiting_client' THEN RETURN NEW;END IF;
 ELSIF TG_TABLE_NAME='signing_invitations' THEN IF NOT NEW.revoked THEN RETURN NEW;END IF;
 END IF;
 PERFORM set_config('contratpro.signing_agency',aid::text,true);
 IF TG_TABLE_NAME='delivery_downloads' THEN gid:=NEW.id;END IF;
 UPDATE app_private.delivery_jobs SET obsolete=true,retryable=false,state=CASE WHEN state='processing' AND armed_at IS NOT NULL THEN 'uncertain' WHEN state IN('queued','processing','failed') THEN 'cancelled' ELSE state END WHERE agency_id=aid AND session_id=sid
  AND ((gid IS NOT NULL AND grant_id=gid) OR (gid IS NULL AND purpose IN('invitation','verification-code','reminder')));
 RETURN NEW;END $f$;
CREATE TRIGGER delivery_session_events AFTER UPDATE OF state ON app_private.signing_sessions FOR EACH ROW WHEN(OLD.state IS DISTINCT FROM NEW.state) EXECUTE FUNCTION app_private.delivery_fence();
CREATE TRIGGER delivery_invitation_fence AFTER UPDATE OF revoked ON app_private.signing_invitations FOR EACH ROW WHEN(NOT OLD.revoked AND NEW.revoked) EXECUTE FUNCTION app_private.delivery_fence();
CREATE TRIGGER delivery_access_fence AFTER UPDATE OF revoked ON app_private.delivery_downloads FOR EACH ROW WHEN(NOT OLD.revoked AND NEW.revoked) EXECUTE FUNCTION app_private.delivery_fence();
INSERT INTO app_private.delivery_events(agency_id,session_id,event_key) SELECT agency_id,id,'completed:'||id::text FROM app_private.signing_sessions WHERE state='completed' ON CONFLICT DO NOTHING;
DO $acl$ DECLARE f regprocedure;BEGIN
 FOR f IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='app_private' AND p.proname IN('delivery_mac','delivery_allowed','delivery_view','delivery_context','delivery_valid','delivery_observe','delivery_command','delivery_fence','delivery_binding_guard') OR n.nspname='public' AND p.proname IN('contratpro_delivery_agency','contratpro_delivery_worker') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f);EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO contratpro_rental_writer,contratpro_delivery_worker',f);
 END LOOP;END $acl$;
ALTER FUNCTION public.contratpro_delivery_agency(text,text) OWNER TO contratpro_rental_writer;
ALTER FUNCTION public.contratpro_delivery_worker(text,text) OWNER TO contratpro_delivery_worker;
GRANT EXECUTE ON FUNCTION public.contratpro_delivery_agency(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.contratpro_delivery_worker(text,text) TO anon,authenticated;
ROLLBACK;
