/** Bounded vector data only: no SVG markup, image URLs, pressure or device data. */
export type Drawing = { version: "drawn-v1"; strokes: number[][][] };
export const drawingNotice = {
  fr: "Le dessin accompagne mon nom saisi. Il est une représentation visuelle, pas une preuve indépendante d’identité ni une signature cryptographique.",
  ar: "يرافق الرسم اسمي المكتوب. وهو تمثيل بصري، وليس دليلاً مستقلاً على الهوية أو توقيعاً تشفيرياً.",
};
export function drawing(value: unknown): Drawing {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("invalid");
  const p=value as Record<string,unknown>;
  if(Object.keys(p).sort().join()!=="strokes,version" || p.version!=="drawn-v1" || !Array.isArray(p.strokes) || p.strokes.length<1 || p.strokes.length>20) throw Error("invalid");
  let total=0, movement=false;
  const strokes=p.strokes.map(s=>{
    if(!Array.isArray(s)||s.length<2||s.length>160)throw Error("invalid");total+=s.length;
    return s.map((point,i)=>{
      if(!Array.isArray(point)||point.length!==2||point.some(n=>typeof n!=="number"||!Number.isInteger(n)||n<0||n>1000))throw Error("invalid");
      if(i && (point[0]!==s[i-1][0]||point[1]!==s[i-1][1]))movement=true;
      return [point[0],point[1]];
    });
  });
  if(total>1000||!movement)throw Error("invalid");return {version:"drawn-v1",strokes};
}
