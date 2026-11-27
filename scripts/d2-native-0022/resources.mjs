import {readFile,readdir,lstat,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
export const repository=resolve(import.meta.dirname,'../..');
export const resourceRoot='C:/Program Files/PostgreSQL/17-EtsyHunter-Test';
export const sessionRoot='C:/Users/lenovo/AppData/Local/ContratPro-D2-native/pg17-54329';
export const sha=b=>createHash('sha256').update(b).digest('hex');
export async function resourceInventory(){
 const files=[];async function add(relative){const p=resolve(resourceRoot,relative),s=await lstat(p);if(!s.isFile()||s.isSymbolicLink())throw Error('Resource file binding');files.push({file:relative,sha256:sha(await readFile(p)),bytes:s.size});}
 async function walk(relative){for(const e of await readdir(resolve(resourceRoot,relative),{withFileTypes:true})){if(e.isSymbolicLink())throw Error('Linked installed resource refused');if(e.isDirectory())await walk(relative+'/'+e.name);else if(e.isFile())await add(relative+'/'+e.name);}}
 for(const f of ['bin/postgres.exe','bin/initdb.exe','bin/pg_ctl.exe','bin/psql.exe','lib/plpgsql.dll','lib/pgcrypto.dll','lib/uuid-ossp.dll'])await add(f);
 await walk('share');files.sort((a,b)=>a.file.localeCompare(b.file));
 if(!(await readFile(resolve(resourceRoot,'share/postgres.bki'),'utf8')).startsWith('# PostgreSQL 17'))throw Error('Wrong bootstrap catalogue major');
 return {schema:1,resourceRoot,serverVersion:'17.11',compatibility:'four program and three extension-library hashes match observed 17.11 installation; bootstrap major 17; native load unexecuted',existingDataInspected:false,files};
}
export async function verifyResources(){const expected=JSON.parse(await readFile(resolve(import.meta.dirname,'resource-manifest.json'),'utf8')),actual=await resourceInventory();if(JSON.stringify(expected)!==JSON.stringify(actual))throw Error('D2 resource inventory drift');return expected;}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){if(process.argv.length!==3||!['--bind','--check'].includes(process.argv[2]))throw Error('Resource action required');if(process.argv[2]==='--bind'){const v=await resourceInventory();await writeFile(resolve(import.meta.dirname,'resource-manifest.json'),JSON.stringify(v,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({files:v.files.length,existingDataInspected:false,sqlExecuted:false}));}else{const v=await verifyResources();console.log(JSON.stringify({verifiedFiles:v.files.length,sqlExecuted:false}));}}
