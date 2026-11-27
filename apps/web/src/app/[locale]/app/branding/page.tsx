import { OperationsPage } from "../../../../operations/page";
export default async function Page({params}:{params:Promise<{locale:string}>}) {return OperationsPage({locale:(await params).locale,area:"branding"});}
