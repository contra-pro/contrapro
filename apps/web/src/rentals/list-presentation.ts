import type {RentalSummary} from './data';
export function visibleRentals(items:readonly RentalSummary[],query:string,state:string,sort:string):RentalSummary[]{
 const text=query.trim().toLocaleLowerCase();return items.filter(r=>(!state||r.state===state)&&(!text||(r.contract_number??'').toLocaleLowerCase().includes(text))).sort((a,b)=>sort==='start-asc'?a.starts_at.localeCompare(b.starts_at):sort==='start-desc'?b.starts_at.localeCompare(a.starts_at):sort==='reference'?(a.contract_number??'').localeCompare(b.contract_number??''):0);
}
