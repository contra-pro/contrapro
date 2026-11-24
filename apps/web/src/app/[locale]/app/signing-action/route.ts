import { NextRequest } from "next/server";
import { handleSigning } from "../../../../signing/handler";
export const runtime="nodejs";
export async function POST(request:NextRequest,{params}:{params:Promise<{locale:string}>}){return handleSigning(request,(await params).locale);}
