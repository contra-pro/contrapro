import { timingSafeEqual } from "node:crypto";
export function workerAuthorized(provided:string|null,secret:string|undefined){
 const token=provided?.replace(/^Bearer /,"")??"";
 return !!secret&&/^[a-f0-9]{64}$/.test(secret)&&/^[a-f0-9]{64}$/.test(token)&&timingSafeEqual(Buffer.from(secret),Buffer.from(token));
}
