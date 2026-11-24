import { NextRequest } from "next/server";
import { handleDocuments } from "../../../../documents/handler";
export const runtime = "nodejs";
export async function POST(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  return handleDocuments(request, (await params).locale);
}
