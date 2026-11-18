import { NextRequest } from "next/server";
import { handleAccessProbe } from "../../../auth/access-probe";

export async function POST(request: NextRequest) { return handleAccessProbe(request); }
