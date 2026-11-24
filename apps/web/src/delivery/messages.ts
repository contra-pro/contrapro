import { DeliveryFault,phone,type Material } from "./model";
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]!);
export function message(material:Material){const ar=material.locale==="ar";const subject=material.purpose==="verification-code"?(ar?"رمز تحقق منفصل":"Code de vérification séparé"):material.purpose==="agency-notification"?(ar?"اكتمل توقيع العقد":"Signature du contrat terminée"):material.purpose==="final-document"?(ar?"عقدكم الموقع متاح":"Votre contrat signé est disponible"):material.purpose==="reminder"?(ar?"تذكير بتوقيع العقد":"Rappel de signature du contrat"):(ar?"دعوة لتوقيع العقد":"Invitation à signer votre contrat");
  if(material.code&&material.link)throw new DeliveryFault("invalid");if(material.purpose==="verification-code"?!material.code||material.link:material.code!==null)throw new DeliveryFault("invalid");
  const action=material.code?`${ar?"رمزكم":"Votre code"} : ${material.code}`:material.link?`${ar?"الرابط الآمن":"Lien sécurisé"} : ${material.link}`:"";
  const expiry=`${ar?"صالح حتى":"Valable jusqu’au"} ${material.expiresAt}`;
  const text=[material.agencyName,subject,material.reference,action,expiry].join("\n");
  const html=`<!doctype html><html lang="${material.locale}" dir="${ar?"rtl":"ltr"}"><body style="font-family:Arial,sans-serif;text-align:${ar?"right":"left"};line-height:1.6"><h1>${escape(material.agencyName)}</h1><h2>${escape(subject)}</h2><p>${escape(material.reference)}</p>${material.link?`<p><a href="${escape(material.link)}">${escape(subject)}</a></p>`:`<p>${escape(action)}</p>`}<p>${escape(expiry)}</p></body></html>`;
  return {subject,text,html};}
export function whatsapp(material:Material){const recipient=phone(material.recipient),text=message(material).text;return {phone:recipient,message:text,url:`https://wa.me/${recipient.slice(1)}?text=${encodeURIComponent(text)}`};}
