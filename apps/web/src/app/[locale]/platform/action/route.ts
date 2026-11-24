import { NextRequest } from "next/server";
import { handleBilling } from "../../../../billing/handler";
export async function POST(request:NextRequest,{params}:{params:Promise<{locale:string}>}){return handleBilling(request,(await params).locale,true);}
