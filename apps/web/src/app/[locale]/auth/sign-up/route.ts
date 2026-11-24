import type { NextRequest } from "next/server";
import { handlePasswordAuth } from "../../../../auth/password";
export async function POST(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  return handlePasswordAuth(request, (await params).locale, "sign-up");
}
