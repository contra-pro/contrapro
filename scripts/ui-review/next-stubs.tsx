import type { AnchorHTMLAttributes,ImgHTMLAttributes } from "react";
export default function Link({href,prefetch:_,...props}:AnchorHTMLAttributes<HTMLAnchorElement>&{prefetch?:boolean}){return <a {...props} href={href}/>;}
export function Image({src,alt,width,height,className}:ImgHTMLAttributes<HTMLImageElement>){return <img src={src} alt={alt} width={width} height={height} className={className}/>;}
export const useRouter=()=>({push:(path:string)=>location.assign(path),replace:(path:string)=>location.replace(path),refresh:()=>location.reload()});
export const notFound=()=>{throw Error("Fixture route unavailable");};
