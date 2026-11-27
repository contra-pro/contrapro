import {expect,it} from "vitest";
import {capture,consent} from "./model";
import {drawing,drawingNotice} from "./representation";
const valid={version:"drawn-v1",strokes:[[[0,100],[1000,900]]]};
it.each(["fr","ar"] as const)("binds a bounded drawing and explicit notice to %s capture",locale=>{const c={typedName:"Signer Name",reviewed:true,identityConfirmed:true,consent:true,consentVersion:consent[locale].version,reviewedChecksum:"a".repeat(64)};expect(capture({...c,drawing:valid,drawingNotice:drawingNotice[locale]},locale,c.reviewedChecksum).drawing).toEqual(valid);expect(()=>capture({...c,drawing:valid},locale,c.reviewedChecksum)).toThrow("invalid");expect(()=>capture({...c,at:"client clock"},locale,c.reviewedChecksum)).toThrow("invalid");});
it.each([null,{...valid,url:"https://example.invalid"},{...valid,strokes:[]},{...valid,strokes:[[[1,1],[1,1]]]},{...valid,strokes:[[[0,0],[1001,0]]]},{...valid,strokes:[[[0,0],[.5,10]]]},{...valid,strokes:Array.from({length:21},()=>valid.strokes[0])},{...valid,strokes:[Array.from({length:161},(_,i)=>[i,i])]}])("rejects malformed or excessive representation %j",value=>{expect(()=>drawing(value)).toThrow("invalid");});
