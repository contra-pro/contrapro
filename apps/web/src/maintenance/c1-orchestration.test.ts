import {afterEach,expect,it,vi} from "vitest";
const calls=vi.hoisted(()=>({reminder:vi.fn(),materialize:vi.fn(),send:vi.fn(),sheets:vi.fn(),deliveryRepo:vi.fn(),sheetsRepo:vi.fn()}));
vi.mock("server-only",()=>({}));
vi.mock("../delivery/runtime",()=>({deliveryConfig:vi.fn(),createDeliveryWorker:()=>({reminderOnce:calls.reminder,materializeOnce:calls.materialize,runOnce:calls.send}),workerRepository:()=>({repo:{call:calls.deliveryRepo}})}));
vi.mock("../sheets/runtime",()=>({sheetsConfig:vi.fn(),sheetsServices:()=>({worker:{tick:calls.sheets},workerRepo:{call:calls.sheetsRepo}})}));
import {executeTask} from "./runtime";
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
it("routes authorized email/reminder and Sheets tasks through their existing workers",async()=>{
 for(const flag of ["DELIVERY","RESEND","SHEETS","A3"])vi.stubEnv(`CONTRATPRO_${flag}_VERIFIED`,"true");
 const repo={call:vi.fn()};expect(await executeTask("delivery",repo)).toBe("ok");expect(calls.reminder).toHaveBeenCalledTimes(1);expect(calls.materialize).toHaveBeenCalledTimes(1);expect(calls.send).toHaveBeenCalledTimes(1);expect(calls.deliveryRepo).toHaveBeenCalledWith(null,"purge-expired",{});
 expect(await executeTask("sheets",repo)).toBe("ok");expect(calls.sheets).toHaveBeenCalledTimes(1);expect(calls.sheetsRepo).toHaveBeenCalledWith(null,"purge",{});
});
it("does not proceed to dispatch when durable materialization fails",async()=>{
 vi.stubEnv("CONTRATPRO_DELIVERY_VERIFIED","true");vi.stubEnv("CONTRATPRO_RESEND_VERIFIED","true");calls.materialize.mockRejectedValueOnce(Error("synthetic interruption"));await expect(executeTask("delivery",{call:vi.fn()})).rejects.toThrow();expect(calls.send).not.toHaveBeenCalled();
});
