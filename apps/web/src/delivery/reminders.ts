import { isRecord } from "../../../../packages/application/src/agency-management";
import { DeliveryFault } from "./model";
export type ReminderPolicy={enabled:boolean;manualEnabled:boolean;intervals:number[];maxCount:number;revision:number};
export function reminderPolicy(v:unknown):ReminderPolicy{
  if(!isRecord(v)||typeof v.enabled!=="boolean"||typeof v.manualEnabled!=="boolean"||!Number.isSafeInteger(v.revision)||Number(v.revision)<0||
    !Number.isInteger(v.maxCount)||Number(v.maxCount)<1||Number(v.maxCount)>20||!Array.isArray(v.intervals)||v.intervals.length<1||v.intervals.length>20||
    !v.intervals.every((n,i,a)=>Number.isInteger(n)&&n>=1&&n<=10080&&(i===0||n>a[i-1])))throw new DeliveryFault("invalid");
  return v as ReminderPolicy;
}
