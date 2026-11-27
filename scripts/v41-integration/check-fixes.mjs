import {readFile} from 'node:fs/promises';import {resolve} from 'node:path';import {root,save} from './files.mjs';
const p='apps/web/src/components/workspace-notifications.tsx';await save(p,(await readFile(resolve(root,p),'utf8')).replaceAll('module','area'));
const t='apps/web/src/marketing/landing.test.tsx';await save(t,(await readFile(resolve(root,t),'utf8')).replace('src/HalyardContratPro.jsx','custom/HalyardContratPro.tsx'));
