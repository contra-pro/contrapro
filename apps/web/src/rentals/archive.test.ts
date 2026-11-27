import { expect,it } from "vitest";
import { archiveQuery } from "./archive-model";
it("bounds POST-only archive filters and rejects unsafe or excessive input",()=>{
 expect(archiveQuery({page:1,query:"  client  ",state:"all",signature:"all",payment:"all",archived:"all",from:"",to:"",createdFrom:"",createdTo:""}).query).toBe("client");
 for(const query of ["x".repeat(121),"secret\nline"])expect(()=>archiveQuery({page:1,query})).toThrow("invalid");
 expect(()=>archiveQuery({page:0,query:""})).toThrow("invalid");
 expect(()=>archiveQuery({page:1,query:"",from:"2026-13-01"})).toThrow("invalid");expect(()=>archiveQuery({page:1,query:"",from:"2026-02-30"})).toThrow("invalid");
});
