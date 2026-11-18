import { NextRequest } from "next/server";
import { handleAuth } from "../../../../auth/handlers";
export async function POST(request: NextRequest, context: { params: Promise<{ locale: string }> }) {
  return handleAuth(request, (await context.params).locale, "sign-out");
}
