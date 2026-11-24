import type { NextRequest } from "next/server";
import { handleSheets } from "../../../../../sheets/handler";
export const runtime="nodejs";
export async function GET(request:NextRequest,{params}:{params:Promise<{locale:string}>}){return handleSheets(request,(await params).locale,true);}
