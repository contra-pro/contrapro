import { NextRequest } from "next/server";
import { handleClients } from "../../../../clients/handler";
export async function POST(request: NextRequest, context: { params: Promise<{ locale: string }> }) {
  return handleClients(request, (await context.params).locale);
}
