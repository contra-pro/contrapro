import { NextRequest } from "next/server";
import { handleProvisioning } from "../../../../auth/provisioning-handler";

export async function POST(request: NextRequest, context: { params: Promise<{ locale: string }> }) {
  return handleProvisioning(request, (await context.params).locale);
}
