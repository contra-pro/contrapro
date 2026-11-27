import {isRecord,validateAgencyProfile,type AgencyProfile} from '../../../../packages/application/src/agency-management';
export const personalFields=['firstName','lastName','callingCode','phone'] as const;
export type PersonalProfile=Record<typeof personalFields[number],string>;
export type LegalRelease={terms:{version:string;path:string};privacy:{version:string;path:string}};
export const approvedLegalRelease:LegalRelease|null=null; // No final owner-approved documents supplied. Launch blocker, never fabricate consent.
export type InputErrors=Record<string,'required'|'invalid'|'mismatch'|'legal-unavailable'>;
export function normalizePhone(code:unknown,input:unknown):string|null{
 if(typeof code!=='string'||typeof input!=='string'||!/^\+[1-9][0-9]{0,2}$/.test(code)||input.length>40||!/^[+0-9 ().-]+$/.test(input))return null;
 let digits=input.replace(/[ ().-]/g,'');if(digits.startsWith('00'))digits='+'+digits.slice(2);
 if(digits.startsWith('+')){if(!digits.startsWith(code))return null;}else{if(code==='+212'&&digits.startsWith('0'))digits=digits.slice(1);digits=code+digits;}
 return /^\+[1-9][0-9]{6,14}$/.test(digits)?digits:null;
}
export function personalInput(input:unknown):{ok:true;value:PersonalProfile}|{ok:false;errors:InputErrors}{
 const errors:InputErrors={};if(!isRecord(input)||Object.keys(input).some(k=>!personalFields.includes(k as typeof personalFields[number])))return {ok:false,errors:{form:'invalid'}};
 const result={} as PersonalProfile;for(const key of ['firstName','lastName'] as const){const v=input[key];if(typeof v!=='string'||!v.trim())errors[key]='required';else if(v.trim().length>100||/[\u0000-\u001f\u007f\uD800-\uDFFF]/u.test(v))errors[key]='invalid';else result[key]=v.trim();}
 const phone=normalizePhone(input.callingCode,input.phone);if(!phone)errors.phone='invalid';else{result.phone=phone;result.callingCode=String(input.callingCode);}
 return Object.keys(errors).length?{ok:false,errors}:{ok:true,value:result};
}
export function registrationInput(input:Record<string,unknown>,legal:LegalRelease|null){const p=personalInput(Object.fromEntries(personalFields.map(k=>[k,input[k]])));const errors:InputErrors=p.ok?{}:{...p.errors};if(!legal)errors.acceptLegal='legal-unavailable';else if(input.acceptLegal!=='on'&&input.acceptLegal!==true)errors.acceptLegal='required';return Object.keys(errors).length?{ok:false as const,errors}:{ok:true as const,value:(p as {ok:true;value:PersonalProfile}).value};}
export const businessFields=['legalName','structure','country','website','postalCode','rcCity','representativeName','representativeRole'] as const;
export type BusinessDetails=Record<typeof businessFields[number],string>;
export type OnboardingData={profile:AgencyProfile;details:BusinessDetails;defaultLocale:'fr'|'ar';timeZone:'Africa/Casablanca'|'UTC'};
export function blankOnboarding(locale:'fr'|'ar'):OnboardingData{return {profile:{name:'',phone:'',email:'',address:'',city:'',ice:'',ifNumber:'',rc:''},details:{legalName:'',structure:'',country:'MA',website:'',postalCode:'',rcCity:'',representativeName:'',representativeRole:''},defaultLocale:locale,timeZone:'Africa/Casablanca'};}
export function onboardingInput(input:unknown,step=3):{ok:true;value:OnboardingData}|{ok:false;errors:InputErrors}{
 if(!isRecord(input)||Object.keys(input).sort().join()!==['defaultLocale','details','profile','timeZone'].sort().join()||!isRecord(input.details))return {ok:false,errors:{form:'invalid'}};
 const errors:InputErrors={},details={} as BusinessDetails;const core=validateAgencyProfile(input.profile);
 if(!core.ok)for(const [key,error]of Object.entries(core.errors))if(step>0||['name','phone','email','form'].includes(key))errors[key]=error==='required'?'required':'invalid';
 if(Object.keys(input.details).sort().join()!==[...businessFields].sort().join())errors.form='invalid';
 for(const k of businessFields){const v=input.details[k];if(typeof v!=='string'||v.length>(k==='website'?300:k.endsWith('Name')?200:100)||/[\u0000-\u001f\u007f\uD800-\uDFFF]/u.test(v))errors[k]='invalid';else details[k]=v.trim();}
 if(!['','individual','company','other'].includes(details.structure))errors.structure='invalid';
 if(details.structure==='company'&&!details.legalName)errors.legalName='required';
 if(details.website){try{const u=new URL(details.website);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)errors.website='invalid';}catch{errors.website='invalid';}}
 if(!/^[A-Z]{2}$/.test(details.country))errors.country='invalid';
 if(step>0){if(!details.representativeName)errors.representativeName='required';if(isRecord(input.profile)&&input.profile.rc&&!details.rcCity)errors.rcCity='required';}
 if(!['fr','ar'].includes(String(input.defaultLocale))||!['Africa/Casablanca','UTC'].includes(String(input.timeZone)))errors.form='invalid';
 return Object.keys(errors).length?{ok:false,errors}:{ok:true,value:{profile:core.ok?core.value:(input.profile as AgencyProfile),details,defaultLocale:input.defaultLocale as 'fr'|'ar',timeZone:input.timeZone as 'Africa/Casablanca'|'UTC'}};
}
