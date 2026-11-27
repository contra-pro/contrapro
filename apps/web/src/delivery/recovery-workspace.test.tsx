// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach,expect,it,vi } from "vitest";
const {send}=vi.hoisted(()=>({send:vi.fn()}));
vi.mock("./client",()=>({sendDelivery:send}));
import { ReminderSettings,UncertainRecovery } from "./recovery-workspace";
(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
afterEach(()=>vi.clearAllMocks());
it.each(["fr","ar"] as const)("labels policy and unverified manual recovery controls in %s",locale=>{
 expect(renderToStaticMarkup(<ReminderSettings locale={locale}/>)).toContain(locale==="ar"?"لا إرسال تلقائي":"Aucun rappel automatique");
 const html=renderToStaticMarkup(<UncertainRecovery locale={locale} jobId="fixture" refresh={async()=>{}}/>);
 expect(html).toContain(locale==="ar"?"لا إعادة إرسال تلقائية":"aucun renvoi automatique");expect(html).toContain('maxLength="120"');
});
it("retains the exact manual resolution command after uncertainty",async()=>{
 send.mockRejectedValue(Error("unavailable"));const div=document.createElement("div"),root=createRoot(div);
 await act(async()=>root.render(<UncertainRecovery locale="fr" jobId="11111111-1111-4111-8111-111111111111" refresh={async()=>{}}/>));
 await act(async()=>div.querySelector("form")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));
 await act(async()=>div.querySelector("form")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));
 expect(send).toHaveBeenCalledTimes(2);expect(send.mock.calls[0]).toEqual(send.mock.calls[1]);expect(send.mock.calls[0]![1]).toBe("manual-resolve");
 await act(async()=>root.unmount());
});
