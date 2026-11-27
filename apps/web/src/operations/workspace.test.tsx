import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { TeamWorkspace } from "./team";
import { BrandingWorkspace } from "./branding";
import { RentalOperationsPanel } from "./rental";
import { AcceptTeamInvitation } from "./accept";
import type { Team, RentalOperations } from "./model";
const team:Team={canManage:true,members:[{id:"member",userId:"User",state:"active",revision:0,roles:["role"],signer:false,signerName:"",eligible:false}],roles:[{id:"role",key:"staff",name:"Staff",permissions:[]}],permissions:["rentals.payments"],invitations:[]};
const rental:RentalOperations={revision:1,locations:{pickup:"Rabat",returnLocation:"Aéroport"},signerId:null,payments:[],paidMinor:"0",remainingMinor:"10001",depositHeldMinor:"0",status:"unpaid",canPay:true,state:"brouillon",eligibleSigners:[]};
it.each(["fr","ar"] as const)("renders all A1 controls, labels, empty/status and RTL in %s",locale=>{
 const t=renderToStaticMarkup(<TeamWorkspace locale={locale} initial={team}/>),r=renderToStaticMarkup(<RentalOperationsPanel locale={locale} rentalId="rental" initial={rental}/>),b=renderToStaticMarkup(<BrandingWorkspace locale={locale} initial={{revision:0,profile:{},logoData:null,canManage:true}}/>);
 for(const html of [t,r,b]){expect(html).toContain(locale==="ar"?'dir="rtl"':'dir="ltr"');expect(html).toContain('role="status"');expect(html).toContain("<label>");expect(html).not.toContain("undefined");}
 expect(r).toContain("Rabat");expect(r).toContain('name="amount"');expect(r).toContain('name="reason"');expect(b).toContain('accept="image/png"');expect(t).toContain('type="email"');
 const rolePattern=t.match(/pattern="([^"]+)"/)?.[1];expect(rolePattern).toBeDefined();expect(new RegExp(rolePattern!,"v").test("cashier-role")).toBe(true);
 expect(renderToStaticMarkup(<AcceptTeamInvitation locale={locale}/>)).toContain("disabled");
});
it("disables ownership and accounting controls for unauthorized members and issued locations",()=>{
 const t=renderToStaticMarkup(<TeamWorkspace locale="fr" initial={{...team,canManage:false}}/>);
 expect(t).not.toContain('type="email"');expect(t).not.toContain('name="permission"');
 const r=renderToStaticMarkup(<RentalOperationsPanel locale="fr" rentalId="rental" initial={{...rental,canPay:false,state:"confirme"}}/>);expect(r.match(/<fieldset disabled=""/g)?.length).toBeGreaterThanOrEqual(2);
});
