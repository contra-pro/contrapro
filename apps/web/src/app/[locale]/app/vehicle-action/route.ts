import type { NextRequest } from "next/server";
import { handleVehicles } from "../../../../vehicles/handler";
export async function POST(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  return handleVehicles(request, (await params).locale);
}
