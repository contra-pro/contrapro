import { PDFDocument, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { pdf } from "../documents/uploads";
import { SigningFault, signingZones, type Session } from "./model";
import { digest } from "./crypto";
import { drawing,type Drawing } from "./representation";
export const signatureFontHash = (font: Uint8Array) => digest(font.length ? font : "Helvetica-WinAnsi-v1");
/** Visual typed signature appearances only. Never applied to provider-signed bytes. */
export async function signaturePdf(original: Uint8Array, session: Session, names: { agency?: string; client?: string }, fontBytes: Uint8Array, appearances: {agency?:Drawing|undefined;client?:Drawing|undefined;final?:boolean}={}) {
  if (session.assurance!=="simple" || digest(original)!==session.original.checksum) throw new SigningFault("modified-document");
  const zones=signingZones(session.original.signing.zones); let doc: PDFDocument;
  try { doc=await pdf(original); } catch { throw new SigningFault("modified-document"); }
  doc.registerFontkit(fontkit);
  let font; try { font=fontBytes.length ? await doc.embedFont(fontBytes,{subset:true}) : await doc.embedFont(StandardFonts.Helvetica); } catch { throw new SigningFault("unavailable"); }
  for (const zone of zones) {
    const page=doc.getPages()[zone.page-1];if(!page || zone.x+zone.width>page.getWidth() || zone.y+zone.height>page.getHeight()) throw new SigningFault("invalid");
    const text=names[zone.party];if(!text) continue;
    if ([...text].some(c=>!font.getCharacterSet().includes(c.codePointAt(0)!))) throw new SigningFault("invalid");
    const size=Math.min(12,zone.height-2), width=font.widthOfTextAtSize(text,size);
    if(width>zone.width || font.heightAtSize(size)>zone.height) throw new SigningFault("invalid");
    page.drawText(text,{font,size,x:session.locale==="ar" ? zone.x+zone.width-width : zone.x,y:page.getHeight()-zone.y-size});
    const raw=appearances[zone.party];if(raw){const value=drawing(raw),height=zone.height-size-4;if(height<4)throw new SigningFault("invalid");
      for(const stroke of value.strokes)for(let i=1;i<stroke.length;i++){const a=stroke[i-1]!,b=stroke[i]!;page.drawLine({start:{x:zone.x+a[0]!/1000*zone.width,y:page.getHeight()-zone.y-size-3-a[1]!/1000*height},end:{x:zone.x+b[0]!/1000*zone.width,y:page.getHeight()-zone.y-size-3-b[1]!/1000*height},thickness:.8});}}
  }
  if(appearances.final){
    const a=session.agencySignature,b=session.clientSignature;
    if(!a||!b||a.method!=="typed"||b.method!=="typed"||![a.at,b.at].every(t=>Number.isFinite(Date.parse(t))))throw new SigningFault("invalid");
    // Append an execution record; never reflow or replace approved contract pages.
    const page=doc.addPage([595,842]);let y=790;
    const lines=["ContratPro - simple electronic signature",`Contract reference: ${session.rentalId}`,`Signing reference: ${session.id}`,`Contract version: ${session.original.rentalVersion}`,`Original SHA-256: ${session.original.checksum}`,`Agency UTC: ${new Date(a.at).toISOString()}`,`Client UTC: ${new Date(b.at).toISOString()}`,"Order: agency, then client",`Agency appearance: ${a.drawing?"typed name + drawn-v1":"typed name"}`,`Client appearance: ${b.drawing?"typed name + drawn-v1":"typed name"}`,"Visual appearances; no certificate-based PDF signature."];
    for(const line of lines){page.drawText(line,{font:await doc.embedFont(StandardFonts.Helvetica),size:9,x:32,y});y-=24;}
  }
  doc.setCreationDate(new Date("2000-01-01T00:00:00Z"));doc.setModificationDate(new Date("2000-01-01T00:00:00Z"));
  return doc.save({useObjectStreams:false});
}
