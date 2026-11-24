-- READ-ONLY PREPARATION. Not executed; never feed this file to a migration runner.
-- Capture before and after with the intended executor and compare both rows.
-- Expected after: present/owner_matches/hardening_matches true for both functions;
-- body hashes, owners, security mode, volatility, ACLs and owner attributes unchanged.
-- authenticated_can_execute must remain false. No function is invoked here.
BEGIN READ ONLY;
SET LOCAL search_path=pg_catalog,pg_temp;

-- Reconcile the actual history; local filenames/manifests are not deployment proof.
SELECT version
FROM supabase_migrations.schema_migrations
WHERE version IN ('20261116000700','20261118000900','20261118001000')
ORDER BY version;

WITH expected(signature,owner_name) AS (
  VALUES ('public.contratpro_provision_identity()','contratpro_identity_writer'),
         ('app_private.provisioning_subject()','postgres')
)
SELECT e.signature,
       p.oid IS NOT NULL AS present,
       e.owner_name AS expected_owner,
       r.rolname AS actual_owner,
       r.rolname=e.owner_name AS owner_matches,
       p.prosecdef AS security_definer,
       p.provolatile AS volatility,
       p.proconfig AS function_settings,
       (p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on'])
         IS TRUE AS hardening_matches,
       pg_catalog.md5(p.prosrc) AS body_md5,
       p.proacl::pg_catalog.text AS function_acl,
       pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
         AS authenticated_can_execute,
       pg_catalog.pg_has_role(current_user,p.proowner,'USAGE')
         AS current_role_has_owner_privileges,
       pg_catalog.pg_has_role(session_user,p.proowner,'SET')
         AS session_can_set_owner_role,
       r.rolsuper, r.rolbypassrls, r.rolcanlogin, r.rolinherit,
       r.rolcreatedb, r.rolcreaterole, r.rolreplication
FROM expected e
LEFT JOIN pg_catalog.pg_proc p ON p.oid=pg_catalog.to_regprocedure(e.signature)
LEFT JOIN pg_catalog.pg_roles r ON r.oid=p.proowner
ORDER BY e.signature;

-- Explain incoming postgres membership without assuming ADMIN grants ALTER rights.
SELECT pg_catalog.pg_get_userbyid(m.grantor) AS grantor,
       m.admin_option, m.inherit_option, m.set_option
FROM pg_catalog.pg_auth_members m
WHERE m.roleid=pg_catalog.to_regrole('contratpro_identity_writer')
  AND m.member=pg_catalog.to_regrole('postgres');

ROLLBACK;
