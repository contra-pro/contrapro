import type { ReactNode } from "react";
export function StatusBadge({children,tone="neutral"}:{children:ReactNode;tone?:"neutral"|"success"|"warning"|"danger"}){return <span className={`status-badge status-${tone}`}>{children}</span>;}
export function EmptyState({title,description,children}:{title:string;description?:string;children?:ReactNode}){return <section className="empty-state"><h2>{title}</h2>{description&&<p>{description}</p>}{children}</section>;}
export function LoadingState({label}:{label:string}){return <div className="loading-state" role="status" aria-live="polite"><span className="loading-line" aria-hidden="true"/>{label}</div>;}
export function ErrorState({title,children}:{title:string;children?:ReactNode}){return <section className="error-state" role="alert"><p>{title}</p>{children}</section>;}
export function FormSection({title,description,children}:{title:string;description?:string;children:ReactNode}){return <fieldset className="form-section"><legend>{title}</legend>{description&&<p className="field-hint">{description}</p>}{children}</fieldset>;}
export function Pagination({page,total,pageSize=20,previous,next,label,onPage,busy=false}:{page:number;total:number;pageSize?:number;previous:string;next:string;label:string;onPage:(page:number)=>void;busy?:boolean}){
 return <nav className="pagination" aria-label={label}><button type="button" disabled={busy||page<=1} onClick={()=>onPage(page-1)}>{previous}</button><span aria-live="polite">{label} {page} / {Math.max(1,Math.ceil(total/pageSize))}</span><button type="button" disabled={busy||page>=10000||page*pageSize>=total} onClick={()=>onPage(page+1)}>{next}</button></nav>;
}
