import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import {loadMigrations,planChecksum} from "../migrations/manifest.ts";
import {target} from "./bootstrap.ts";

export const draftHash="902d50629df97516570afdc7656e833e3183a7de2da9c4e3ead5c25f456430aa";
export const artifactHashes=Object.freeze([
 ["../../migrations/drafts/0000_roles.sql",target.bootstrap],
 ["../../migrations/drafts/0001_schema.sql","fa7d6c75c5663e7227e544f43ff72fa4fd3860d3e81227ba8f60f42349131428"],
 ["../../migrations/drafts/0002_context.sql","27fbcf33e5c1399731f24d3817625c8688616a8b272ea553747837f58666024d"],
 ["../../migrations/drafts/0003_rls_grants.sql","d21a528173ccb5f9f67a3fd5b5c480f160e1e53649713a17b6c4223dfbb9699e"],
 ["../migrations/config.ts","3cfa33f67f99e2bc81c39bb212636b5d2a24847b9e4d8a48b65fe03a6dc5eb9a"],
 ["../../scripts/migrate.ts","50fad4a120d7d3af0b7060b199daed3afa6a6a646d294b57ed5444ba71763ace"],
 ["../migrations/runner.ts","89c409a06ad0f5b187c386d992afed0ab124d50af361b43981d3fb711efc7267"],
 ["../migrations/manifest.ts","e0ece96040fb01df8ef4e51303fb63880459e12b85f1f327773578487774fc3c"],
 ["../migrations/sql.ts","42a2525b88f28e09e91d82971a533016dde59cf763e6465690b1f8225665fd3b"],
 ["../../provisioning/foundation-authority.sql",draftHash],
] as const);
/** Reads fixed non-secret source artifacts only; never executes the draft or a migration. */
export async function verifyProvisionArtifacts(reader:(url:URL)=>Promise<Buffer>=readFile):Promise<void>{
 for(const [path,hash] of artifactHashes){
  const bytes=await reader(new URL(path,import.meta.url));
  if(createHash("sha256").update(bytes).digest("hex")!==hash)throw new Error();
 }
 if(planChecksum(await loadMigrations())!==target.plan)throw new Error();
}
