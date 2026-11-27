import { keyRing } from "./keys";
export function validateKeyReferences(refs:Record<string,Record<string,number>>,env:Record<string,string|undefined>){
 for(const consumer of ["delivery","sheets"]){const referenced=refs[consumer]??{};if(!Object.values(referenced).some(n=>n>0))continue;
  const prefix=`CONTRATPRO_${consumer.toUpperCase()}`,ring=keyRing(env[`${prefix}_KEY_ID`]??"v1",env[`${prefix}_ENCRYPTION_KEY`]??"",env[`${prefix}_HISTORICAL_KEYS`]??"{}");
  if(Object.entries(referenced).some(([id,n])=>n>0&&!Object.hasOwn(ring.keys,id)))throw Error("historical_key_unavailable");
 }
}
