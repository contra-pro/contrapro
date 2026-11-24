import { NextRequest } from "next/server";
import { handleDelivery } from "../../../../delivery/handler";
export const runtime="nodejs";
export async function POST(request:NextRequest,{params}:{params:Promise<{locale:string}>}){return handleDelivery(request,(await params).locale,true);}
