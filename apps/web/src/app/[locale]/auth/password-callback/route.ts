import type { NextRequest } from "next/server";
import { handlePasswordAuth } from "../../../../auth/password";
export async function GET(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  return handlePasswordAuth(request, (await params).locale, "password-callback");
}
