import type { NextRequest } from "next/server";
import { handleRentals } from "../../../../rentals/handler";
export async function POST(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  return handleRentals(request, (await params).locale);
}
