import {readFile} from 'node:fs/promises';import {resolve} from 'node:path';import {root,save} from './files.mjs';
const p='apps/web/src/marketing/landing-content.tsx';let s=await readFile(resolve(root,p),'utf8');for(const [a,b]of [
 ['Le dashboard illustre un responsable et un agent ; cette navigation simulée ne remplace pas une autorisation serveur.','Les autorisations sont vérifiées dans l’espace agence.'],
 ['توضح لوحة العمل مسؤولاً وموظفاً؛ لا تحل القائمة المحاكاة محل صلاحيات الخادم.','تُتحقق الصلاحيات في مساحة الوكالة.'],
 ['ContratPro · aperçu privé, données fictives','ContratPro · Votre agence, organisée'],['ContratPro · معاينة خاصة، بيانات خيالية','ContratPro · وكالتك، منظمة'],
 ['Guide de revue','Comprendre les modèles'],['دليل المراجعة','فهم النماذج'],['Limites et notices','Comprendre les signatures'],['الحدود والإشعارات','فهم التوقيعات']])s=s.replace(a,b);await save(p,s);
