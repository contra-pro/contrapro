import { PDFDocument, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { pdf } from "../documents/uploads";
import { SigningFault, signingZones, type Session } from "./model";
import { digest } from "./crypto";
export const signatureFontHash = (font: Uint8Array) => digest(font.length ? font : "Helvetica-WinAnsi-v1");
/** Visual typed signature appearances only. Never applied to provider-signed bytes. */
export async function signaturePdf(original: Uint8Array, session: Session, names: { agency?: string; client?: string }, fontBytes: Uint8Array) {
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
  }
  doc.setCreationDate(new Date("2000-01-01T00:00:00Z"));doc.setModificationDate(new Date("2000-01-01T00:00:00Z"));
  return doc.save({useObjectStreams:false});
}
