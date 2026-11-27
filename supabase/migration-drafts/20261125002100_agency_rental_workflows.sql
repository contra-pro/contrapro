-- BUILD-FIRST ONLY. Forward composition after 0013-0020; never apply unchanged.
-- A separately reviewed native executor/ownership/history/rollback package is required.
BEGIN;
DO $guard$ BEGIN RAISE EXCEPTION 'LOCAL DESIGN ONLY: A1 integration and activation deferred'; END $guard$;
SET LOCAL search_path=pg_catalog,pg_temp;
SET LOCAL row_security=on;
CREATE ROLE contratpro_a1_writer NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT NOCREATEROLE NOCREATEDB NOREPLICATION;
GRANT USAGE ON SCHEMA public,app_private,tenancy,identity TO contratpro_a1_writer;
GRANT EXECUTE ON FUNCTION app_private.canonical_auth_user(),app_private.receipt_auth_uid() TO contratpro_a1_writer;
INSERT INTO tenancy.permissions(key,description) VALUES('rentals.payments','Record and reverse rental customer payments and deposit movements');
CREATE TABLE app_private.a1_gateway_key(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),secret text NOT NULL CHECK(secret~'^[a-f0-9]{64}$'));
CREATE TABLE app_private.a1_receipts(agency_id uuid NOT NULL,actor uuid NOT NULL,request_id uuid NOT NULL,input jsonb NOT NULL,result jsonb NOT NULL,
 PRIMARY KEY(agency_id,actor,request_id));
CREATE TABLE app_private.a1_member_versions(agency_id uuid NOT NULL,membership_id uuid NOT NULL,revision integer NOT NULL DEFAULT 0,
 PRIMARY KEY(agency_id,membership_id),FOREIGN KEY(agency_id,membership_id) REFERENCES tenancy.memberships(agency_id,id));
CREATE TABLE app_private.a1_invitation_acceptances(invitation_id uuid PRIMARY KEY REFERENCES tenancy.membership_invitations(id),agency_id uuid NOT NULL,
 membership_id uuid NOT NULL, user_id uuid NOT NULL,FOREIGN KEY(agency_id,membership_id) REFERENCES tenancy.memberships(agency_id,id));
CREATE TABLE app_private.agency_branding(agency_id uuid PRIMARY KEY REFERENCES tenancy.agencies(id),revision integer NOT NULL DEFAULT 0,
 profile jsonb NOT NULL DEFAULT '{}',logo_key text,logo_data text,logo_checksum text,
 CHECK((logo_key IS NULL)=(logo_data IS NULL)),CHECK((logo_key IS NULL)=(logo_checksum IS NULL)),CHECK(length(logo_data)<=275000));
CREATE TABLE app_private.agency_logo_objects(agency_id uuid NOT NULL,key text NOT NULL,checksum text NOT NULL CHECK(checksum~'^[a-f0-9]{64}$'),branding_revision integer NOT NULL,state text NOT NULL DEFAULT 'reserved' CHECK(state IN('reserved','attached')),
 PRIMARY KEY(agency_id,key),FOREIGN KEY(agency_id) REFERENCES tenancy.agencies(id));
CREATE UNIQUE INDEX agency_one_pending_logo_revision ON app_private.agency_logo_objects(agency_id,branding_revision) WHERE state='reserved';
CREATE TABLE app_private.agency_signers(agency_id uuid NOT NULL,membership_id uuid NOT NULL,enabled boolean NOT NULL,name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 200),
 PRIMARY KEY(agency_id,membership_id),FOREIGN KEY(agency_id,membership_id) REFERENCES tenancy.memberships(agency_id,id));
CREATE TABLE app_private.rental_operations(agency_id uuid NOT NULL,rental_id uuid NOT NULL,revision integer NOT NULL DEFAULT 0,pickup text,return_location text,signer_id uuid,
 PRIMARY KEY(agency_id,rental_id),FOREIGN KEY(agency_id,rental_id) REFERENCES tenancy.rental_contracts(agency_id,id),
 FOREIGN KEY(agency_id,signer_id) REFERENCES tenancy.memberships(agency_id,id),
 CHECK(pickup IS NULL OR length(btrim(pickup)) BETWEEN 1 AND 400),CHECK(return_location IS NULL OR length(btrim(return_location)) BETWEEN 1 AND 400));
CREATE TABLE app_private.rental_payments(id uuid PRIMARY KEY,agency_id uuid NOT NULL,rental_id uuid NOT NULL,sequence integer NOT NULL,actor uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN('advance','payment','deposit-in','deposit-out','reversal')),amount_minor bigint NOT NULL CHECK(amount_minor BETWEEN 1 AND 999999999999999999),
 paid_delta bigint NOT NULL,deposit_delta bigint NOT NULL,method text NOT NULL CHECK(method IN('cash','bank-transfer','card','cheque','other')),
 payment_date date NOT NULL,reference text NOT NULL CHECK(length(reference)<=120),reason text NOT NULL CHECK(length(reason)<=400),reverses uuid UNIQUE REFERENCES app_private.rental_payments(id),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(agency_id,rental_id) REFERENCES tenancy.rental_contracts(agency_id,id),FOREIGN KEY(agency_id,actor) REFERENCES tenancy.memberships(agency_id,id),UNIQUE(agency_id,rental_id,sequence),
 CHECK((kind='reversal')=(reverses IS NOT NULL)),CHECK(kind<>'reversal' OR length(btrim(reason))>0));

DO $tables$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['a1_gateway_key','a1_receipts','a1_member_versions','a1_invitation_acceptances','agency_branding','agency_logo_objects','agency_signers','rental_operations','rental_payments'] LOOP
  EXECUTE format('ALTER TABLE app_private.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE app_private.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON app_private.%I FROM PUBLIC,anon,authenticated,service_role,contratpro_runtime,contratpro_platform_runtime',t);
  EXECUTE format('GRANT SELECT ON app_private.%I TO contratpro_a1_writer',t);
  IF t='a1_gateway_key' THEN EXECUTE format('CREATE POLICY a1_internal ON app_private.%I TO contratpro_a1_writer USING(true)',t);
  ELSE
   EXECUTE format('CREATE POLICY a1_scope ON app_private.%I TO contratpro_a1_writer USING(agency_id=nullif(current_setting(''contratpro.a1_agency'',true),'''')::uuid) WITH CHECK(agency_id=nullif(current_setting(''contratpro.a1_agency'',true),'''')::uuid)',t);
   EXECUTE format('GRANT INSERT ON app_private.%I TO contratpro_a1_writer',t);
  END IF;
 END LOOP;
END $tables$;
GRANT UPDATE ON app_private.a1_member_versions,app_private.agency_branding,app_private.agency_signers,app_private.rental_operations TO contratpro_a1_writer;
GRANT UPDATE(state) ON app_private.agency_logo_objects TO contratpro_a1_writer;
CREATE TRIGGER a1_receipt_immutable BEFORE UPDATE OR DELETE ON app_private.a1_receipts FOR EACH ROW EXECUTE FUNCTION app_private.rental_receipt_immutable();
CREATE TRIGGER a1_payment_immutable BEFORE UPDATE OR DELETE ON app_private.rental_payments FOR EACH ROW EXECUTE FUNCTION app_private.rental_receipt_immutable();
CREATE TRIGGER a1_acceptance_immutable BEFORE UPDATE OR DELETE ON app_private.a1_invitation_acceptances FOR EACH ROW EXECUTE FUNCTION app_private.rental_receipt_immutable();
-- Team invitations reuse the existing encrypted delivery queue and worker.
ALTER TABLE app_private.delivery_jobs ALTER COLUMN session_id DROP NOT NULL;
ALTER TABLE app_private.delivery_jobs ADD COLUMN team_invitation_id uuid REFERENCES tenancy.membership_invitations(id);
ALTER TABLE app_private.delivery_jobs DROP CONSTRAINT delivery_jobs_purpose_check;
ALTER TABLE app_private.delivery_jobs ADD CONSTRAINT delivery_jobs_purpose_check CHECK(purpose IN('invitation','verification-code','reminder','final-document','agency-notification','team-invitation'));
ALTER TABLE app_private.delivery_jobs ADD CONSTRAINT delivery_team_binding CHECK((purpose='team-invitation')=(team_invitation_id IS NOT NULL) AND (session_id IS NULL)=(team_invitation_id IS NOT NULL));
CREATE UNIQUE INDEX delivery_team_once ON app_private.delivery_jobs(team_invitation_id) WHERE team_invitation_id IS NOT NULL;
CREATE FUNCTION app_private.a1_delivery_binding_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $f$
BEGIN IF NEW.team_invitation_id IS DISTINCT FROM OLD.team_invitation_id THEN RAISE EXCEPTION 'Immutable team delivery binding' USING ERRCODE='42501';END IF;RETURN NEW;END $f$;
CREATE TRIGGER a1_delivery_binding BEFORE UPDATE ON app_private.delivery_jobs FOR EACH ROW EXECUTE FUNCTION app_private.a1_delivery_binding_guard();
GRANT SELECT,INSERT ON app_private.delivery_jobs,app_private.delivery_payloads TO contratpro_a1_writer;
CREATE POLICY a1_delivery_queue ON app_private.delivery_jobs TO contratpro_a1_writer USING(agency_id=nullif(current_setting('contratpro.a1_agency',true),'')::uuid AND purpose='team-invitation') WITH CHECK(agency_id=nullif(current_setting('contratpro.a1_agency',true),'')::uuid AND purpose='team-invitation');
CREATE POLICY a1_delivery_payload ON app_private.delivery_payloads TO contratpro_a1_writer USING(agency_id=nullif(current_setting('contratpro.a1_agency',true),'')::uuid) WITH CHECK(agency_id=nullif(current_setting('contratpro.a1_agency',true),'')::uuid);
GRANT EXECUTE ON FUNCTION app_private.rental_receipt_immutable() TO contratpro_a1_writer;
GRANT SELECT ON tenancy.agencies,tenancy.memberships,tenancy.roles,tenancy.membership_roles,tenancy.role_permissions,tenancy.permissions,tenancy.membership_invitations,
 tenancy.rental_contracts,tenancy.clients,tenancy.vehicles,app_private.rental_drivers,app_private.rental_document_versions TO contratpro_a1_writer;
GRANT SELECT(supabase_user_id,user_id) ON identity.supabase_users TO contratpro_a1_writer;
GRANT SELECT(id,state) ON identity.users TO contratpro_a1_writer;
CREATE POLICY a1_mapping ON identity.supabase_users FOR SELECT TO contratpro_a1_writer USING(supabase_user_id=app_private.receipt_auth_uid());
CREATE POLICY a1_identity ON identity.users FOR SELECT TO contratpro_a1_writer USING(id IN(SELECT user_id FROM identity.supabase_users WHERE supabase_user_id=app_private.receipt_auth_uid()) OR id IN(SELECT user_id FROM tenancy.memberships WHERE agency_id=nullif(current_setting('contratpro.a1_agency',true),'')::uuid));
DO $read$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['tenancy.agencies','tenancy.memberships','tenancy.roles','tenancy.membership_roles','tenancy.role_permissions','tenancy.membership_invitations','tenancy.rental_contracts','tenancy.clients','tenancy.vehicles','app_private.rental_drivers','app_private.rental_document_versions'] LOOP
  EXECUTE format('CREATE POLICY a1_access ON %s TO contratpro_a1_writer USING(%s=nullif(current_setting(''contratpro.a1_agency'',true),'''')::uuid) WITH CHECK(%s=nullif(current_setting(''contratpro.a1_agency'',true),'''')::uuid)',t,CASE WHEN t='tenancy.agencies' THEN 'id' ELSE 'agency_id' END,CASE WHEN t='tenancy.agencies' THEN 'id' ELSE 'agency_id' END);
 END LOOP;
END $read$;
CREATE POLICY a1_invite_lookup ON tenancy.membership_invitations FOR SELECT TO contratpro_a1_writer USING(token_digest=current_setting('contratpro.a1_token',true));
GRANT INSERT(id,agency_id,user_id,state) ON tenancy.memberships TO contratpro_a1_writer;
GRANT UPDATE(state) ON tenancy.memberships TO contratpro_a1_writer;
GRANT INSERT ON tenancy.membership_roles,tenancy.roles,tenancy.role_permissions,tenancy.membership_invitations TO contratpro_a1_writer;
GRANT UPDATE(name) ON tenancy.roles TO contratpro_a1_writer;
GRANT DELETE ON tenancy.membership_roles,tenancy.role_permissions TO contratpro_a1_writer;
GRANT UPDATE(state) ON tenancy.membership_invitations TO contratpro_a1_writer;
GRANT UPDATE(version,updated_at) ON tenancy.rental_contracts TO contratpro_a1_writer;
GRANT INSERT(agency_id,actor_membership_id,action,request_id,metadata) ON tenancy.audit_events TO contratpro_a1_writer;
CREATE POLICY a1_audit ON tenancy.audit_events FOR INSERT TO contratpro_a1_writer WITH CHECK(agency_id=nullif(current_setting('contratpro.a1_agency',true),'')::uuid AND actor_membership_id IN(SELECT id FROM tenancy.memberships WHERE user_id=app_private.canonical_auth_user() AND state='active'));
CREATE POLICY a1_delivery_audit ON tenancy.audit_events FOR INSERT TO contratpro_a1_writer WITH CHECK(agency_id=nullif(current_setting('contratpro.a1_agency',true),'')::uuid AND action='team.delivery' AND actor_membership_id IN(SELECT i.invited_by_membership_id FROM tenancy.membership_invitations i WHERE i.agency_id=audit_events.agency_id AND i.id=(audit_events.metadata->>'invitationId')::uuid));
GRANT INSERT ON app_private.rental_document_versions TO contratpro_a1_writer;
GRANT EXECUTE ON FUNCTION app_private.rental_driver_payload(uuid,uuid),app_private.rental_member(uuid),public.contratpro_rental_create(uuid,uuid,jsonb) TO contratpro_a1_writer;
GRANT SELECT,INSERT,UPDATE ON app_private.signing_sessions,app_private.signing_invitations TO contratpro_a1_writer;
GRANT INSERT ON app_private.signing_events TO contratpro_a1_writer;
CREATE POLICY a1_signing ON app_private.signing_sessions TO contratpro_a1_writer USING(agency_id=nullif(current_setting('contratpro.a1_agency',true),'')::uuid) WITH CHECK(agency_id=nullif(current_setting('contratpro.a1_agency',true),'')::uuid);
CREATE POLICY a1_signing ON app_private.signing_invitations TO contratpro_a1_writer USING(agency_id=nullif(current_setting('contratpro.a1_agency',true),'')::uuid) WITH CHECK(agency_id=nullif(current_setting('contratpro.a1_agency',true),'')::uuid);
CREATE POLICY a1_signing ON app_private.signing_events FOR INSERT TO contratpro_a1_writer WITH CHECK(agency_id=nullif(current_setting('contratpro.a1_agency',true),'')::uuid);
GRANT SELECT ON app_private.signing_events TO contratpro_a1_writer;
CREATE POLICY a1_signing_event_read ON app_private.signing_events FOR SELECT TO contratpro_a1_writer USING(agency_id=nullif(current_setting('contratpro.a1_agency',true),'')::uuid);
GRANT EXECUTE ON FUNCTION app_private.signing_transition(uuid,uuid,text,jsonb),app_private.signing_event(uuid,uuid,text,jsonb) TO contratpro_a1_writer;

CREATE FUNCTION app_private.a1_mac(message text) RETURNS text LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE s text;k bytea;a bytea;b bytea;i integer;BEGIN
 SELECT secret INTO s FROM app_private.a1_gateway_key WHERE singleton;IF s IS NULL THEN RAISE EXCEPTION 'Unavailable' USING ERRCODE='55000';END IF;
 k:=decode(s||repeat('00',32),'hex');a:=k;b:=k;FOR i IN 0..63 LOOP a:=set_byte(a,i,get_byte(k,i)#54);b:=set_byte(b,i,get_byte(k,i)#92);END LOOP;
 RETURN encode(sha256(b||sha256(a||convert_to(message,'UTF8'))),'hex');END $f$;
CREATE FUNCTION app_private.a1_member(aid uuid) RETURNS uuid LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE mid uuid;BEGIN
 SELECT m.id INTO mid FROM tenancy.memberships m JOIN tenancy.agencies a ON a.id=m.agency_id WHERE m.agency_id=aid AND m.user_id=app_private.canonical_auth_user() AND m.state='active' AND a.state='active';
 IF mid IS NULL THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;RETURN mid;END $f$;
CREATE FUNCTION app_private.a1_capability(aid uuid,mid uuid,cap text) RETURNS boolean LANGUAGE sql SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
 SELECT EXISTS(SELECT 1 FROM tenancy.membership_roles mr JOIN tenancy.role_permissions rp ON rp.agency_id=mr.agency_id AND rp.role_id=mr.role_id WHERE mr.agency_id=aid AND mr.membership_id=mid AND rp.permission_key=cap)
$f$;
CREATE FUNCTION app_private.a1_owner(aid uuid,mid uuid) RETURNS boolean LANGUAGE sql SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
 SELECT app_private.a1_capability(aid,mid,'agency.manage') AND EXISTS(SELECT 1 FROM tenancy.membership_roles mr JOIN tenancy.roles r ON r.agency_id=mr.agency_id AND r.id=mr.role_id WHERE mr.agency_id=aid AND mr.membership_id=mid AND r.key='owner')
$f$;
CREATE FUNCTION app_private.a1_revoke_signer(aid uuid,mid uuid) RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE x record;BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('documents:'||aid::text,0));
 PERFORM set_config('contratpro.signing_agency',aid::text,true);
 FOR x IN SELECT id FROM app_private.signing_sessions WHERE agency_id=aid AND agency_member_id=mid AND state NOT IN('completed','expired','declined','cancelled','failed') ORDER BY id FOR UPDATE LOOP
  PERFORM app_private.signing_transition(aid,x.id,'cancelled',jsonb_build_object('reason','agency-authority-revoked','membershipId',mid));
 END LOOP;
END $f$;
CREATE FUNCTION app_private.a1_payment_summary(aid uuid,rid uuid) RETURNS jsonb LANGUAGE sql SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
 SELECT jsonb_build_object('paidMinor',COALESCE(sum(p.paid_delta),0)::text,'remainingMinor',(r.total_minor-COALESCE(sum(p.paid_delta),0))::text,
 'depositHeldMinor',COALESCE(sum(p.deposit_delta),0)::text,'status',CASE WHEN COALESCE(sum(p.paid_delta),0)=r.total_minor THEN 'paid' WHEN COALESCE(sum(p.paid_delta),0)=0 THEN 'unpaid' ELSE 'partial' END,
 'lastOperation',(SELECT jsonb_build_object('kind',q.kind,'amountMinor',q.amount_minor::text,'method',q.method,'date',q.payment_date,'reference',q.reference) FROM app_private.rental_payments q WHERE q.agency_id=aid AND q.rental_id=rid ORDER BY sequence DESC LIMIT 1))
 FROM tenancy.rental_contracts r LEFT JOIN app_private.rental_payments p ON p.agency_id=r.agency_id AND p.rental_id=r.id WHERE r.agency_id=aid AND r.id=rid GROUP BY r.total_minor
$f$;

CREATE FUNCTION public.contratpro_a1(p_payload text,p_mac text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
#variable_conflict use_column
<<cmd>>
DECLARE body jsonb;p jsonb;aid uuid;actor uuid;uid uuid;action text;req uuid;result jsonb;old_receipt app_private.a1_receipts;
 inv tenancy.membership_invitations;m tenancy.memberships;r tenancy.rental_contracts;o app_private.rental_operations;b app_private.agency_branding;
 target uuid;role_id uuid;role_key text;rev integer;entry app_private.rental_payments;n bigint;pd bigint;dd bigint;paid bigint;held bigint;x record;digest text;
BEGIN
 IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'Unsupported isolation' USING ERRCODE='22023';END IF;
 IF p_payload IS NULL OR octet_length(p_payload)>450000 OR p_mac IS NULL OR p_mac IS DISTINCT FROM app_private.a1_mac(p_payload) THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
 body:=p_payload::jsonb;p:=body->'input';aid:=(body->>'agencyId')::uuid;action:=body->>'action';
 IF jsonb_typeof(p)<>'object' THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
 uid:=app_private.canonical_auth_user();IF uid IS NULL THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
 IF action='accept' THEN
  digest:=p->>'digest';IF digest IS NULL OR digest!~'^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
  PERFORM set_config('contratpro.a1_token',digest,true);
  SELECT * INTO inv FROM tenancy.membership_invitations WHERE token_digest=digest;
  IF inv.id IS NULL THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;aid:=inv.agency_id;
 END IF;
 IF aid IS NULL THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
 PERFORM set_config('contratpro.a1_agency',aid::text,true);
 -- One owner/membership lock serializes last-owner, grants, acceptance and reactivation.
 PERFORM pg_advisory_xact_lock(hashtextextended('a1:team:'||aid::text,0));
 IF action='accept' THEN
  SELECT * INTO inv FROM tenancy.membership_invitations WHERE id=inv.id FOR UPDATE;
  IF lower(inv.recipient_email) IS DISTINCT FROM lower(p->>'verifiedEmail') OR NOT EXISTS(SELECT 1 FROM tenancy.agencies WHERE id=aid AND state='active') THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
  IF inv.state='accepted' THEN
   SELECT m2.* INTO m FROM app_private.a1_invitation_acceptances z JOIN tenancy.memberships m2 ON m2.agency_id=z.agency_id AND m2.id=z.membership_id WHERE z.invitation_id=inv.id AND z.user_id=uid AND m2.state='active';
   IF m.id IS NULL THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
   RETURN jsonb_build_object('membershipId',m.id,'agencyId',aid);
  END IF;
  IF inv.state<>'pending' OR inv.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'Expired invitation' USING ERRCODE='22023';END IF;
  IF NOT EXISTS(SELECT 1 FROM tenancy.memberships im JOIN identity.users iu ON iu.id=im.user_id WHERE im.agency_id=aid AND im.id=inv.invited_by_membership_id AND im.state='active' AND iu.state='active') OR NOT app_private.a1_owner(aid,inv.invited_by_membership_id) THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
  SELECT * INTO m FROM tenancy.memberships WHERE agency_id=aid AND user_id=uid;
  IF m.id IS NOT NULL AND m.state<>'active' THEN RAISE EXCEPTION 'Owner reactivation required' USING ERRCODE='42501';END IF;
  IF m.id IS NULL THEN INSERT INTO tenancy.memberships(id,agency_id,user_id,state) VALUES(gen_random_uuid(),aid,uid,'active') RETURNING * INTO m;END IF;
  INSERT INTO tenancy.membership_roles VALUES(aid,m.id,inv.role_id) ON CONFLICT DO NOTHING;
  UPDATE tenancy.membership_invitations SET state='accepted' WHERE id=inv.id;
  INSERT INTO app_private.a1_invitation_acceptances VALUES(inv.id,aid,m.id,uid);
  INSERT INTO tenancy.audit_events(agency_id,actor_membership_id,action,request_id,metadata) VALUES(aid,m.id,'team.accepted',inv.id,jsonb_build_object('invitationId',inv.id));
  RETURN jsonb_build_object('membershipId',m.id,'agencyId',aid);
 END IF;
 actor:=app_private.a1_member(aid);
 IF action='team' THEN
  UPDATE tenancy.membership_invitations SET state='expired' WHERE agency_id=aid AND state='pending' AND expires_at<=clock_timestamp();
  RETURN jsonb_build_object('canManage',app_private.a1_owner(aid,actor),
   'members',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',m.id,'userId',m.user_id,'email',CASE WHEN app_private.a1_owner(aid,actor) THEN (SELECT i.recipient_email FROM app_private.a1_invitation_acceptances z JOIN tenancy.membership_invitations i ON i.id=z.invitation_id WHERE z.agency_id=aid AND z.membership_id=m.id ORDER BY i.created_at DESC LIMIT 1) ELSE NULL END,'state',m.state,'revision',COALESCE(v.revision,0),'roles',COALESCE((SELECT jsonb_agg(mr.role_id) FROM tenancy.membership_roles mr WHERE mr.agency_id=aid AND mr.membership_id=m.id),'[]'),
    'signer',COALESCE(s.enabled,false),'signerName',COALESCE(s.name,''),'eligible',m.state='active' AND u.state='active' AND COALESCE(s.enabled,false) AND app_private.a1_capability(aid,m.id,'contracts.sign')) ORDER BY m.created_at,m.id)
    FROM tenancy.memberships m JOIN identity.users u ON u.id=m.user_id LEFT JOIN app_private.a1_member_versions v ON v.agency_id=aid AND v.membership_id=m.id LEFT JOIN app_private.agency_signers s ON s.agency_id=aid AND s.membership_id=m.id WHERE m.agency_id=aid),'[]'),
   'roles',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',q.id,'key',q.key,'name',q.name,'permissions',COALESCE((SELECT jsonb_agg(rp.permission_key ORDER BY rp.permission_key) FROM tenancy.role_permissions rp WHERE rp.agency_id=aid AND rp.role_id=q.id),'[]')) ORDER BY q.key) FROM tenancy.roles q WHERE q.agency_id=aid AND q.key<>'authorized_signer'),'[]'),
   'permissions',COALESCE((SELECT jsonb_agg(key ORDER BY key) FROM tenancy.permissions WHERE key<>'contracts.sign'),'[]'),
   'invitations',CASE WHEN app_private.a1_owner(aid,actor) THEN COALESCE((SELECT jsonb_agg(jsonb_build_object('id',i.id,'email',i.recipient_email,'roleId',i.role_id,'state',i.state,'expiresAt',i.expires_at,'deliveryState',(SELECT state FROM app_private.delivery_jobs WHERE agency_id=aid AND team_invitation_id=i.id)) ORDER BY i.created_at DESC) FROM tenancy.membership_invitations i WHERE i.agency_id=aid),'[]') ELSE '[]'::jsonb END);
 ELSIF action='invite-context' THEN
  IF NOT app_private.a1_owner(aid,actor) THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
  SELECT * INTO inv FROM tenancy.membership_invitations WHERE agency_id=aid AND id=(p->>'invitationId')::uuid;
  IF inv.id IS NULL OR inv.state<>'pending' OR inv.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'Invalid invitation' USING ERRCODE='22023';END IF;
  RETURN jsonb_build_object('id',inv.id,'email',inv.recipient_email,'digest',inv.token_digest,'expiresAt',inv.expires_at,'agencyName',(SELECT name FROM tenancy.agencies WHERE id=aid),'deliveryState',(SELECT state FROM app_private.delivery_jobs WHERE agency_id=aid AND team_invitation_id=inv.id));
 ELSIF action='branding' THEN
  SELECT * INTO b FROM app_private.agency_branding WHERE agency_id=aid;
  RETURN jsonb_build_object('revision',COALESCE(b.revision,0),'profile',COALESCE(b.profile,'{}'),'logoData',b.logo_data,'logoKey',b.logo_key,'canManage',app_private.a1_owner(aid,actor),'unattachedUploads',(SELECT count(*) FROM app_private.agency_logo_objects WHERE agency_id=aid AND state='reserved'));
 ELSIF action='rental' THEN
  target:=(p->>'rentalId')::uuid;SELECT * INTO r FROM tenancy.rental_contracts WHERE agency_id=aid AND id=target;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Missing' USING ERRCODE='P0002';END IF;
  SELECT * INTO o FROM app_private.rental_operations WHERE agency_id=aid AND rental_id=target;
  RETURN app_private.a1_payment_summary(aid,target)||jsonb_build_object('totalMinor',r.total_minor::text,'revision',COALESCE(o.revision,0),'state',r.state,'canPay',app_private.a1_owner(aid,actor) OR app_private.a1_capability(aid,actor,'rentals.payments'),
   'locations',CASE WHEN o.pickup IS NULL THEN NULL ELSE jsonb_build_object('pickup',o.pickup,'returnLocation',o.return_location) END,'signerId',o.signer_id,
   'eligibleSigners',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',s.membership_id,'name',s.name) ORDER BY s.name) FROM app_private.agency_signers s JOIN tenancy.memberships m ON m.agency_id=s.agency_id AND m.id=s.membership_id JOIN identity.users u ON u.id=m.user_id WHERE s.agency_id=aid AND s.enabled AND m.state='active' AND u.state='active' AND app_private.a1_capability(aid,m.id,'contracts.sign')),'[]'),
   'payments',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'kind',kind,'amountMinor',amount_minor::text,'method',method,'date',payment_date,'reference',reference,'reason',reason,'reverses',reverses,'createdAt',created_at) ORDER BY sequence) FROM app_private.rental_payments WHERE agency_id=aid AND rental_id=target),'[]'));
 END IF;
 req:=(p->>'requestId')::uuid;IF req IS NULL THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
 IF action NOT IN('rental-create','locations','signer-select','payment') AND NOT app_private.a1_owner(aid,actor) THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
 IF action='payment' AND NOT(app_private.a1_owner(aid,actor) OR app_private.a1_capability(aid,actor,'rentals.payments')) THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
 SELECT q.* INTO old_receipt FROM app_private.a1_receipts q WHERE q.agency_id=aid AND q.actor=cmd.actor AND q.request_id=req;
 IF old_receipt.request_id IS NOT NULL THEN IF old_receipt.input IS DISTINCT FROM body THEN RAISE EXCEPTION 'Request conflict' USING ERRCODE='40001';END IF;RETURN old_receipt.result;END IF;
 IF action='invite' THEN
  role_id:=(p->>'roleId')::uuid;
  IF NOT EXISTS(SELECT 1 FROM tenancy.roles WHERE agency_id=aid AND id=role_id AND key<>'authorized_signer') OR length(p->>'email') NOT BETWEEN 3 AND 254 OR p->>'email'!~'^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' OR p->>'digest'!~'^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid invitation' USING ERRCODE='22023';END IF;
  IF (SELECT count(*) FROM tenancy.membership_invitations WHERE agency_id=aid AND created_at>clock_timestamp()-interval '1 hour')>=100 THEN RAISE EXCEPTION 'Invitation limit' USING ERRCODE='PBL01';END IF;
  INSERT INTO tenancy.membership_invitations(id,agency_id,role_id,invited_by_membership_id,recipient_email,token_digest,expires_at) VALUES(req,aid,role_id,actor,lower(p->>'email'),p->>'digest',clock_timestamp()+interval '7 days') RETURNING * INTO inv;
  result:=jsonb_build_object('id',inv.id,'expiresAt',inv.expires_at,'email',inv.recipient_email,'state',inv.state);
 ELSIF action='invite-email' THEN
  SELECT * INTO inv FROM tenancy.membership_invitations WHERE agency_id=aid AND id=(p->>'invitationId')::uuid FOR UPDATE;
  IF inv.id IS NULL OR inv.state<>'pending' OR inv.expires_at<=clock_timestamp() OR (p->'envelope'->>'expiresAt')::timestamptz IS DISTINCT FROM inv.expires_at OR pg_column_size(p->'envelope')>=65536 THEN RAISE EXCEPTION 'Invalid invitation' USING ERRCODE='22023';END IF;
  target:=(p->>'jobId')::uuid;
  IF NOT EXISTS(SELECT 1 FROM app_private.delivery_jobs WHERE agency_id=aid AND team_invitation_id=inv.id) THEN
   INSERT INTO app_private.delivery_jobs(id,agency_id,session_id,team_invitation_id,event_key,purpose,channel,checksum,intent_hash,expires_at)
    VALUES(target,aid,NULL,inv.id,'team:'||inv.id::text,'team-invitation','email',inv.token_digest,inv.token_digest,inv.expires_at);
   INSERT INTO app_private.delivery_payloads VALUES(target,aid,p->'envelope');
  END IF;
  result:=jsonb_build_object('state',(SELECT state FROM app_private.delivery_jobs WHERE agency_id=aid AND team_invitation_id=inv.id));
 ELSIF action='invite-revoke' THEN
  UPDATE tenancy.membership_invitations SET state='revoked' WHERE agency_id=aid AND id=(p->>'invitationId')::uuid AND state='pending';IF NOT FOUND THEN RAISE EXCEPTION 'Missing' USING ERRCODE='P0002';END IF;result:='true';
 ELSIF action IN('member-state','member-role','signer-grant') THEN
  target:=(p->>'membershipId')::uuid;SELECT * INTO m FROM tenancy.memberships WHERE agency_id=aid AND id=target FOR UPDATE;
  IF m.id IS NULL THEN RAISE EXCEPTION 'Missing' USING ERRCODE='P0002';END IF;
  INSERT INTO app_private.a1_member_versions VALUES(aid,target,0) ON CONFLICT DO NOTHING;
  SELECT revision INTO rev FROM app_private.a1_member_versions WHERE agency_id=aid AND membership_id=target FOR UPDATE;
  IF rev IS DISTINCT FROM (p->>'revision')::integer THEN RAISE EXCEPTION 'Stale member' USING ERRCODE='40001';END IF;
  IF action='member-state' THEN
   IF p->>'state' NOT IN('active','revoked') THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
   IF target=actor AND p->>'state'='revoked' THEN RAISE EXCEPTION 'Another owner must deactivate this membership' USING ERRCODE='42501';END IF;
   UPDATE tenancy.memberships SET state=p->>'state' WHERE agency_id=aid AND id=target;
   IF p->>'state'='revoked' THEN UPDATE app_private.agency_signers SET enabled=false WHERE agency_id=aid AND membership_id=target;PERFORM app_private.a1_revoke_signer(aid,target);END IF;
  ELSIF action='member-role' THEN
   role_id:=(p->>'roleId')::uuid;SELECT key INTO role_key FROM tenancy.roles WHERE agency_id=aid AND id=role_id;
   IF role_key IS NULL OR role_key='authorized_signer' THEN RAISE EXCEPTION 'Invalid role' USING ERRCODE='22023';END IF;
   DELETE FROM tenancy.membership_roles mr USING tenancy.roles q WHERE mr.agency_id=aid AND mr.membership_id=target AND q.agency_id=aid AND q.id=mr.role_id AND q.key<>'authorized_signer';
   INSERT INTO tenancy.membership_roles VALUES(aid,target,role_id) ON CONFLICT DO NOTHING;
   IF NOT app_private.a1_capability(aid,target,'contracts.sign') THEN UPDATE app_private.agency_signers SET enabled=false WHERE agency_id=aid AND membership_id=target;PERFORM app_private.a1_revoke_signer(aid,target);END IF;
  ELSE
   IF jsonb_typeof(p->'enabled') IS DISTINCT FROM 'boolean' OR m.state<>'active' OR NOT EXISTS(SELECT 1 FROM identity.users WHERE id=m.user_id AND state='active') OR length(btrim(p->>'name')) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Invalid signer' USING ERRCODE='22023';END IF;
   INSERT INTO tenancy.roles(id,agency_id,key,name) VALUES(gen_random_uuid(),aid,'authorized_signer','Authorized signer') ON CONFLICT(agency_id,key) DO NOTHING;
   SELECT id INTO role_id FROM tenancy.roles WHERE agency_id=aid AND key='authorized_signer';
   INSERT INTO tenancy.role_permissions VALUES(aid,role_id,'contracts.sign') ON CONFLICT DO NOTHING;
   INSERT INTO app_private.agency_signers VALUES(aid,target,(p->>'enabled')::boolean,btrim(p->>'name')) ON CONFLICT(agency_id,membership_id) DO UPDATE SET enabled=EXCLUDED.enabled,name=EXCLUDED.name;
   IF (p->>'enabled')::boolean THEN INSERT INTO tenancy.membership_roles VALUES(aid,target,role_id) ON CONFLICT DO NOTHING;
   ELSE DELETE FROM tenancy.membership_roles q WHERE q.agency_id=aid AND q.membership_id=target AND q.role_id=cmd.role_id;PERFORM app_private.a1_revoke_signer(aid,target);END IF;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM tenancy.memberships m2 JOIN tenancy.membership_roles mr ON mr.agency_id=m2.agency_id AND mr.membership_id=m2.id JOIN tenancy.roles q ON q.agency_id=mr.agency_id AND q.id=mr.role_id JOIN identity.users u ON u.id=m2.user_id WHERE m2.agency_id=aid AND m2.state='active' AND u.state='active' AND q.key='owner' AND app_private.a1_capability(aid,m2.id,'agency.manage')) THEN RAISE EXCEPTION 'Last owner' USING ERRCODE='42501';END IF;
  UPDATE app_private.a1_member_versions SET revision=revision+1 WHERE agency_id=aid AND membership_id=target RETURNING revision INTO rev;result:=jsonb_build_object('revision',rev);
 ELSIF action='role-save' THEN
  role_id:=(p->>'roleId')::uuid;role_key:=p->>'key';
  IF role_key IS NULL OR role_key!~'^[a-z][a-z0-9_.-]{0,63}$' OR role_key IN('owner','authorized_signer') OR length(btrim(p->>'name')) NOT BETWEEN 1 AND 100 OR jsonb_typeof(p->'permissions') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid role' USING ERRCODE='22023';END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(p->'permissions') v WHERE v='contracts.sign' OR NOT EXISTS(SELECT 1 FROM tenancy.permissions WHERE key=v)) THEN RAISE EXCEPTION 'Invalid permission' USING ERRCODE='42501';END IF;
  IF EXISTS(SELECT 1 FROM tenancy.roles WHERE id=role_id AND (agency_id<>aid OR key<>role_key)) THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
  INSERT INTO tenancy.roles(id,agency_id,key,name) VALUES(role_id,aid,role_key,btrim(p->>'name')) ON CONFLICT(agency_id,key) DO NOTHING;
  IF NOT EXISTS(SELECT 1 FROM tenancy.roles WHERE agency_id=aid AND id=role_id AND key=role_key) THEN RAISE EXCEPTION 'Role conflict' USING ERRCODE='40001';END IF;
  UPDATE tenancy.roles SET name=btrim(p->>'name') WHERE agency_id=aid AND id=role_id;
  DELETE FROM tenancy.role_permissions q WHERE q.agency_id=aid AND q.role_id=cmd.role_id;
  INSERT INTO tenancy.role_permissions SELECT aid,role_id,v FROM jsonb_array_elements_text(p->'permissions') v;
  FOR x IN SELECT s.membership_id FROM app_private.agency_signers s WHERE s.agency_id=aid AND s.enabled AND NOT app_private.a1_capability(aid,s.membership_id,'contracts.sign') LOOP
   UPDATE app_private.agency_signers SET enabled=false WHERE agency_id=aid AND membership_id=x.membership_id;PERFORM app_private.a1_revoke_signer(aid,x.membership_id);
  END LOOP;
  result:=jsonb_build_object('id',role_id);
 ELSIF action IN('branding-save','logo-reserve','logo-set','logo-remove') THEN
  INSERT INTO app_private.agency_branding(agency_id) VALUES(aid) ON CONFLICT DO NOTHING;
  SELECT * INTO b FROM app_private.agency_branding WHERE agency_id=aid FOR UPDATE;
  IF b.revision IS DISTINCT FROM (p->>'revision')::integer THEN RAISE EXCEPTION 'Stale branding' USING ERRCODE='40001';END IF;
  IF action='branding-save' THEN
   IF jsonb_typeof(p->'profile')<>'object' OR length(btrim(p->'profile'->>'legalName')) NOT BETWEEN 1 AND 200 OR pg_column_size(p->'profile')>3000 OR p->'profile'->>'primary'!~'^#[a-fA-F0-9]{6}$' OR p->'profile'->>'accent'!~'^#[a-fA-F0-9]{6}$' THEN RAISE EXCEPTION 'Invalid branding' USING ERRCODE='22023';END IF;
   UPDATE app_private.agency_branding SET profile=p->'profile',revision=revision+1 WHERE agency_id=aid;
  ELSIF action='logo-reserve' THEN
   IF p->>'key' IS NULL OR p->>'checksum'!~'^[a-f0-9]{64}$' OR p->>'key' IS DISTINCT FROM aid::text||'/originals/'||req::text||'/'||(p->>'checksum')||'.png' THEN RAISE EXCEPTION 'Invalid logo' USING ERRCODE='22023';END IF;
   IF EXISTS(SELECT 1 FROM app_private.agency_logo_objects WHERE agency_id=aid AND branding_revision=b.revision AND state='reserved' AND key<>p->>'key') THEN RAISE EXCEPTION 'Another logo upload is pending for this revision' USING ERRCODE='40001';END IF;
   INSERT INTO app_private.agency_logo_objects(agency_id,key,checksum,branding_revision) VALUES(aid,p->>'key',p->>'checksum',b.revision) ON CONFLICT DO NOTHING;
  ELSIF action='logo-set' THEN
   IF NOT EXISTS(SELECT 1 FROM app_private.agency_logo_objects WHERE agency_id=aid AND key=p->>'key' AND checksum=p->>'checksum') OR length(p->>'data')>275000 OR p->>'data'!~'^data:image/png;base64,[A-Za-z0-9+/]+=*$' OR encode(sha256(decode(substr(p->>'data',23),'base64')),'hex') IS DISTINCT FROM p->>'checksum' THEN RAISE EXCEPTION 'Invalid logo' USING ERRCODE='22023';END IF;
   UPDATE app_private.agency_branding SET logo_key=p->>'key',logo_data=p->>'data',logo_checksum=p->>'checksum',revision=revision+1 WHERE agency_id=aid;
   UPDATE app_private.agency_logo_objects SET state='attached' WHERE agency_id=aid AND key=p->>'key';
  ELSE UPDATE app_private.agency_branding SET logo_key=NULL,logo_data=NULL,logo_checksum=NULL,revision=revision+1 WHERE agency_id=aid;END IF;
  result:=jsonb_build_object('revision',CASE WHEN action='logo-reserve' THEN b.revision ELSE b.revision+1 END);
 ELSIF action IN('rental-create','locations','signer-select','payment') THEN
  -- Lock order agrees with document/signing operations: agency documents -> rental -> outbox.
  PERFORM pg_advisory_xact_lock(hashtextextended('documents:'||aid::text,0));
  IF action='rental-create' THEN
   result:=public.contratpro_rental_create(aid,req,p->'details');target:=(result->>'id')::uuid;
  ELSE target:=(p->>'rentalId')::uuid;END IF;
  SELECT * INTO r FROM tenancy.rental_contracts WHERE agency_id=aid AND id=target FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Missing' USING ERRCODE='P0002';END IF;
  INSERT INTO app_private.rental_operations(agency_id,rental_id) VALUES(aid,target) ON CONFLICT DO NOTHING;
  SELECT * INTO o FROM app_private.rental_operations WHERE agency_id=aid AND rental_id=target FOR UPDATE;
  IF action<>'rental-create' AND o.revision IS DISTINCT FROM (p->>'revision')::integer THEN RAISE EXCEPTION 'Stale operations' USING ERRCODE='40001';END IF;
  IF action IN('rental-create','locations') THEN
   IF r.state<>'brouillon' OR length(btrim(p->'locations'->>'pickup')) NOT BETWEEN 1 AND 400 OR length(btrim(p->'locations'->>'returnLocation')) NOT BETWEEN 1 AND 400 OR p->'locations'->>'pickup'~'[[:cntrl:]]' OR p->'locations'->>'returnLocation'~'[[:cntrl:]]' THEN RAISE EXCEPTION 'Invalid locations' USING ERRCODE='22023';END IF;
   UPDATE app_private.rental_operations SET pickup=btrim(p->'locations'->>'pickup'),return_location=btrim(p->'locations'->>'returnLocation'),revision=revision+1 WHERE agency_id=aid AND rental_id=target;
   IF action='locations' THEN UPDATE tenancy.rental_contracts SET version=version+1,updated_at=clock_timestamp() WHERE agency_id=aid AND id=target;END IF;
  ELSIF action='signer-select' THEN
   IF r.state NOT IN('brouillon','confirme') THEN RAISE EXCEPTION 'Invalid lifecycle' USING ERRCODE='22023';END IF;
   IF NOT EXISTS(SELECT 1 FROM app_private.agency_signers s JOIN tenancy.memberships m ON m.agency_id=s.agency_id AND m.id=s.membership_id JOIN identity.users u ON u.id=m.user_id WHERE s.agency_id=aid AND s.membership_id=(p->>'membershipId')::uuid AND s.enabled AND m.state='active' AND u.state='active' AND app_private.a1_capability(aid,m.id,'contracts.sign')) THEN RAISE EXCEPTION 'Invalid signer' USING ERRCODE='42501';END IF;
   IF EXISTS(SELECT 1 FROM app_private.signing_sessions WHERE agency_id=aid AND rental_id=target AND state NOT IN('completed','expired','declined','cancelled','failed')) THEN RAISE EXCEPTION 'Signing in progress' USING ERRCODE='40001';END IF;
   UPDATE app_private.rental_operations SET signer_id=(p->>'membershipId')::uuid,revision=revision+1 WHERE agency_id=aid AND rental_id=target;
  ELSE
   IF p->'payment'->>'amountMinor'!~'^[1-9][0-9]{0,17}$' OR p->'payment'->>'date'!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' OR p->'payment'->>'method' NOT IN('cash','bank-transfer','card','cheque','other') OR length(p->'payment'->>'reference')>120 OR length(p->'payment'->>'reason')>400 THEN RAISE EXCEPTION 'Invalid payment' USING ERRCODE='22023';END IF;
   n:=(p->'payment'->>'amountMinor')::bigint;pd:=0;dd:=0;
   IF p->'payment'->>'kind' IN('advance','payment') THEN pd:=n;
   ELSIF p->'payment'->>'kind'='deposit-in' THEN dd:=n;
   ELSIF p->'payment'->>'kind'='deposit-out' THEN dd:=-n;
   ELSIF p->'payment'->>'kind'='reversal' THEN
    SELECT * INTO entry FROM app_private.rental_payments WHERE agency_id=aid AND rental_id=target AND id=(p->'payment'->>'reverses')::uuid;
    IF entry.id IS NULL OR entry.kind='reversal' OR entry.amount_minor<>n OR EXISTS(SELECT 1 FROM app_private.rental_payments WHERE reverses=entry.id) OR length(btrim(p->'payment'->>'reason'))=0 THEN RAISE EXCEPTION 'Invalid reversal' USING ERRCODE='22023';END IF;
    pd:=-entry.paid_delta;dd:=-entry.deposit_delta;
   ELSE RAISE EXCEPTION 'Invalid kind' USING ERRCODE='22023';END IF;
   SELECT COALESCE(sum(paid_delta),0)+pd,COALESCE(sum(deposit_delta),0)+dd INTO paid,held FROM app_private.rental_payments WHERE agency_id=aid AND rental_id=target;
   IF paid<0 OR paid>r.total_minor OR held<0 OR held>r.deposit_minor OR (r.state='annule' AND (pd>0 OR dd>0) AND p->'payment'->>'kind'<>'reversal') THEN RAISE EXCEPTION 'Invalid balance' USING ERRCODE='22023';END IF;
   INSERT INTO app_private.rental_payments(id,agency_id,rental_id,sequence,actor,kind,amount_minor,paid_delta,deposit_delta,method,payment_date,reference,reason,reverses)
    VALUES(req,aid,target,o.revision+1,actor,p->'payment'->>'kind',n,pd,dd,p->'payment'->>'method',(p->'payment'->>'date')::date,p->'payment'->>'reference',p->'payment'->>'reason',(p->'payment'->>'reverses')::uuid);
   UPDATE app_private.rental_operations SET revision=revision+1 WHERE agency_id=aid AND rental_id=target;
  END IF;
  IF action<>'rental-create' THEN result:=jsonb_build_object('id',target,'revision',o.revision+1);END IF;
 ELSE RAISE EXCEPTION 'Invalid action' USING ERRCODE='22023';END IF;
 INSERT INTO tenancy.audit_events(agency_id,actor_membership_id,action,request_id,metadata) VALUES(aid,actor,'a1.'||action,req,jsonb_build_object('resourceId',target));
 INSERT INTO app_private.a1_receipts VALUES(aid,actor,req,body,result);RETURN result;
END $f$;

-- Reuse the existing contract-documents bucket, request-JWT object policies and
-- billing storage accounting. Removal detaches the current logo; historical
-- originals/snapshots remain retained, never overwritten or silently deleted.
UPDATE storage.buckets SET allowed_mime_types=array_append(allowed_mime_types,'image/png') WHERE id='contract-documents';
CREATE FUNCTION public.contratpro_agency_logo_access(p_key text,p_write boolean) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE aid uuid;mid uuid;BEGIN
 IF p_key!~'^[a-f0-9-]{36}/originals/[a-f0-9-]{36}/[a-f0-9]{64}[.]png$' THEN RETURN false;END IF;
 aid:=split_part(p_key,'/',1)::uuid;PERFORM set_config('contratpro.a1_agency',aid::text,true);mid:=app_private.a1_member(aid);
 RETURN (NOT p_write OR app_private.a1_owner(aid,mid)) AND EXISTS(SELECT 1 FROM app_private.agency_logo_objects WHERE agency_id=aid AND key=p_key);
 EXCEPTION WHEN invalid_text_representation OR insufficient_privilege THEN RETURN false;
END $f$;
CREATE POLICY a1_logo_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='contract-documents' AND public.contratpro_agency_logo_access(name,false));
CREATE POLICY a1_logo_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='contract-documents' AND public.contratpro_agency_logo_access(name,true));

-- Existing signing-capability holders are explicitly represented, preserving the
-- baseline without giving every owner signing rights.
INSERT INTO app_private.agency_signers(agency_id,membership_id,enabled,name)
 SELECT DISTINCT m.agency_id,m.id,true,'Existing authorized signer' FROM tenancy.memberships m
 JOIN tenancy.membership_roles mr ON mr.agency_id=m.agency_id AND mr.membership_id=m.id JOIN tenancy.role_permissions rp ON rp.agency_id=mr.agency_id AND rp.role_id=mr.role_id
 WHERE m.state='active' AND rp.permission_key='contracts.sign';
GRANT SELECT ON app_private.agency_signers,app_private.rental_operations,app_private.agency_branding,app_private.rental_payments TO contratpro_rental_writer;
DO $rental_read$ DECLARE t text;BEGIN
 FOREACH t IN ARRAY ARRAY['agency_signers','rental_operations','agency_branding','rental_payments'] LOOP
  EXECUTE format('CREATE POLICY a1_rental_read ON app_private.%I FOR SELECT TO contratpro_rental_writer USING(app_private.rental_member(agency_id) IS NOT NULL)',t);
 END LOOP;END $rental_read$;
CREATE OR REPLACE FUNCTION app_private.signing_allowed(aid uuid) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE actor uuid;BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('documents:'||aid::text,0));actor:=app_private.rental_member(aid);
 IF NOT EXISTS(SELECT 1 FROM app_private.agency_signers WHERE agency_id=aid AND membership_id=actor AND enabled) OR NOT EXISTS(
 SELECT 1 FROM tenancy.membership_roles mr JOIN tenancy.role_permissions rp ON rp.agency_id=mr.agency_id AND rp.role_id=mr.role_id WHERE mr.agency_id=aid AND mr.membership_id=actor AND rp.permission_key='contracts.sign') THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
 RETURN actor;END $f$;
CREATE FUNCTION app_private.a1_signer_selection_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE selected uuid;BEGIN
 PERFORM set_config('contratpro.a1_agency',NEW.agency_id::text,true);
 SELECT signer_id INTO selected FROM app_private.rental_operations WHERE agency_id=NEW.agency_id AND rental_id=NEW.rental_id;
 IF selected IS NOT NULL AND selected<>NEW.agency_member_id THEN RAISE EXCEPTION 'Assigned signer required' USING ERRCODE='42501';END IF;
 IF NOT EXISTS(SELECT 1 FROM app_private.agency_signers s JOIN tenancy.memberships m ON m.agency_id=s.agency_id AND m.id=s.membership_id JOIN identity.users u ON u.id=m.user_id WHERE s.agency_id=NEW.agency_id AND s.membership_id=NEW.agency_member_id AND s.enabled AND m.state='active' AND u.state='active') THEN RAISE EXCEPTION 'Signer unavailable' USING ERRCODE='42501';END IF;
 RETURN NEW;END $f$;
CREATE TRIGGER a1_signer_selection BEFORE INSERT ON app_private.signing_sessions FOR EACH ROW EXECUTE FUNCTION app_private.a1_signer_selection_guard();

-- Capture the existing parties exactly once, with current authorized branding.
-- Later party/profile/logo changes cannot rewrite this immutable version table.
CREATE OR REPLACE FUNCTION app_private.rental_document_capture() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE base jsonb;parties jsonb;secondary uuid;o app_private.rental_operations;b app_private.agency_branding;pay jsonb;BEGIN
 IF NEW.number_serial IS NULL THEN RETURN NEW;END IF;
 SELECT payload INTO base FROM app_private.rental_document_versions WHERE agency_id=NEW.agency_id AND contract_id=NEW.id ORDER BY version DESC LIMIT 1;
 IF base IS NULL AND TG_OP='UPDATE' AND OLD.number_serial IS NOT NULL THEN RETURN NEW;END IF;
 SELECT * INTO o FROM app_private.rental_operations WHERE agency_id=NEW.agency_id AND rental_id=NEW.id;
 IF base IS NULL THEN
  SELECT * INTO b FROM app_private.agency_branding WHERE agency_id=NEW.agency_id;
  SELECT secondary_client_id INTO secondary FROM app_private.rental_drivers WHERE agency_id=NEW.agency_id AND contract_id=NEW.id;
  SELECT jsonb_build_object('agency',jsonb_build_object('name',a.name,'ice',a.ice,'ifNumber',a.if_number,'rc',a.rc,'address',a.address,'city',a.city,'phone',a.phone,'email',a.email)||COALESCE(b.profile,'{}')||jsonb_build_object('logoData',b.logo_data,'brandingRevision',b.revision),
   'primaryDriver',app_private.rental_driver_payload(NEW.agency_id,NEW.client_id),'secondaryDriver',CASE WHEN secondary IS NULL THEN NULL ELSE app_private.rental_driver_payload(NEW.agency_id,secondary) END,
   'vehicle',jsonb_build_object('id',v.id,'registrationNumber',v.registration,'make',v.make,'model',v.model,'year',v.model_year,'mileage',v.mileage)) INTO parties
  FROM tenancy.agencies a JOIN tenancy.vehicles v ON v.agency_id=a.id AND v.id=NEW.vehicle_id WHERE a.id=NEW.agency_id;
 ELSE parties:=base->'parties';END IF;
 SELECT jsonb_build_object('paidMinor',COALESCE(sum(paid_delta),0)::text,'remainingMinor',(NEW.total_minor-COALESCE(sum(paid_delta),0))::text,'depositHeldMinor',COALESCE(sum(deposit_delta),0)::text,
  'lastOperation',(SELECT jsonb_build_object('kind',q.kind,'amountMinor',q.amount_minor::text,'method',q.method,'date',q.payment_date,'reference',q.reference) FROM app_private.rental_payments q WHERE q.agency_id=NEW.agency_id AND q.rental_id=NEW.id ORDER BY sequence DESC LIMIT 1)) INTO pay FROM app_private.rental_payments WHERE agency_id=NEW.agency_id AND rental_id=NEW.id;
 INSERT INTO app_private.rental_document_versions VALUES(NEW.agency_id,NEW.id,NEW.version,jsonb_build_object('schemaVersion',1,'agencyId',NEW.agency_id,'rentalId',NEW.id,'version',NEW.version,'number',NEW.contract_number,'parties',parties,
  'terms',jsonb_build_object('start',NEW.starts_at,'end',NEW.ends_at,'dailyRateMinor',NEW.daily_rate_minor::text,'depositMinor',NEW.deposit_minor::text,'totalMinor',NEW.total_minor::text,'billableDays',NEW.billable_days,'currency',NEW.currency,'state',NEW.state,
    'pickup',o.pickup,'returnLocation',o.return_location,'payment',pay::text,'paidMinor',pay->>'paidMinor','remainingMinor',pay->>'remainingMinor','depositHeldMinor',pay->>'depositHeldMinor','paymentMethod',pay->'lastOperation'->>'method','paymentDate',pay->'lastOperation'->>'date','paymentReference',pay->'lastOperation'->>'reference'),
  'templateRevision',NULL,'signatures',jsonb_build_object('order',jsonb_build_array('agency','client'),'agency',NULL,'client',NULL),'evidence',NULL,'sheets',jsonb_build_object('eventKey',NEW.agency_id::text||':'||NEW.id::text||':'||NEW.version::text)));
 RETURN NEW;END $f$;
CREATE FUNCTION app_private.a1_rental_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE o app_private.rental_operations;paid bigint;held bigint;BEGIN
 PERFORM set_config('contratpro.a1_agency',NEW.agency_id::text,true);
 IF OLD.state='brouillon' AND NEW.state='confirme' THEN
  SELECT * INTO o FROM app_private.rental_operations WHERE agency_id=NEW.agency_id AND rental_id=NEW.id;
  IF o.pickup IS NULL OR o.return_location IS NULL THEN RAISE EXCEPTION 'Complete pickup and return locations before confirmation' USING ERRCODE='22023';END IF;
 END IF;
 SELECT COALESCE(sum(paid_delta),0),COALESCE(sum(deposit_delta),0) INTO paid,held FROM app_private.rental_payments WHERE agency_id=NEW.agency_id AND rental_id=NEW.id;
 IF NEW.total_minor<paid OR NEW.deposit_minor<held THEN RAISE EXCEPTION 'Terms conflict with recorded money' USING ERRCODE='22023';END IF;RETURN NEW;END $f$;
CREATE TRIGGER a1_rental_guard BEFORE UPDATE ON tenancy.rental_contracts FOR EACH ROW EXECUTE FUNCTION app_private.a1_rental_guard();

-- Payment accounting has its own revision. It must neither invalidate a signature
-- nor mutate an issued contract. Reuse 0019 heads/events/jobs for same-row exports.
CREATE FUNCTION app_private.a1_payment_sync() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE seq bigint;rv integer;BEGIN
 PERFORM set_config('contratpro.sheets_agency',NEW.agency_id::text,true);
 SELECT version INTO STRICT rv FROM tenancy.rental_contracts WHERE agency_id=NEW.agency_id AND id=NEW.rental_id;
 INSERT INTO app_private.sheets_heads AS h(agency_id,contract_id,sequence,rental_version) VALUES(NEW.agency_id,NEW.rental_id,1,rv)
 ON CONFLICT(agency_id,contract_id) DO UPDATE SET sequence=h.sequence+1 RETURNING sequence INTO seq;
 INSERT INTO app_private.sheets_events(agency_id,contract_id,sequence,kind) VALUES(NEW.agency_id,NEW.rental_id,seq,'rental:payment');
 INSERT INTO app_private.sheets_jobs AS j(agency_id,contract_id,desired) VALUES(NEW.agency_id,NEW.rental_id,seq)
 ON CONFLICT(agency_id,contract_id) DO UPDATE SET desired=seq,state=CASE WHEN j.state IN('processing','reconciliation-required') THEN j.state ELSE 'pending' END,
  attempts=CASE WHEN j.state IN('processing','reconciliation-required') THEN j.attempts ELSE 0 END,not_before=clock_timestamp();RETURN NEW;END $f$;
CREATE TRIGGER a1_payment_sync AFTER INSERT ON app_private.rental_payments FOR EACH ROW EXECUTE FUNCTION app_private.a1_payment_sync();
ALTER FUNCTION app_private.sheets_snapshot(uuid,uuid) RENAME TO sheets_snapshot_before_a1;
CREATE FUNCTION app_private.sheets_snapshot(aid uuid,cid uuid) RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE result jsonb;o app_private.rental_operations;pay jsonb;BEGIN
 result:=app_private.sheets_snapshot_before_a1(aid,cid);
 SELECT * INTO o FROM app_private.rental_operations WHERE agency_id=aid AND rental_id=cid;
 pay:=app_private.a1_payment_summary(aid,cid);
 RETURN jsonb_set(result,'{values}',result->'values'||jsonb_build_object('pickup',COALESCE(o.pickup,''),'returnLocation',COALESCE(o.return_location,''),'payment',pay::text));END $f$;
GRANT SELECT ON app_private.rental_operations,app_private.rental_payments TO contratpro_sheets_worker;
CREATE POLICY a1_sheets_read ON app_private.rental_operations FOR SELECT TO contratpro_sheets_worker USING(agency_id=nullif(current_setting('contratpro.sheets_agency',true),'')::uuid);
CREATE POLICY a1_sheets_read ON app_private.rental_payments FOR SELECT TO contratpro_sheets_worker USING(agency_id=nullif(current_setting('contratpro.sheets_agency',true),'')::uuid);
GRANT EXECUTE ON FUNCTION app_private.a1_payment_summary(uuid,uuid) TO contratpro_sheets_worker;

CREATE FUNCTION app_private.a1_team_delivery_valid(j app_private.delivery_jobs) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE i tenancy.membership_invitations;BEGIN
 PERFORM set_config('contratpro.a1_agency',j.agency_id::text,true);
 SELECT * INTO i FROM tenancy.membership_invitations WHERE agency_id=j.agency_id AND id=j.team_invitation_id FOR SHARE;
 RETURN NOT j.obsolete AND j.expires_at>clock_timestamp() AND i.id IS NOT NULL AND i.state='pending' AND i.expires_at>clock_timestamp() AND i.token_digest=j.checksum
 AND EXISTS(SELECT 1 FROM tenancy.memberships im JOIN identity.users iu ON iu.id=im.user_id WHERE im.agency_id=j.agency_id AND im.id=i.invited_by_membership_id AND im.state='active' AND iu.state='active') AND app_private.a1_owner(j.agency_id,i.invited_by_membership_id)
 AND EXISTS(SELECT 1 FROM tenancy.agencies WHERE id=j.agency_id AND state='active');END $f$;
CREATE FUNCTION app_private.a1_team_delivery_audit(j app_private.delivery_jobs,observation text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE inviter uuid;
BEGIN
 PERFORM set_config('contratpro.a1_agency',j.agency_id::text,true);
 SELECT invited_by_membership_id INTO STRICT inviter FROM tenancy.membership_invitations WHERE agency_id=j.agency_id AND id=j.team_invitation_id;
 INSERT INTO tenancy.audit_events(agency_id,actor_membership_id,action,request_id,metadata) VALUES(j.agency_id,inviter,'team.delivery',j.id,jsonb_build_object('invitationId',j.team_invitation_id,'jobId',j.id,'observation',observation,'performedBy','delivery-worker','initiatedByMembershipId',inviter));
END $f$;
ALTER FUNCTION app_private.delivery_view(app_private.delivery_jobs) RENAME TO delivery_view_before_a1;
CREATE FUNCTION app_private.delivery_view(j app_private.delivery_jobs) RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $f$
 SELECT app_private.delivery_view_before_a1(j)||jsonb_build_object('sessionId',COALESCE(j.session_id,j.team_invitation_id))
$f$;
ALTER FUNCTION app_private.delivery_valid(app_private.delivery_jobs) RENAME TO delivery_valid_before_a1;
CREATE FUNCTION app_private.delivery_valid(j app_private.delivery_jobs) RETURNS boolean LANGUAGE sql SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
 SELECT CASE WHEN j.team_invitation_id IS NOT NULL THEN app_private.a1_team_delivery_valid(j) ELSE app_private.delivery_valid_before_a1(j) END
$f$;
ALTER FUNCTION app_private.delivery_observe(uuid,text,text) RENAME TO delivery_observe_before_a1;
CREATE FUNCTION app_private.delivery_observe(jid uuid,target text,event_ref text) RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE j app_private.delivery_jobs;old_rank integer;new_rank integer;BEGIN
 SELECT * INTO j FROM app_private.delivery_jobs WHERE id=jid FOR UPDATE;
 IF j.team_invitation_id IS NULL THEN PERFORM app_private.delivery_observe_before_a1(jid,target,event_ref);RETURN;END IF;
 old_rank:=CASE j.state WHEN 'accepted' THEN 1 WHEN 'delivered' THEN 2 WHEN 'failed' THEN 3 WHEN 'bounced' THEN 4 ELSE 0 END;
 new_rank:=CASE target WHEN 'accepted' THEN 1 WHEN 'delivered' THEN 2 WHEN 'failed' THEN 3 WHEN 'bounced' THEN 4 ELSE 0 END;
 IF new_rank>=old_rank AND j.state<>'cancelled' THEN UPDATE app_private.delivery_jobs SET state=target,retryable=false,error_code=CASE WHEN target IN('failed','bounced') THEN 'provider-'||target ELSE NULL END WHERE id=jid;END IF;
 PERFORM app_private.a1_team_delivery_audit(j,target);END $f$;
ALTER FUNCTION app_private.delivery_command(uuid,uuid,text,jsonb) RENAME TO delivery_command_before_a1;
CREATE FUNCTION app_private.delivery_command(aid uuid,actor uuid,action text,p jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE j app_private.delivery_jobs;x record;envelope jsonb;target text;result jsonb;BEGIN
 IF action='claim' THEN
  FOR j IN SELECT * FROM app_private.delivery_jobs WHERE team_invitation_id IS NOT NULL AND channel='email' AND not_before<=clock_timestamp() AND (state='queued' OR state='failed' AND retryable AND attempts<5 OR state='processing' AND lease_until<clock_timestamp()) ORDER BY not_before,id FOR UPDATE SKIP LOCKED LIMIT 30 LOOP
   IF j.state='processing' AND j.armed_at IS NOT NULL THEN UPDATE app_private.delivery_jobs SET state='uncertain',retryable=false,error_code='lease-expired-after-dispatch' WHERE id=j.id;PERFORM app_private.a1_team_delivery_audit(j,'uncertain');CONTINUE;END IF;
   IF NOT app_private.delivery_valid(j) OR j.attempts>=5 THEN UPDATE app_private.delivery_jobs SET state='cancelled',retryable=false WHERE id=j.id;DELETE FROM app_private.delivery_payloads WHERE job_id=j.id;CONTINUE;END IF;
   UPDATE app_private.delivery_jobs SET state='processing',lease=gen_random_uuid(),lease_until=clock_timestamp()+interval '2 minutes',armed_at=NULL,attempts=attempts+1 WHERE id=j.id RETURNING * INTO j;
   SELECT d.envelope INTO envelope FROM app_private.delivery_payloads d WHERE d.job_id=j.id;
   RETURN jsonb_build_object('job',app_private.delivery_view(j),'lease',j.lease,'envelope',envelope);
  END LOOP;
 END IF;
 IF p ? 'jobId' THEN
  SELECT * INTO j FROM app_private.delivery_jobs WHERE id=(p->>'jobId')::uuid AND (aid IS NULL OR agency_id=aid) AND team_invitation_id IS NOT NULL FOR UPDATE;
  IF j.id IS NOT NULL THEN
   IF actor IS NOT NULL THEN RAISE EXCEPTION 'Team owner operation required' USING ERRCODE='42501';END IF;
   IF action='arm' THEN
    IF j.state<>'processing' OR j.lease IS DISTINCT FROM (p->>'lease')::uuid OR j.lease_until<=clock_timestamp() OR j.armed_at IS NOT NULL OR NOT app_private.delivery_valid(j) THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
    UPDATE app_private.delivery_jobs SET armed_at=clock_timestamp() WHERE id=j.id;
   ELSIF action='result' THEN
    IF j.lease IS DISTINCT FROM (p->>'lease')::uuid OR j.armed_at IS NULL OR j.state NOT IN('processing','uncertain') OR p->>'state' NOT IN('accepted','failed','uncertain') THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
    target:=p->>'state';UPDATE app_private.delivery_jobs SET state=target,provider_id=CASE WHEN target='accepted' THEN p->>'providerId' ELSE provider_id END,
     retryable=target='failed' AND p->>'errorCode'='rate-limit' AND attempts<5 AND app_private.delivery_valid(j),error_code=p->>'errorCode',
     not_before=clock_timestamp()+make_interval(secs=>LEAST(3600,30*power(2,LEAST(attempts,7)))::integer) WHERE id=j.id RETURNING * INTO j;
    PERFORM app_private.a1_team_delivery_audit(j,target);
    IF j.provider_id IS NOT NULL THEN FOR x IN SELECT * FROM app_private.delivery_inbox WHERE provider_id=j.provider_id ORDER BY at,event_id LOOP PERFORM app_private.delivery_observe(j.id,x.state,x.event_id);END LOOP;END IF;
   ELSIF action='reconciled' THEN
    IF j.provider_id IS NULL OR p->>'state' NOT IN('accepted','delivered','failed','bounced') THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
    PERFORM app_private.delivery_observe(j.id,p->>'state','reconciliation');
   ELSIF action<>'reconcile-context' THEN RAISE EXCEPTION 'Invalid team delivery operation' USING ERRCODE='22023';END IF;
   SELECT * INTO j FROM app_private.delivery_jobs WHERE id=j.id;RETURN app_private.delivery_view(j);
  END IF;
 END IF;
 result:=app_private.delivery_command_before_a1(aid,actor,action,p);
 IF action='dashboard' THEN result:=jsonb_set(result,'{total}',to_jsonb((SELECT count(*) FROM app_private.delivery_jobs WHERE agency_id=aid AND session_id IS NOT NULL AND (p->>'filter'='all' OR state=p->>'filter'))));END IF;
 RETURN result;END $f$;

-- Exact function scope, no prefix-based discovery. Native promotion must separately
-- establish SET/CREATE/owner/grantor authority, inspect defaults and assert final ACLs.
GRANT CREATE ON SCHEMA public,app_private TO contratpro_a1_writer;
DO $owners$ DECLARE signature text;BEGIN
 FOREACH signature IN ARRAY ARRAY[
 'app_private.a1_mac(text)','app_private.a1_member(uuid)','app_private.a1_capability(uuid,uuid,text)','app_private.a1_owner(uuid,uuid)',
 'app_private.a1_revoke_signer(uuid,uuid)','app_private.a1_payment_summary(uuid,uuid)','public.contratpro_a1(text,text)',
 'public.contratpro_agency_logo_access(text,boolean)','app_private.a1_signer_selection_guard()','app_private.a1_rental_guard()',
 'app_private.a1_team_delivery_valid(app_private.delivery_jobs)','app_private.a1_team_delivery_audit(app_private.delivery_jobs,text)'] LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role,contratpro_runtime,contratpro_platform_runtime',signature);
  EXECUTE format('ALTER FUNCTION %s OWNER TO contratpro_a1_writer',signature);
 END LOOP;
END $owners$;
REVOKE CREATE ON SCHEMA public,app_private FROM contratpro_a1_writer;
-- Cancellation executes existing signing/delivery triggers under their established
-- writer boundary, rather than granting the team writer unrestricted delivery mutation.
ALTER FUNCTION app_private.a1_revoke_signer(uuid,uuid) SECURITY DEFINER;
ALTER FUNCTION app_private.a1_revoke_signer(uuid,uuid) OWNER TO contratpro_rental_writer;
GRANT EXECUTE ON FUNCTION app_private.a1_revoke_signer(uuid,uuid) TO contratpro_a1_writer;
DO $delivery_acl$ DECLARE signature text;BEGIN
 FOREACH signature IN ARRAY ARRAY['app_private.delivery_view(app_private.delivery_jobs)','app_private.delivery_valid(app_private.delivery_jobs)','app_private.delivery_observe(uuid,text,text)','app_private.delivery_command(uuid,uuid,text,jsonb)'] LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',signature);
  EXECUTE format('ALTER FUNCTION %s OWNER TO contratpro_delivery_worker',signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO contratpro_rental_writer,contratpro_delivery_worker',signature);
 END LOOP;END $delivery_acl$;
GRANT EXECUTE ON FUNCTION app_private.a1_team_delivery_valid(app_private.delivery_jobs),app_private.a1_team_delivery_audit(app_private.delivery_jobs,text) TO contratpro_rental_writer,contratpro_delivery_worker;
ALTER FUNCTION app_private.a1_payment_sync() OWNER TO contratpro_sheets_worker;
ALTER FUNCTION app_private.a1_delivery_binding_guard() OWNER TO contratpro_delivery_worker;
REVOKE ALL ON FUNCTION app_private.a1_delivery_binding_guard() FROM PUBLIC,anon,authenticated,service_role;
ALTER FUNCTION app_private.sheets_snapshot(uuid,uuid) OWNER TO contratpro_sheets_worker;
REVOKE ALL ON FUNCTION app_private.a1_payment_sync(),app_private.sheets_snapshot(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.a1_payment_summary(uuid,uuid) TO contratpro_sheets_worker;
GRANT EXECUTE ON FUNCTION public.contratpro_a1(text,text),public.contratpro_agency_logo_access(text,boolean) TO authenticated;
ROLLBACK;
