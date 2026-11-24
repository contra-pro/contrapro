import { NextRequest } from "next/server";
import { handleProviderWebhook } from "../../../../../signing/webhook";
export const runtime="nodejs";
export async function POST(request:NextRequest,{params}:{params:Promise<{providerId:string}>}){return handleProviderWebhook(request,(await params).providerId);}
