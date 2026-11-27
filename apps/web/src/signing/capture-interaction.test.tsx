// @vitest-environment jsdom
import {act} from "react";
import {createRoot} from "react-dom/client";
import {expect,it,vi} from "vitest";
import {SignatureCapture} from "./workspace";
it.each(["fr","ar"] as const)("%s keeps typed signing accessible and requires a valid drawing when selected",async locale=>{
 vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);const host=document.createElement("div"),root=createRoot(host),sign=vi.fn();document.body.append(host);
 try{
 await act(async()=>root.render(<SignatureCapture locale={locale} documentLocale={locale} checksum={"a".repeat(64)} disabled={false} onSign={sign}/>));
 const name=host.querySelector<HTMLInputElement>('input[autocomplete="name"]')!;
 await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!.call(name,locale==="ar"?"اسم العميل":"Signer Name");name.dispatchEvent(new Event("input",{bubbles:true}));});
 const checks=[...host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')],button=host.querySelector<HTMLButtonElement>('button[type="submit"]')!;
 expect(button.disabled).toBe(true);
 for(const c of checks.slice(1))await act(async()=>c.click());
 expect(button.disabled).toBe(false);
 await act(async()=>host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 expect(sign).toHaveBeenCalledTimes(1);expect(sign.mock.calls[0]![0]).toMatchObject({typedName:locale==="ar"?"اسم العميل":"Signer Name",consentVersion:`simple-${locale}-v1`});expect(sign.mock.calls[0]![0].drawing).toBeUndefined();
 await act(async()=>checks[0]!.click());expect(host.querySelector('svg')).not.toBeNull();expect(button.disabled).toBe(true);
 await act(async()=>checks.at(-1)!.click());expect(button.disabled).toBe(true);
 await act(async()=>checks[0]!.click());expect(host.querySelector('svg')).toBeNull();expect(button.disabled).toBe(true);
 }finally{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();}
});
