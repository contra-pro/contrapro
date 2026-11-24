// @vitest-environment jsdom
import { act } from "react";
import { createRoot,type Root } from "react-dom/client";
import { afterEach,beforeEach,expect,it,vi } from "vitest";
import { AgencyBilling,SubscriptionDetails,UsageDetails } from "./workspace";
import { PlatformBilling } from "./platform";
import { billingCopy } from "./copy";
import type { Dashboard,Plan } from "./model";
let host:HTMLDivElement,root:Root;
beforeEach(()=>{vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);host=document.createElement("div");document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
const plan:Plan={id:"test-only",plan_key:"test-only",version:1,name:"TEST ONLY",description_fr:"Description française",description_ar:"وصف عربي",interval:"month",amount_minor:"9007199254740993",currency:"MAD",trial_days:null,features:["contracts"],limits:{contracts:"3"},archived:false};
const data:Dashboard={subscription:{agency_id:"test",revision:2,state:"active",plan_id:plan.id,period_start:"2026-11-01",period_end:"2026-12-01",trial_end:null,grace_end:null,cancel_at_end:false,pending_plan:null,suspended:false},plans:[plan],usage:[{metric:"contracts",bucket:"test-period",used:"1",reserved:"1"}],payments:[],profile:{}};
it.each(["fr","ar"] as const)("%s renders configured values, usage and RTL without invented prices",async locale=>{
 vi.stubGlobal("fetch",vi.fn(async()=>Response.json({ok:true,value:data})));
 await act(async()=>root.render(<AgencyBilling locale={locale}/>));expect(host.querySelector("section")?.dir).toBe(locale==="ar"?"rtl":"ltr");expect(host.textContent).toContain(plan.amount_minor);expect(host.textContent).toContain(locale==="ar"?plan.description_ar:plan.description_fr);expect(host.textContent).toContain(billingCopy(locale).notice);expect(host.querySelectorAll("label").length).toBeGreaterThan(0);
});
it("quota remaining subtracts reservations and never presents negative allowance",async()=>{await act(async()=>root.render(<UsageDetails locale="fr" data={{...data,usage:[{metric:"contracts",bucket:"period",used:"3",reserved:"1"}]}}/>));expect(host.textContent).toContain("Restant: 0");});
it("unconfigured subscription shows no fabricated active state",async()=>{await act(async()=>root.render(<SubscriptionDetails locale="fr" s={null} plans={[]}/>));expect(host.textContent).toContain(billingCopy("fr").noSubscription);expect(host.textContent).not.toContain("Actif");});
it("platform denial exposes no administration forms or data",async()=>{vi.stubGlobal("fetch",vi.fn(async()=>Response.json({ok:false,code:"forbidden"},{status:403})));await act(async()=>root.render(<PlatformBilling locale="ar"/>));expect(host.textContent).toContain(billingCopy("ar").forbidden);expect(host.querySelector("form")).toBeNull();});
it("failed cancellation displays an error and retains the verified subscription",async()=>{const fetcher=vi.fn().mockResolvedValueOnce(Response.json({ok:true,value:data})).mockResolvedValue(Response.json({ok:false,code:"conflict"},{status:409}));vi.stubGlobal("fetch",fetcher);await act(async()=>root.render(<AgencyBilling locale="fr"/>));const cancel=[...host.querySelectorAll("button")].find(b=>b.textContent===billingCopy("fr").cancel)!;await act(async()=>cancel.click());expect(host.textContent).toContain(billingCopy("fr").error);expect(host.textContent).not.toContain(billingCopy("fr").done);});
