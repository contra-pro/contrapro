-- BUILD-FIRST ONLY. Requires reviewed 0013–0021. Never apply unchanged.
BEGIN;
DO $guard$ BEGIN RAISE EXCEPTION 'LOCAL DESIGN ONLY: A2 acceptance deferred'; END $guard$;
SET LOCAL search_path=pg_catalog,pg_temp;
SET LOCAL row_security=on;

CREATE TABLE app_private.contract_clause_versions(
 agency_id uuid NOT NULL REFERENCES tenancy.agencies(id),clause_id uuid NOT NULL,id uuid NOT NULL DEFAULT gen_random_uuid(),
 revision integer NOT NULL CHECK(revision>0),payload jsonb NOT NULL CHECK(pg_column_size(payload)<40000),
 PRIMARY KEY(agency_id,id),UNIQUE(agency_id,clause_id,revision));
CREATE TABLE app_private.contract_draft_inputs(
 agency_id uuid NOT NULL,rental_id uuid NOT NULL,revision integer NOT NULL DEFAULT 1,input jsonb NOT NULL CHECK(pg_column_size(input)<100000),
 PRIMARY KEY(agency_id,rental_id),FOREIGN KEY(agency_id,rental_id) REFERENCES tenancy.rental_contracts(agency_id,id));
CREATE TABLE app_private.contract_confirmed_inputs(
 agency_id uuid NOT NULL,rental_id uuid NOT NULL,input jsonb NOT NULL,
 PRIMARY KEY(agency_id,rental_id),FOREIGN KEY(agency_id,rental_id) REFERENCES tenancy.rental_contracts(agency_id,id));
CREATE TABLE app_private.contract_previews(
 agency_id uuid NOT NULL,rental_id uuid NOT NULL,request_id uuid NOT NULL,created_by uuid NOT NULL,input jsonb NOT NULL,snapshot jsonb NOT NULL,template jsonb NOT NULL,
 fingerprint text NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),expires_at timestamptz NOT NULL DEFAULT clock_timestamp()+interval '24 hours',artifact jsonb,
 attempts integer NOT NULL DEFAULT 0,lease uuid,lease_until timestamptz,
 PRIMARY KEY(agency_id,request_id),FOREIGN KEY(agency_id,rental_id) REFERENCES tenancy.rental_contracts(agency_id,id),FOREIGN KEY(agency_id,created_by) REFERENCES tenancy.memberships(agency_id,id));
DO $tables$ DECLARE t text;BEGIN
 FOREACH t IN ARRAY ARRAY['contract_clause_versions','contract_draft_inputs','contract_confirmed_inputs','contract_previews'] LOOP
  EXECUTE format('ALTER TABLE app_private.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE app_private.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON app_private.%I FROM PUBLIC,anon,authenticated,service_role',t);
  EXECUTE format('GRANT SELECT,INSERT ON app_private.%I TO contratpro_rental_writer',t);
  EXECUTE format('CREATE POLICY a2_member ON app_private.%I TO contratpro_rental_writer USING(app_private.rental_member(agency_id) IS NOT NULL) WITH CHECK(app_private.rental_member(agency_id) IS NOT NULL)',t);
 END LOOP;
END $tables$;
GRANT UPDATE ON app_private.contract_draft_inputs,app_private.contract_previews TO contratpro_rental_writer;
CREATE TRIGGER clause_immutable BEFORE UPDATE OR DELETE ON app_private.contract_clause_versions FOR EACH ROW EXECUTE FUNCTION app_private.rental_receipt_immutable();
CREATE TRIGGER confirmed_input_immutable BEFORE UPDATE OR DELETE ON app_private.contract_confirmed_inputs FOR EACH ROW EXECUTE FUNCTION app_private.rental_receipt_immutable();
-- Reuse entitlement admission without the official artifact issuance counter.
CREATE TRIGGER a2_preview_admission BEFORE INSERT ON app_private.contract_previews FOR EACH ROW EXECUTE FUNCTION app_private.billing_feature_write('documents');

-- Exact draft projection of the A1 canonical sources. Never allocates a number,
-- inserts a rental version, emits an event, admits signing or consumes issuance.
CREATE FUNCTION app_private.a2_snapshot(aid uuid,rid uuid) RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE r tenancy.rental_contracts;o app_private.rental_operations;b app_private.agency_branding;secondary uuid;parties jsonb;pay jsonb;BEGIN
 SELECT * INTO STRICT r FROM tenancy.rental_contracts WHERE agency_id=aid AND id=rid;
 SELECT * INTO o FROM app_private.rental_operations WHERE agency_id=aid AND rental_id=rid;
 SELECT * INTO b FROM app_private.agency_branding WHERE agency_id=aid;
 SELECT secondary_client_id INTO secondary FROM app_private.rental_drivers WHERE agency_id=aid AND contract_id=rid;
 SELECT jsonb_build_object('agency',jsonb_build_object('name',a.name,'ice',a.ice,'ifNumber',a.if_number,'rc',a.rc,'address',a.address,'city',a.city,'phone',a.phone,'email',a.email)||COALESCE(b.profile,'{}')||jsonb_build_object('logoData',b.logo_data,'brandingRevision',b.revision),
 'primaryDriver',app_private.rental_driver_payload(aid,r.client_id),'secondaryDriver',CASE WHEN secondary IS NULL THEN NULL ELSE app_private.rental_driver_payload(aid,secondary) END,
 'vehicle',jsonb_build_object('id',v.id,'registrationNumber',v.registration,'make',v.make,'model',v.model,'year',v.model_year,'mileage',v.mileage)) INTO parties
 FROM tenancy.agencies a JOIN tenancy.vehicles v ON v.agency_id=a.id AND v.id=r.vehicle_id WHERE a.id=aid;
 SELECT jsonb_build_object('paidMinor',COALESCE(sum(paid_delta),0)::text,'remainingMinor',(r.total_minor-COALESCE(sum(paid_delta),0))::text,'depositHeldMinor',COALESCE(sum(deposit_delta),0)::text,
 'lastOperation',(SELECT jsonb_build_object('kind',q.kind,'amountMinor',q.amount_minor::text,'method',q.method,'date',q.payment_date,'reference',q.reference) FROM app_private.rental_payments q WHERE q.agency_id=aid AND q.rental_id=rid ORDER BY sequence DESC LIMIT 1)) INTO pay FROM app_private.rental_payments WHERE agency_id=aid AND rental_id=rid;
 parties:=jsonb_set(parties,'{agency}',(parties->'agency')||jsonb_build_object('signerName',(SELECT name FROM app_private.agency_signers WHERE agency_id=aid AND membership_id=o.signer_id AND enabled)));
 RETURN jsonb_build_object('schemaVersion',1,'agencyId',aid,'rentalId',rid,'version',r.version,'number',COALESCE(r.contract_number,''),'parties',parties,'operationsRevision',o.revision,'signerId',o.signer_id,
 'terms',jsonb_build_object('start',r.starts_at,'end',r.ends_at,'dailyRateMinor',r.daily_rate_minor::text,'depositMinor',r.deposit_minor::text,'totalMinor',r.total_minor::text,'billableDays',r.billable_days,'currency',r.currency,
 'pickup',o.pickup,'returnLocation',o.return_location,'payment',pay::text,'paidMinor',pay->>'paidMinor','remainingMinor',pay->>'remainingMinor','depositHeldMinor',pay->>'depositHeldMinor','paymentMethod',pay->'lastOperation'->>'method','paymentDate',pay->'lastOperation'->>'date','paymentReference',pay->'lastOperation'->>'reference'));
END $f$;
-- Both draft and first confirmed capture use precisely the same projection.
-- Later lifecycle versions retain the original parties and branding.
CREATE OR REPLACE FUNCTION app_private.rental_document_capture() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE base jsonb;sn jsonb;BEGIN
 IF NEW.number_serial IS NULL THEN RETURN NEW;END IF;
 SELECT payload INTO base FROM app_private.rental_document_versions WHERE agency_id=NEW.agency_id AND contract_id=NEW.id ORDER BY version DESC LIMIT 1;
 IF base IS NULL AND TG_OP='UPDATE' AND OLD.number_serial IS NOT NULL THEN RETURN NEW;END IF;
 sn:=app_private.a2_snapshot(NEW.agency_id,NEW.id);
 IF base IS NOT NULL THEN sn:=jsonb_set(sn,'{parties}',base->'parties');END IF;
 sn:=jsonb_set(sn,'{terms}',(sn->'terms')||jsonb_build_object('state',NEW.state));
 INSERT INTO app_private.rental_document_versions VALUES(NEW.agency_id,NEW.id,NEW.version,sn||jsonb_build_object('templateRevision',NULL,'signatures',jsonb_build_object('order',jsonb_build_array('agency','client'),'agency',NULL,'client',NULL),'evidence',NULL,'sheets',jsonb_build_object('eventKey',NEW.agency_id::text||':'||NEW.id::text||':'||NEW.version::text)));
 RETURN NEW;
END $f$;
CREATE FUNCTION app_private.a2_fingerprint(aid uuid,rid uuid) RETURNS text LANGUAGE sql SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
 SELECT encode(sha256(convert_to(jsonb_build_object('snapshot',app_private.a2_snapshot(aid,rid),'input',d.input,'template',v.payload)::text,'UTF8')),'hex')
 FROM app_private.contract_draft_inputs d JOIN app_private.contract_template_versions v ON v.agency_id=d.agency_id AND v.id=(d.input->>'templateVersionId')::uuid
 WHERE d.agency_id=aid AND d.rental_id=rid
$f$;

ALTER FUNCTION public.contratpro_documents(uuid,text,jsonb) RENAME TO contratpro_documents_before_a2;
REVOKE ALL ON FUNCTION public.contratpro_documents_before_a2(uuid,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.contratpro_documents(p_agency_id uuid,p_action text,p_input jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE actor uuid;rid uuid;req uuid;rev integer;v jsonb;c jsonb;result jsonb;sn jsonb;fp text;job app_private.contract_previews;binding jsonb;official app_private.contract_generation_jobs;BEGIN
 actor:=app_private.rental_member(p_agency_id);
 IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'Unsupported isolation' USING ERRCODE='22023';END IF;
 IF jsonb_typeof(p_input) IS DISTINCT FROM 'object' OR pg_column_size(p_input)>524288 THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
 -- Same agency lock as the existing library. Rental row lock below fences lifecycle changes.
 PERFORM pg_advisory_xact_lock(hashtextextended('documents:'||p_agency_id::text,0));
 IF p_action='clauses' THEN
  SELECT COALESCE(jsonb_agg(payload ORDER BY clause_id,revision DESC),'[]') INTO result FROM app_private.contract_clause_versions WHERE agency_id=p_agency_id;RETURN result;
 ELSIF p_action='clause-save' THEN
  IF NOT EXISTS(SELECT 1 FROM tenancy.membership_roles mr JOIN tenancy.roles r ON r.agency_id=mr.agency_id AND r.id=mr.role_id JOIN tenancy.role_permissions rp ON rp.agency_id=r.agency_id AND rp.role_id=r.id WHERE mr.agency_id=p_agency_id AND mr.membership_id=actor AND r.key='owner' AND rp.permission_key='agency.manage') THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
  IF NOT(p_input ?& ARRAY['id','expectedRevision','title','fr','ar','enabled']) OR jsonb_typeof(p_input->'enabled')<>'boolean' OR EXISTS(SELECT 1 FROM unnest(ARRAY['title','fr','ar']) k WHERE jsonb_typeof(p_input->k)<>'string' OR length(btrim(p_input->>k)) NOT BETWEEN 1 AND CASE WHEN k='title' THEN 120 ELSE 8000 END OR (p_input->>k)~'[\x01-\x08\x0b\x0c\x0e-\x1f]') THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
  SELECT COALESCE(max(revision),0) INTO rev FROM app_private.contract_clause_versions WHERE agency_id=p_agency_id AND clause_id=(p_input->>'id')::uuid;
  IF rev IS DISTINCT FROM (p_input->>'expectedRevision')::integer THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
  result:=(p_input-'expectedRevision'-'id')||jsonb_build_object('agencyId',p_agency_id,'clauseId',p_input->>'id','id',gen_random_uuid(),'revision',rev+1);
  INSERT INTO app_private.contract_clause_versions VALUES(p_agency_id,(p_input->>'id')::uuid,(result->>'id')::uuid,rev+1,result);
  INSERT INTO tenancy.audit_events(agency_id,actor_membership_id,action,request_id,metadata) VALUES(p_agency_id,actor,'contract.clause.version',gen_random_uuid(),jsonb_build_object('id',result->>'id','revision',rev+1));RETURN result;
 ELSIF p_action='save' THEN
  c:=p_input->'config';
  IF c ? 'clauseVersions' THEN
   IF jsonb_typeof(c->'clauseVersions')<>'array' OR jsonb_array_length(c->'clauseVersions')>40 OR (SELECT count(*)<>count(DISTINCT x) FROM jsonb_array_elements_text(c->'clauseVersions') x) THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
   SELECT COALESCE(jsonb_agg(cv.payload ORDER BY s.n),'[]') INTO v FROM jsonb_array_elements_text(c->'clauseVersions') WITH ORDINALITY s(id,n) JOIN app_private.contract_clause_versions cv ON cv.agency_id=p_agency_id AND cv.id=s.id::uuid;
   IF jsonb_array_length(v)<>jsonb_array_length(c->'clauseVersions') THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
  ELSE v:='[]';END IF;
  RETURN public.contratpro_documents_before_a2(p_agency_id,p_action,jsonb_set(p_input,'{config}',(c-'clauses')||jsonb_build_object('clauses',v)));
 ELSIF p_action IN('draft-input','draft-configure','preview-begin','preview-finish','preview-artifact','preview-state','preview-reserve') THEN
  rid:=(p_input->>'rentalId')::uuid;
  PERFORM 1 FROM tenancy.rental_contracts WHERE agency_id=p_agency_id AND id=rid AND state='brouillon' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
  SELECT input INTO binding FROM app_private.contract_draft_inputs WHERE agency_id=p_agency_id AND rental_id=rid;
  IF p_action='draft-input' THEN RETURN binding||jsonb_build_object('revision',(SELECT revision FROM app_private.contract_draft_inputs WHERE agency_id=p_agency_id AND rental_id=rid));END IF;
  IF p_action='draft-configure' THEN
   SELECT payload INTO v FROM app_private.contract_template_versions WHERE agency_id=p_agency_id AND id=(p_input->>'templateVersionId')::uuid AND template_id IN(SELECT id FROM app_private.contract_templates WHERE agency_id=p_agency_id AND NOT archived);
   IF v IS NULL THEN RAISE EXCEPTION 'Missing' USING ERRCODE='P0002';END IF;
   PERFORM (p_input->>'issueDate')::date;
   IF jsonb_typeof(p_input->'custom') IS DISTINCT FROM 'object' OR pg_column_size(p_input->'custom')>90000 OR p_input->>'issueDate' !~ '^\d{4}-\d{2}-\d{2}$' OR EXISTS(SELECT 1 FROM jsonb_each(p_input->'custom') e WHERE NOT(v->'config'->'custom' ? e.key) OR jsonb_typeof(e.value)<>'string' OR length(e.value#>>'{}')>2000 OR (e.value#>>'{}')~'[\x01-\x1f]') THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
   IF COALESCE((SELECT revision FROM app_private.contract_draft_inputs WHERE agency_id=p_agency_id AND rental_id=rid),0) IS DISTINCT FROM (p_input->>'expectedRevision')::integer THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
   binding:=p_input-'expectedRevision'-'clauses';
   IF binding ? 'clauseVersions' THEN
    IF jsonb_typeof(binding->'clauseVersions')<>'array' OR jsonb_array_length(binding->'clauseVersions')>40 OR (SELECT count(*)<>count(DISTINCT x) FROM jsonb_array_elements_text(binding->'clauseVersions') x) THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
    SELECT COALESCE(jsonb_agg(cv.payload ORDER BY s.n),'[]') INTO c FROM jsonb_array_elements_text(binding->'clauseVersions') WITH ORDINALITY s(id,n) JOIN app_private.contract_clause_versions cv ON cv.agency_id=p_agency_id AND cv.id=s.id::uuid;
    IF jsonb_array_length(c)<>jsonb_array_length(binding->'clauseVersions') THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
    binding:=binding||jsonb_build_object('clauses',c);
   END IF;
   INSERT INTO app_private.contract_draft_inputs VALUES(p_agency_id,rid,1,binding) ON CONFLICT(agency_id,rental_id) DO UPDATE SET revision=contract_draft_inputs.revision+1,input=EXCLUDED.input;
   PERFORM public.contratpro_documents_before_a2(p_agency_id,'select',jsonb_build_object('rentalId',rid,'templateVersionId',binding->>'templateVersionId'));
   INSERT INTO tenancy.audit_events(agency_id,actor_membership_id,action,request_id,metadata) VALUES(p_agency_id,actor,'contract.draft.configure',gen_random_uuid(),jsonb_build_object('rentalId',rid));
   RETURN binding;
  END IF;
  fp:=app_private.a2_fingerprint(p_agency_id,rid);
  IF p_action='preview-state' THEN
   SELECT artifact||jsonb_build_object('stale',fingerprint IS DISTINCT FROM fp OR expires_at<clock_timestamp()) INTO result FROM app_private.contract_previews WHERE agency_id=p_agency_id AND rental_id=rid AND artifact IS NOT NULL ORDER BY created_at DESC LIMIT 1;
   RETURN COALESCE(result,'null');
  END IF;
  req:=(p_input->>'requestId')::uuid;
  SELECT * INTO job FROM app_private.contract_previews WHERE agency_id=p_agency_id AND request_id=req;
  IF p_action='preview-begin' THEN
   IF binding IS NULL OR fp IS NULL THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
   IF job.request_id IS NULL THEN
    IF (SELECT count(*) FROM app_private.contract_previews WHERE agency_id=p_agency_id AND created_at>clock_timestamp()-interval '1 hour')>=30 THEN RAISE EXCEPTION 'Preview rate limit' USING ERRCODE='PBL01';END IF;
    sn:=app_private.a2_snapshot(p_agency_id,rid);
    SELECT payload INTO STRICT v FROM app_private.contract_template_versions WHERE agency_id=p_agency_id AND id=(binding->>'templateVersionId')::uuid;
    IF binding ? 'clauses' THEN v:=jsonb_set(v,'{config,clauses}',binding->'clauses');END IF;
    INSERT INTO app_private.contract_previews(agency_id,rental_id,request_id,created_by,input,snapshot,template,fingerprint) VALUES(p_agency_id,rid,req,actor,binding,sn,v,fp) RETURNING * INTO job;
   END IF;
   IF job.rental_id<>rid OR job.fingerprint IS DISTINCT FROM fp OR job.expires_at<clock_timestamp() THEN RAISE EXCEPTION 'Stale preview' USING ERRCODE='40001';END IF;
   IF job.artifact IS NULL THEN
    IF job.attempts>=5 THEN RAISE EXCEPTION 'Preview retry limit' USING ERRCODE='PBL01';END IF;
    IF job.lease_until>clock_timestamp() THEN RAISE EXCEPTION 'Rendering in progress' USING ERRCODE='55000';END IF;
    UPDATE app_private.contract_previews SET attempts=attempts+1,lease=gen_random_uuid(),lease_until=clock_timestamp()+interval '60 seconds' WHERE agency_id=p_agency_id AND request_id=req RETURNING * INTO job;
   END IF;
   RETURN jsonb_build_object('artifact',job.artifact,'snapshot',job.snapshot,'template',job.template,'input',job.input,'fingerprint',job.fingerprint,'lease',job.lease);
  END IF;
  IF job.request_id IS NULL OR job.rental_id<>rid OR job.fingerprint IS DISTINCT FROM fp OR job.expires_at<clock_timestamp() THEN RAISE EXCEPTION 'Stale preview' USING ERRCODE='40001';END IF;
  IF p_action IN('preview-reserve','preview-finish') AND (job.lease IS DISTINCT FROM (p_input->>'lease')::uuid OR job.lease_until<clock_timestamp()) THEN RAISE EXCEPTION 'Lost rendering lease' USING ERRCODE='40001';END IF;
  IF p_action='preview-reserve' THEN
   IF p_input->>'key' IS DISTINCT FROM p_agency_id::text||'/drafts/'||req::text||'/'||(p_input->>'checksum')||'.pdf' OR p_input->>'checksum' !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
   IF NOT EXISTS(SELECT 1 FROM app_private.contract_objects WHERE agency_id=p_agency_id AND key=p_input->>'key') AND (SELECT count(*) FROM app_private.contract_objects WHERE agency_id=p_agency_id AND key LIKE p_agency_id::text||'/drafts/'||req::text||'/%')>=5 THEN RAISE EXCEPTION 'Preview object limit' USING ERRCODE='PBL01';END IF;
   INSERT INTO app_private.contract_objects(agency_id,key,checksum,kind) VALUES(p_agency_id,p_input->>'key',p_input->>'checksum','drafts') ON CONFLICT DO NOTHING;RETURN 'true';
  ELSIF p_action='preview-artifact' THEN RETURN job.artifact;
  ELSIF p_action='preview-finish' THEN
   IF p_input->>'attestation' IS DISTINCT FROM app_private.document_renderer_mac(concat_ws('|',p_agency_id::text,req::text,p_input->>'key',p_input->>'checksum',job.template->>'checksum',job.fingerprint)) THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
   IF job.artifact IS NOT NULL THEN RETURN job.artifact;END IF;
   IF NOT EXISTS(SELECT 1 FROM app_private.contract_objects WHERE agency_id=p_agency_id AND key=p_input->>'key' AND checksum=p_input->>'checksum' AND kind='drafts' AND state='pending') OR p_input->>'key' NOT LIKE p_agency_id::text||'/drafts/'||req::text||'/%' THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
   result:=jsonb_build_object('id',req,'requestId',req,'agencyId',p_agency_id,'rentalId',rid,'rentalVersion',job.snapshot->'version','templateVersionId',job.template->>'id','key',p_input->>'key','checksum',p_input->>'checksum','fingerprint',fp,'status','preview','expiresAt',job.expires_at,'stale',false);
   UPDATE app_private.contract_previews SET artifact=result WHERE agency_id=p_agency_id AND request_id=req;
   UPDATE app_private.contract_objects SET state='retained' WHERE agency_id=p_agency_id AND key=p_input->>'key';
   INSERT INTO tenancy.audit_events(agency_id,actor_membership_id,action,request_id,metadata) VALUES(p_agency_id,actor,'document.preview',req,jsonb_build_object('rentalId',rid,'fingerprint',fp,'checksum',p_input->>'checksum'));
   RETURN result;
  END IF;
 ELSIF p_action='preview-fail' THEN
  UPDATE app_private.contract_previews SET lease_until=NULL WHERE agency_id=p_agency_id AND request_id=(p_input->>'requestId')::uuid AND lease=(p_input->>'lease')::uuid AND artifact IS NULL;RETURN 'true';
 ELSIF p_action='confirmed-input' THEN
  SELECT input INTO result FROM app_private.contract_confirmed_inputs WHERE agency_id=p_agency_id AND rental_id=(p_input->>'rentalId')::uuid;RETURN result;
 ELSIF p_action='select' THEN
  SELECT input INTO binding FROM app_private.contract_draft_inputs WHERE agency_id=p_agency_id AND rental_id=(p_input->>'rentalId')::uuid;
  IF binding IS NOT NULL AND binding->>'templateVersionId' IS DISTINCT FROM p_input->>'templateVersionId' THEN RAISE EXCEPTION 'Configure draft inputs before changing selection' USING ERRCODE='40001';END IF;
 ELSIF p_action='begin' THEN
  SELECT input INTO binding FROM app_private.contract_confirmed_inputs WHERE agency_id=p_agency_id AND rental_id=(p_input->>'rentalId')::uuid;
  IF binding IS NOT NULL AND (binding->>'templateVersionId' IS DISTINCT FROM p_input->>'templateVersionId' OR binding->'custom' IS DISTINCT FROM p_input->'custom' OR binding->>'issueDate' IS DISTINCT FROM p_input->>'issueDate') THEN RAISE EXCEPTION 'Confirmed inputs differ' USING ERRCODE='40001';END IF;
  IF binding IS NOT NULL THEN
   -- Archival prevents new selection, not issuance of a version already confirmed.
   req:=(p_input->>'requestId')::uuid;rid:=(p_input->>'rentalId')::uuid;
   SELECT * INTO official FROM app_private.contract_generation_jobs WHERE agency_id=p_agency_id AND request_id=req;
   IF official.request_id IS NOT NULL THEN
    IF official.input IS DISTINCT FROM p_input THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
   ELSE
    IF COALESCE(p_input->>'status','') NOT IN('draft','issued') OR NOT EXISTS(SELECT 1 FROM tenancy.rental_contracts WHERE agency_id=p_agency_id AND id=rid AND version=(p_input->>'rentalVersion')::integer AND state IN('confirme','en_cours','termine')) THEN RAISE EXCEPTION 'Conflict' USING ERRCODE='40001';END IF;
    SELECT payload INTO STRICT sn FROM app_private.rental_document_versions WHERE agency_id=p_agency_id AND contract_id=rid AND version=(p_input->>'rentalVersion')::integer;
    INSERT INTO app_private.contract_generation_jobs VALUES(p_agency_id,req,rid,(p_input->>'rentalVersion')::integer,(binding->>'templateVersionId')::uuid,p_input,sn) RETURNING * INTO official;
   END IF;
   SELECT payload INTO STRICT v FROM app_private.contract_template_versions WHERE agency_id=p_agency_id AND id=official.template_version_id;
   SELECT payload INTO result FROM app_private.contract_artifacts WHERE agency_id=p_agency_id AND request_id=req;
   result:=jsonb_build_object('artifact',result,'snapshot',official.snapshot,'template',v,'fingerprint',official.request_id);
  ELSE result:=public.contratpro_documents_before_a2(p_agency_id,p_action,p_input);END IF;
  IF binding ? 'clauses' THEN result:=jsonb_set(result,'{template,config,clauses}',binding->'clauses');END IF;
  RETURN result;
 END IF;
 RETURN public.contratpro_documents_before_a2(p_agency_id,p_action,p_input);
END $f$;

CREATE FUNCTION app_private.a2_confirmation_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE binding jsonb;fp text;BEGIN
 IF OLD.state='brouillon' AND NEW.state='confirme' THEN
  IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'Unsupported isolation' USING ERRCODE='22023';END IF;
  SELECT input INTO binding FROM app_private.contract_draft_inputs WHERE agency_id=NEW.agency_id AND rental_id=NEW.id;
  IF EXISTS(SELECT 1 FROM app_private.rental_template_selections WHERE agency_id=NEW.agency_id AND rental_id=NEW.id) THEN
   fp:=app_private.a2_fingerprint(NEW.agency_id,NEW.id);
   IF binding IS NULL OR NOT EXISTS(SELECT 1 FROM app_private.contract_previews WHERE agency_id=NEW.agency_id AND rental_id=NEW.id AND fingerprint=fp AND artifact IS NOT NULL AND expires_at>clock_timestamp()) THEN RAISE EXCEPTION 'Regenerate and review preview before confirmation' USING ERRCODE='40001';END IF;
   INSERT INTO app_private.contract_confirmed_inputs VALUES(NEW.agency_id,NEW.id,binding);
  END IF;
 END IF;RETURN NEW;
END $f$;
CREATE TRIGGER a2_confirmation_guard BEFORE UPDATE ON tenancy.rental_contracts FOR EACH ROW EXECUTE FUNCTION app_private.a2_confirmation_guard();
-- Expiry/freshness also protects direct authenticated Storage reads.
ALTER FUNCTION public.contratpro_document_object_access(text,boolean) RENAME TO contratpro_document_object_access_before_a2;
REVOKE ALL ON FUNCTION public.contratpro_document_object_access_before_a2(text,boolean) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.contratpro_document_object_access(p_key text,p_write boolean) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE j app_private.contract_previews;BEGIN
 IF NOT public.contratpro_document_object_access_before_a2(p_key,p_write) THEN RETURN false;END IF;
 IF split_part(p_key,'/',2)<>'drafts' THEN RETURN true;END IF;
 SELECT * INTO j FROM app_private.contract_previews WHERE agency_id=split_part(p_key,'/',1)::uuid AND request_id=split_part(p_key,'/',3)::uuid;
 IF j.request_id IS NOT NULL THEN
  RETURN j.expires_at>clock_timestamp() AND j.fingerprint=app_private.a2_fingerprint(j.agency_id,j.rental_id) AND EXISTS(SELECT 1 FROM tenancy.rental_contracts WHERE agency_id=j.agency_id AND id=j.rental_id AND state='brouillon');
 END IF;RETURN true;
END $f$;
ALTER FUNCTION public.contratpro_document_object_access(text,boolean) OWNER TO contratpro_rental_writer;
REVOKE ALL ON FUNCTION public.contratpro_document_object_access(text,boolean) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.contratpro_document_object_access(text,boolean) TO authenticated;
-- Existing policies bind function OIDs, so recreate them against the new wrapper.
DROP POLICY contract_object_read ON storage.objects;
DROP POLICY contract_object_insert ON storage.objects;
CREATE POLICY contract_object_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='contract-documents' AND public.contratpro_document_object_access(name,false));
CREATE POLICY contract_object_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='contract-documents' AND public.contratpro_document_object_access(name,true));
DO $owners$ DECLARE r record;BEGIN
 FOR r IN SELECT p.oid::regprocedure fn FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='app_private' AND p.proname IN('a2_snapshot','a2_fingerprint','a2_confirmation_guard') LOOP
  EXECUTE format('ALTER FUNCTION %s OWNER TO contratpro_rental_writer',r.fn);
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',r.fn);
 END LOOP;
END $owners$;
ALTER FUNCTION public.contratpro_documents(uuid,text,jsonb) OWNER TO contratpro_rental_writer;
REVOKE ALL ON FUNCTION public.contratpro_documents(uuid,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.contratpro_documents(uuid,text,jsonb) TO authenticated;
-- Physical preview/orphan deletion remains an explicit A5 operation. Metadata and
-- bytes are retained; expired/stale previews must not be offered as current.
ROLLBACK;
