import {readFileSync} from "node:fs";
import {PGlite} from "@electric-sql/pglite";
import {parse} from "pgsql-parser";
import {parsePlPgSQL} from "libpg-query";
import {expect,it} from "vitest";
const source=readFileSync(new URL("../../../../supabase/migration-drafts/20261127002800_internal_signature_representation.sql",import.meta.url),"utf8");
it("0028 remains guarded, rolls back and parses SQL and procedural bodies",async()=>{expect(source).toContain("RAISE EXCEPTION 'LOCAL DESIGN ONLY");expect(source.trim()).toMatch(/ROLLBACK;$/);expect(await parse(source)).toBeDefined();expect(await parsePlPgSQL(source)).toBeDefined();});
it("validates drawing bounds and consent at the database boundary with least-privilege ACLs",async()=>{
 const db=new PGlite();try{
 await db.exec("CREATE SCHEMA app_private;CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE ROLE contratpro_rental_writer;CREATE FUNCTION app_private.signing_command(uuid,uuid,text,text,jsonb) RETURNS jsonb LANGUAGE sql AS $$SELECT '{\"ok\":true}'::jsonb$$;");
 await db.exec(source.replace(/DO \$guard\$[\s\S]*?END \$guard\$;/,"").replace(/ROLLBACK;\s*$/,"COMMIT;"));
 const cap={typedName:"Test Signer",reviewed:true,identityConfirmed:true,consent:true,consentVersion:"simple-fr-v1",reviewedChecksum:"a".repeat(64)};
 const check=async(v:unknown)=>(await db.query<{v:boolean}>("SELECT app_private.b1_capture_valid($1) v",[v])).rows[0]!.v;
 expect(await check(cap)).toBe(true);
 const drawn={...cap,drawing:{version:"drawn-v1",strokes:[[[0,0],[1000,1000]]]},drawingNotice:"Le dessin accompagne mon nom saisi. Il est une représentation visuelle, pas une preuve indépendante d’identité ni une signature cryptographique."};
 expect(await check(drawn)).toBe(true);
 for(const c of [{...drawn,drawingNotice:"changed"},{...drawn,drawing:{version:"drawn-v1",strokes:[[[0,0],[1001,0]]]}},{...drawn,drawing:{version:"drawn-v1",strokes:[[[1,1],[1,1]]]}},{...cap,at:"forged"},{...cap,reviewed:false},null])expect(await check(c)).toBe(false);
 await db.exec("SET ROLE authenticated");await expect(db.query("SELECT app_private.b1_capture_valid($1)",[drawn])).rejects.toMatchObject({code:"42501"});await db.exec("RESET ROLE");
 }finally{await db.close();}
},120000);
