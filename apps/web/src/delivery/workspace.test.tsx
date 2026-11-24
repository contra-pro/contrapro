import { renderToStaticMarkup } from "react-dom/server";
import { expect,it } from "vitest";
import { DeliveryDashboard,DeliveryPanel,FinalContractAccess } from "./workspace";
it.each(["fr","ar"] as const)("renders accessible localized delivery controls in %s",locale=>{const html=renderToStaticMarkup(<DeliveryDashboard locale={locale}/>);expect(html).toContain(locale==="ar"?'dir="rtl"':'dir="ltr"');expect(html).toContain("<label>");expect(html).toContain('role="status"');const panel=renderToStaticMarkup(<DeliveryPanel locale={locale} sessionId="session"/>);expect(panel).not.toContain("https://wa.me");expect(panel).not.toContain("#token=");expect(renderToStaticMarkup(<FinalContractAccess locale={locale}/>)).not.toContain("supabase");});
