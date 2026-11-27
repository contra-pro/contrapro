import {spawn} from 'node:child_process';
import {dirname,resolve} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {reviewEnvironment} from './start.mjs';
const root=resolve(import.meta.dirname,'../..'),npm=resolve(dirname(process.execPath),'node_modules/npm/bin/npm-cli.js'),out=resolve(root,'.verification/b1');await mkdir(out,{recursive:true});
const stages={typecheck:['exec','--workspace=@contratpro/web','--','tsc','--noEmit','-p','tsconfig.auth-review.json'],lint:['run','lint'],web:['run','test','--workspace=@contratpro/web'],database:['run','test','--workspace=@contratpro/database'],targeted:['run','test','--workspace=@contratpro/web','--','src/signing','src/delivery'],sql:['run','test','--workspace=@contratpro/database','--','tests/internal-signature.test.ts','tests/a1-workflows.test.ts'],operations:['run','test:operations'],build:['run','build']};
stages['database-typecheck']=['run','typecheck','--workspace=@contratpro/database'];
for(const stage of process.argv.slice(2)){
 if(!stages[stage])throw Error('Unknown stage');const env={...reviewEnvironment(),A6_AUTH_POLISH_VERIFY:'1',...(['web','database','targeted','sql'].includes(stage)?{NODE_ENV:'test'}:{})};
 const child=spawn(process.execPath,[npm,...stages[stage]],{cwd:root,env,windowsHide:true,stdio:['ignore','pipe','pipe']});let log='';for(const s of [child.stdout,child.stderr])s.on('data',b=>{log+=b;});
 const code=await new Promise((r,reject)=>{child.on('error',reject);child.on('exit',r);});await writeFile(resolve(out,stage+'.log'),log);console.log(stage+': '+code+'\n'+log.slice(-7000));if(code!==0){process.exitCode=code??1;break;}
}
