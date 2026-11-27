import { renderToStaticMarkup } from "react-dom/server";
import { expect,it } from "vitest";
import { ContractArchive } from "./archive-workspace";
import { CreationRecovery } from "../sheets/creation-workspace";
import { BillingHistory,BillingSupport } from "../billing/history-workspace";
it.each(["fr","ar"] as const)("provides labelled archive and recovery controls in %s",locale=>{
 const archive=renderToStaticMarkup(<ContractArchive locale={locale}/>);expect(archive).toContain(`dir="${locale==="ar"?"rtl":"ltr"}"`);expect(archive).toContain('autoComplete="off"');expect(archive).toContain('maxLength="120"');expect(archive).not.toContain('method="get"');
 const recovery=renderToStaticMarkup(<CreationRecovery locale={locale} onRecovered={()=>{}}/>);expect(recovery).toContain(locale==="ar"?"لا يُعاد الإنشاء تلقائياً":"Aucune nouvelle création automatique");
 expect(renderToStaticMarkup(<BillingHistory locale={locale}/>)).toContain('role="status"');expect(renderToStaticMarkup(<BillingSupport locale={locale}/>)).toContain(locale==="ar"?"المدفوعات الحقيقية غير مفعّلة":"paiements réels restent désactivés");
});
