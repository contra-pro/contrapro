import {readFile} from 'node:fs/promises';import {resolve} from 'node:path';import {root,save} from './files.mjs';
const p='apps/web/src/components/agency-navigation.tsx';let s=await readFile(resolve(root,p),'utf8');s=s.replace('{(permissions.team||permissions.branding)&&link("/settings",copy.settings,4)}','{link("/settings",copy.settings,4)}');await save(p,s);
