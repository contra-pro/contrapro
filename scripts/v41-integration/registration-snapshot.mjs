import {readFile,writeFile} from 'node:fs/promises';import {resolve} from 'node:path';const root=resolve(import.meta.dirname,'../..'),file=resolve(root,'supabase/migration-drafts/20261127002700_registration_onboarding.sql');
let source=await readFile(resolve(root,'supabase/migration-drafts/20261125002200_contract_previews_clauses.sql'),'utf8');const start=source.indexOf('CREATE FUNCTION app_private.a2_snapshot('),end=source.indexOf('END $f$;',start)+'END $f$;'.length;let fn=source.slice(start,end).replace('CREATE FUNCTION','CREATE OR REPLACE FUNCTION').replace("'email',a.email)","'email',a.email,'country',extra.details->>'country','postalCode',extra.details->>'postalCode','website',extra.details->>'website','rcCity',extra.details->>'rcCity','businessStructure',extra.details->>'structure')").replace('FROM tenancy.agencies a JOIN tenancy.vehicles','FROM tenancy.agencies a LEFT JOIN app_private.agency_business_details extra ON extra.agency_id=a.id JOIN tenancy.vehicles');
let sql=await readFile(file,'utf8');if(!sql.includes('-- Additional fields for future snapshots only.'))sql=sql.replace('ROLLBACK;',`-- Additional fields for future snapshots only. Existing immutable versions are not updated.
DO $snapshot$ BEGIN IF to_regprocedure('app_private.a2_snapshot(uuid,uuid)') IS NOT NULL THEN
 GRANT SELECT ON app_private.agency_business_details TO contratpro_rental_writer;
 CREATE POLICY business_document_read ON app_private.agency_business_details FOR SELECT TO contratpro_rental_writer USING(EXISTS(SELECT 1 FROM tenancy.memberships m WHERE m.agency_id=agency_business_details.agency_id AND m.user_id=app_private.canonical_auth_user() AND m.state='active'));
 EXECUTE $create$${fn}$create$;
END IF;END $snapshot$;
ROLLBACK;`);await writeFile(file,sql);
