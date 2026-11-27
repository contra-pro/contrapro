-- Independent minimum predecessor protocol. Deliberately not copied from any 0009 variant.
-- This model permits synthetic suffix testing, never faithful upgrade acceptance.
CREATE TABLE app_private.client_creation_receipts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),fixture_payload jsonb NOT NULL DEFAULT '{}');
ALTER TABLE app_private.client_creation_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.client_creation_receipts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.client_creation_receipts FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION app_private.receipt_auth_uid() RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
BEGIN
 IF session_user<>'authenticator' OR current_setting('role',true) IS DISTINCT FROM 'authenticated' THEN RAISE EXCEPTION 'Synthetic gateway boundary' USING ERRCODE='42501';END IF;
 RETURN auth.uid();
END$$;
REVOKE ALL ON FUNCTION app_private.receipt_auth_uid() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.receipt_auth_uid() TO contratpro_agency_writer,contratpro_identity_writer;
