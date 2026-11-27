export const modules=["clients","vehicles","rentals","templates","delivery","sheets","billing","team","branding"] as const;
export type Module=typeof modules[number];
const gates:Record<Module,string>={clients:"CLIENTS",vehicles:"VEHICLES",rentals:"RENTALS",templates:"DOCUMENTS",delivery:"DELIVERY",sheets:"SHEETS",billing:"BILLING",team:"A1",branding:"A1"};
export function navigationCapabilities(value:unknown,env:Record<string,string|undefined>):Record<Module,boolean>{
 if(!value||typeof value!=="object"||Array.isArray(value)||Object.keys(value).sort().join()!==[...modules].sort().join())throw Error("unavailable");
 const data=value as Record<string,unknown>;if(modules.some(k=>typeof data[k]!=="boolean"))throw Error("unavailable");
 return Object.fromEntries(modules.map(k=>[k,data[k]===true&&env[`CONTRATPRO_${gates[k]}_VERIFIED`]==="true"])) as Record<Module,boolean>;
}
