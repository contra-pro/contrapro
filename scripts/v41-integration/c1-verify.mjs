import {spawn} from 'node:child_process';
import {dirname,resolve} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {reviewEnvironment} from './start.mjs';
const root=resolve(import.meta.dirname,'../..'),npm=resolve(dirname(process.execPath),'node_modules/npm/bin/npm-cli.js'),out=resolve(root,'.verification/c1');await mkdir(out,{recursive:true});
const stages={typecheck:['exec','--workspace=@contratpro/web','--','tsc','--noEmit','-p','tsconfig.auth-review.json'],'database-typecheck':['run','typecheck','--workspace=@contratpro/database'],lint:['run','lint'],web:['run','test','--workspace=@contratpro/web'],database:['run','test','--workspace=@contratpro/database'],targeted:['run','test','--workspace=@contratpro/web','--','src/sheets','src/delivery','src/registration/isolated-acceptance.test.ts'],acceptance:['run','test','--workspace=@contratpro/web','--','src/auth/password.test.ts','src/auth/signup-sdk.test.ts','src/auth/canonical-provisioning','src/registration','src/operations','src/maintenance'],operations:['run','test:operations'],build:['run','build']};
for(const stage of process.argv.slice(2)){
 if(!stages[stage])throw Error('Unknown stage');const env={...reviewEnvironment(),A6_AUTH_POLISH_VERIFY:'1',...(['web','database','targeted','acceptance'].includes(stage)?{NODE_ENV:'test'}:{})};
 const child=spawn(process.execPath,[npm,...stages[stage]],{cwd:root,env,windowsHide:true,stdio:['ignore','pipe','pipe']});let log='';for(const s of [child.stdout,child.stderr])s.on('data',b=>{log+=b;});
 const code=await new Promise((r,reject)=>{child.on('error',reject);child.on('exit',r);});await writeFile(resolve(out,stage+'.log'),log);console.log(stage+': '+code+'\n'+log.slice(-6000));if(code!==0){process.exitCode=code??1;break;}
}
