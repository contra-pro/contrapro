import { NextRequest } from "next/server";
import { handleMaintenance } from "../../../../maintenance/handler";
export async function POST(request:NextRequest){return handleMaintenance(request);}
