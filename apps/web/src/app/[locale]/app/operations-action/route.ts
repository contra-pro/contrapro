import { NextRequest } from "next/server";
import { handleOperations } from "../../../../operations/handler";
export const runtime = "nodejs";
export async function POST(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) { return handleOperations(request, (await params).locale); }
