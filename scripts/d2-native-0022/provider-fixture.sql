-- Independent synthetic provider contract. No historical 0009 variant is loaded.
-- Not managed Supabase, no JWT verification or object service is implemented.
CREATE SCHEMA extensions AUTHORIZATION postgres;
CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION "uuid-ossp" WITH SCHEMA extensions;
CREATE SCHEMA auth AUTHORIZATION d2_auth_owner;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
ALTER TABLE auth.users OWNER TO d2_auth_owner;
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SET search_path=pg_catalog AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE SET search_path=pg_catalog AS $$SELECT nullif(current_setting('request.jwt.claim.role',true),'')$$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE SET search_path=pg_catalog AS $$SELECT COALESCE(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
GRANT USAGE ON SCHEMA auth TO PUBLIC;
CREATE SCHEMA storage AUTHORIZATION d2_storage_owner;
CREATE TABLE storage.buckets(id text PRIMARY KEY,name text NOT NULL,public boolean NOT NULL DEFAULT false,file_size_limit bigint,allowed_mime_types text[]);
CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text NOT NULL REFERENCES storage.buckets(id),name text NOT NULL,metadata jsonb NOT NULL DEFAULT '{"size":1}',UNIQUE(bucket_id,name));
ALTER TABLE storage.buckets OWNER TO d2_storage_owner;
ALTER TABLE storage.objects OWNER TO d2_storage_owner;
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated;
CREATE SCHEMA supabase_migrations AUTHORIZATION postgres;
CREATE TABLE supabase_migrations.schema_migrations(version text PRIMARY KEY,statements text[],name text);
