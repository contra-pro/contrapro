\set ON_ERROR_STOP on
-- PREPARED ONLY: NOT EXECUTED. Requires separate authorization for test-data writes.
-- Existing synthetic subjects/agency memberships must already be independently verified.
-- SQL claim simulation tests RLS, NOT Supabase gateway/JWT signature verification.
BEGIN ISOLATION LEVEL READ COMMITTED;
SET LOCAL search_path=pg_catalog,pg_temp;
SET LOCAL statement_timeout='5000ms';
SET LOCAL lock_timeout='2000ms';
SET LOCAL idle_in_transaction_session_timeout='10000ms';
SELECT set_config('contratpro.test.subject_a', :'subject_a', true),
 set_config('contratpro.test.subject_b', :'subject_b', true),
 set_config('contratpro.test.agency_a', :'agency_a', true),
 set_config('contratpro.test.agency_b', :'agency_b', true);
-- The launcher supplies independently observed database fingerprint values.
-- No target identity is inferred from our synthetic JWT claim settings.
SELECT set_config('contratpro.test.database_oid', :'database_oid', true),
 set_config('contratpro.test.server_address', :'server_address', true),
 set_config('contratpro.test.server_port', :'server_port', true);
DO $guard$
BEGIN
 IF pg_catalog.current_setting('transaction_isolation') IS DISTINCT FROM 'read committed'
 OR session_user<>'postgres' OR current_database()<>'postgres'
 OR current_setting('server_version_num')::integer NOT BETWEEN 170000 AND 179999
 OR to_regclass('app_private.client_creation_receipts') IS NULL
 OR public.contratpro_client_creation_contract()<>2
 OR (SELECT oid::pg_catalog.text FROM pg_catalog.pg_database WHERE datname=pg_catalog.current_database())<>pg_catalog.current_setting('contratpro.test.database_oid')
 OR pg_catalog.inet_server_addr()::pg_catalog.text IS DISTINCT FROM pg_catalog.current_setting('contratpro.test.server_address')
 OR pg_catalog.inet_server_port()::pg_catalog.text IS DISTINCT FROM pg_catalog.current_setting('contratpro.test.server_port')
 THEN RAISE EXCEPTION 'Acceptance prerequisites unavailable'; END IF;
END;
$guard$;
-- Adversarial temporary domains run a failing CHECK if a helper resolves them.
-- They are installed only in this separately authorized rollback transaction.
CREATE DOMAIN pg_temp.uuid AS pg_catalog.uuid CHECK(false);
CREATE DOMAIN pg_temp.jsonb AS pg_catalog.jsonb CHECK(false);
CREATE DOMAIN pg_temp.text AS pg_catalog.text CHECK(false);
CREATE DOMAIN pg_temp.date AS pg_catalog.date CHECK(false);
CREATE DOMAIN pg_temp.regclass AS pg_catalog.regclass CHECK(false);
SET LOCAL ROLE authenticated;
DO $test$
DECLARE agency pg_catalog.uuid:=current_setting('contratpro.test.agency_a')::pg_catalog.uuid;
 other_agency pg_catalog.uuid:=current_setting('contratpro.test.agency_b')::pg_catalog.uuid;
 subject_a pg_catalog.uuid:=current_setting('contratpro.test.subject_a')::pg_catalog.uuid;
 subject_b pg_catalog.uuid:=current_setting('contratpro.test.subject_b')::pg_catalog.uuid;
 k pg_catalog.uuid:=gen_random_uuid(); cid pg_catalog.uuid;
 original pg_catalog.jsonb:='{"firstName":"Synthetic","lastName":"Idempotency","phone":"+212600000000","email":"TEST@EXAMPLE.INVALID"}'::pg_catalog.jsonb;
 changed pg_catalog.jsonb;
 vector pg_catalog.jsonb;
 normalized pg_catalog.jsonb;
BEGIN
 IF agency=other_agency OR subject_a=subject_b THEN RAISE EXCEPTION 'Distinct fixtures required'; END IF;
 PERFORM set_config('request.jwt.claim.sub',subject_a::pg_catalog.text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',subject_a,'role','authenticated')::pg_catalog.text,true);
 FOR vector IN SELECT value FROM pg_catalog.jsonb_array_elements('[{"input":"É@EXAMPLE.COM","output":"é@example.com"},{"input":"İ@EXAMPLE.COM","output":"i̇@example.com"},{"input":"ΟΣ@Σ.COM","output":"ος@σ.com"}]'::pg_catalog.jsonb) LOOP
   IF app_private.client_unicode_case(vector->>'input',false) IS DISTINCT FROM vector->>'output' THEN RAISE EXCEPTION 'Unicode casing parity failed'; END IF;
 END LOOP;
 -- Prepared SQL parity vectors correspond to TypeScript defaults/trim/case/date/
 -- control/UTF16 tests. Parsing this file offline does not execute these assertions.
 normalized:=app_private.normalize_client_creation(original||pg_catalog.jsonb_build_object(
   'firstName',U&'\00A0Synthetic\FEFF','identityType','passport','identityNumber','ß1234',
   'licenceNumber','ﬃ','licenceIssueDate','2020-01-01','licenceExpiryDate','2028-01-01',
   'notes',E'\nline1\nline2\t'));
 IF normalized->>'firstName'<>'Synthetic' OR normalized->>'identityNumber'<>'SS1234'
 OR normalized->>'licenceNumber'<>'FFI' OR normalized->>'notes'<>E'line1\nline2'
 OR normalized->>'city'<>'' OR normalized->>'email'<>'test@example.invalid'
 OR app_private.normalize_client_creation(original)->>'identityType'<>'none'
 THEN RAISE EXCEPTION 'Normalization contract parity failed'; END IF;
 FOR vector IN SELECT value FROM pg_catalog.jsonb_array_elements(pg_catalog.jsonb_build_array(
   original||'{"identityType":""}'::pg_catalog.jsonb,
   original||'{"email":null}'::pg_catalog.jsonb,
   original||'{"unexpected":"value"}'::pg_catalog.jsonb,
   original||'{"licenceExpiryDate":"2028-01-01"}'::pg_catalog.jsonb,
   original||'{"licenceNumber":"ABC","licenceIssueDate":"2026-02-30","licenceExpiryDate":"2028-01-01"}'::pg_catalog.jsonb,
   original||pg_catalog.jsonb_build_object('notes','bad'||pg_catalog.chr(1)),
   original||pg_catalog.jsonb_build_object('firstName',pg_catalog.repeat('😀',51)),
   original||pg_catalog.jsonb_build_object('email',pg_catalog.repeat('İ',200)||'@a.b'),
   original||pg_catalog.jsonb_build_object('firstName',pg_catalog.repeat(' ',8000),'lastName',pg_catalog.repeat(' ',8000),
     'notes',pg_catalog.repeat(' ',8000),'address',pg_catalog.repeat(' ',8000),'city',pg_catalog.repeat(' ',8000))
 )) LOOP
   BEGIN
     PERFORM app_private.normalize_client_creation(vector);
     RAISE EXCEPTION 'Invalid parity vector accepted';
   EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 END LOOP;
 BEGIN
   PERFORM app_private.normalize_client_creation(pg_catalog.jsonb_build_object('firstName',pg_catalog.repeat('x',8193)));
   RAISE EXCEPTION 'Oversized field accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 IF app_private.canonical_auth_user() IS NULL OR NOT app_private.client_allowed(agency,'clients.read')
 OR NOT app_private.client_allowed(agency,'clients.create') OR NOT app_private.client_allowed(agency,'clients.update')
 OR NOT app_private.client_allowed(agency,'clients.archive') OR app_private.client_allowed(other_agency,'clients.read')
 THEN RAISE EXCEPTION 'Fixture A permissions mismatch'; END IF;
 cid:=public.contratpro_client_create(agency,k,original);
 IF public.contratpro_client_create(agency,k,original) IS DISTINCT FROM cid THEN RAISE EXCEPTION 'Exact replay failed'; END IF;
 changed:=app_private.normalize_client_creation(original)||jsonb_build_object('email','test@example.invalid','firstName',' Synthetic ');
 IF public.contratpro_client_create(agency,k,changed) IS DISTINCT FROM cid THEN RAISE EXCEPTION 'Canonical replay failed'; END IF;
 changed:=app_private.normalize_client_creation(original)||jsonb_build_object('firstName','Edited');
 PERFORM public.contratpro_client_update(agency,cid,1,changed);
 IF public.contratpro_client_create(agency,k,original) IS DISTINCT FROM cid THEN RAISE EXCEPTION 'Post-update replay failed'; END IF;
 BEGIN
   PERFORM public.contratpro_client_create(agency,k,changed);
   RAISE EXCEPTION 'Changed replay was accepted';
 EXCEPTION WHEN serialization_failure THEN NULL; END;
 BEGIN
   PERFORM public.contratpro_client_create(other_agency,k,original);
   RAISE EXCEPTION 'Cross-tenant write was accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
   PERFORM 1 FROM app_private.client_creation_receipts LIMIT 1;
   RAISE EXCEPTION 'Protected receipts were readable';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
   PERFORM public.contratpro_client_create(agency,gen_random_uuid(),original||'{"identityType":"cin"}'::pg_catalog.jsonb);
   RAISE EXCEPTION 'Invalid input was accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 PERFORM set_config('request.jwt.claim.sub',subject_b::pg_catalog.text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',subject_b,'role','authenticated')::pg_catalog.text,true);
 IF app_private.canonical_auth_user() IS NULL OR NOT app_private.client_allowed(agency,'clients.read')
 OR NOT app_private.client_allowed(agency,'clients.create') THEN RAISE EXCEPTION 'Fixture B permissions mismatch'; END IF;
 BEGIN
   PERFORM public.contratpro_client_create(agency,k,original);
   RAISE EXCEPTION 'Other creator obtained replay';
 EXCEPTION WHEN serialization_failure THEN NULL; END;
 PERFORM set_config('request.jwt.claim.sub',subject_a::pg_catalog.text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',subject_a,'role','authenticated')::pg_catalog.text,true);
 PERFORM public.contratpro_client_archive(agency,cid,2);
 BEGIN
   PERFORM public.contratpro_client_create(agency,k,original);
   RAISE EXCEPTION 'Archived replay returned an active ID';
 EXCEPTION WHEN no_data_found THEN NULL; END;
 IF public.contratpro_client_detail(agency,cid) IS NOT NULL THEN RAISE EXCEPTION 'Archived detail exposed'; END IF;
 RAISE NOTICE 'CLIENT_IDEMPOTENCY_SINGLE_SESSION_CHECKS_PASSED_ROLLBACK_REQUIRED';
END;
$test$;
ROLLBACK;
