import { NextRequest } from "next/server";
import { handleAgencyAction } from "../../../../agency/handler";
export async function POST(request: NextRequest, context: { params: Promise<{ locale: string }> }) {
  return handleAgencyAction(request, (await context.params).locale);
}
