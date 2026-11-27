-- A6 narrowly scoped read projection: existing RPCs do not expose a minimal
-- module permission set. Avoid fetching team/billing/customer records for chrome.
BEGIN;
DO $guard$ BEGIN RAISE EXCEPTION 'LOCAL DESIGN ONLY: A6 navigation acceptance deferred';END $guard$;
SET LOCAL search_path=pg_catalog,pg_temp;
SET LOCAL row_security=on;
CREATE FUNCTION public.contratpro_navigation(p_agency_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE actor uuid;keys text[];BEGIN
 actor:=app_private.rental_member(p_agency_id);
 SELECT COALESCE(array_agg(DISTINCT rp.permission_key),ARRAY[]::text[]) INTO keys
 FROM tenancy.membership_roles mr JOIN tenancy.role_permissions rp ON rp.agency_id=mr.agency_id AND rp.role_id=mr.role_id
 WHERE mr.agency_id=p_agency_id AND mr.membership_id=actor;
 RETURN jsonb_build_object('clients','clients.read'=ANY(keys),'vehicles','vehicles.read'=ANY(keys),'rentals',true,'templates',true,
 'delivery','contracts.deliver'=ANY(keys),'sheets',keys && ARRAY['sheets.view','sheets.manage'],'billing','billing.view'=ANY(keys),
 'team','agency.manage'=ANY(keys) AND EXISTS(SELECT 1 FROM tenancy.membership_roles mr JOIN tenancy.roles r ON r.agency_id=mr.agency_id AND r.id=mr.role_id WHERE mr.agency_id=p_agency_id AND mr.membership_id=actor AND r.key='owner'),
 'branding','agency.manage'=ANY(keys) AND EXISTS(SELECT 1 FROM tenancy.membership_roles mr JOIN tenancy.roles r ON r.agency_id=mr.agency_id AND r.id=mr.role_id WHERE mr.agency_id=p_agency_id AND mr.membership_id=actor AND r.key='owner'));
END $f$;
ALTER FUNCTION public.contratpro_navigation(uuid) OWNER TO contratpro_rental_writer;
REVOKE ALL ON FUNCTION public.contratpro_navigation(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.contratpro_navigation(uuid) TO authenticated;
-- Read-only, minimal task projection. Existing signing list mutates expiration and
-- is unbounded per rental; it must not be reused for overview aggregation.
GRANT SELECT(agency_id,contract_id,state) ON app_private.sheets_jobs TO contratpro_rental_writer;
CREATE POLICY a6_sheets_overview ON app_private.sheets_jobs FOR SELECT TO contratpro_rental_writer
 USING(agency_id=nullif(current_setting('contratpro.a6_agency',true),'')::uuid);
CREATE FUNCTION public.contratpro_dashboard(p_agency_id uuid,p_module text,p_at timestamptz) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $f$
DECLARE actor uuid; result jsonb; BEGIN
 actor:=app_private.rental_member(p_agency_id);
 IF p_at IS NULL OR NOT isfinite(p_at) OR p_module IS NULL OR p_module NOT IN('rentals','signing','delivery','sheets') THEN RAISE EXCEPTION 'Invalid' USING ERRCODE='22023';END IF;
 IF p_module='rentals' THEN
  SELECT jsonb_object_agg(kind,items) INTO result FROM (
   SELECT kind,(SELECT COALESCE(jsonb_agg(to_jsonb(v) ORDER BY v.at,v.id),'[]'::jsonb) FROM (
    SELECT r.id,r.contract_number AS reference,r.state,
     CASE WHEN kind='returns' THEN r.ends_at WHEN kind='activity' THEN r.updated_at ELSE r.starts_at END AS at
    FROM tenancy.rental_contracts r WHERE r.agency_id=p_agency_id AND
     CASE kind WHEN 'active' THEN r.state='en_cours'
      WHEN 'pickups' THEN r.state='confirme' AND r.starts_at<p_at+interval '24 hours'
      WHEN 'returns' THEN r.state='en_cours' AND r.ends_at<p_at+interval '24 hours'
      WHEN 'drafts' THEN r.state='brouillon' ELSE true END
    ORDER BY CASE WHEN kind='activity' THEN r.updated_at END DESC,
     CASE WHEN kind='returns' THEN r.ends_at ELSE r.starts_at END,r.id LIMIT 20
   ) v) AS items FROM unnest(ARRAY['active','pickups','returns','drafts','activity']) kind
  ) categories;
 ELSIF p_module='signing' THEN
  PERFORM app_private.signing_allowed(p_agency_id);
  PERFORM set_config('contratpro.signing_agency',p_agency_id::text,true);
  SELECT COALESCE(jsonb_agg(to_jsonb(v) ORDER BY v.at,v.id),'[]'::jsonb) INTO result FROM (
   SELECT s.rental_id AS id,r.contract_number AS reference,s.state,s.expires_at AS at FROM app_private.signing_sessions s
   JOIN tenancy.rental_contracts r ON r.agency_id=s.agency_id AND r.id=s.rental_id
   WHERE s.agency_id=p_agency_id AND s.expires_at>p_at AND s.state IN('awaiting_agency','agency_signed','awaiting_client','client_signed','finalization_pending','reconciliation_required')
   ORDER BY s.expires_at,s.id LIMIT 20) v;
 ELSIF p_module='delivery' THEN
  PERFORM app_private.delivery_allowed(p_agency_id);
  PERFORM set_config('contratpro.signing_agency',p_agency_id::text,true);
  SELECT COALESCE(jsonb_agg(to_jsonb(v) ORDER BY v.id,v.state),'[]'::jsonb) INTO result FROM (
   SELECT s.rental_id AS id,r.contract_number AS reference,j.state FROM app_private.delivery_jobs j
   JOIN app_private.signing_sessions s ON s.agency_id=j.agency_id AND s.id=j.session_id
   JOIN tenancy.rental_contracts r ON r.agency_id=s.agency_id AND r.id=s.rental_id
   WHERE j.agency_id=p_agency_id AND NOT j.obsolete AND j.state IN('failed','bounced','uncertain')
   ORDER BY j.not_before,j.id LIMIT 20) v;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM tenancy.membership_roles mr JOIN tenancy.role_permissions rp ON rp.agency_id=mr.agency_id AND rp.role_id=mr.role_id WHERE mr.agency_id=p_agency_id AND mr.membership_id=actor AND rp.permission_key IN('sheets.view','sheets.manage')) THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501';END IF;
  PERFORM set_config('contratpro.a6_agency',p_agency_id::text,true);
  SELECT COALESCE(jsonb_agg(to_jsonb(v) ORDER BY v.id),'[]'::jsonb) INTO result FROM (
   SELECT j.contract_id AS id,r.contract_number AS reference,j.state FROM app_private.sheets_jobs j
   JOIN tenancy.rental_contracts r ON r.agency_id=j.agency_id AND r.id=j.contract_id
   WHERE j.agency_id=p_agency_id AND j.state IN('pending','processing','failed','paused','reconciliation-required')
   ORDER BY j.contract_id LIMIT 20) v;
 END IF;
 RETURN result;
END $f$;
ALTER FUNCTION public.contratpro_dashboard(uuid,text,timestamptz) OWNER TO contratpro_rental_writer;
REVOKE ALL ON FUNCTION public.contratpro_dashboard(uuid,text,timestamptz) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.contratpro_dashboard(uuid,text,timestamptz) TO authenticated;
ROLLBACK;
