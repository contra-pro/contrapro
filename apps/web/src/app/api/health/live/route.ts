import { NextResponse } from "next/server";
export function GET(){return NextResponse.json({live:true},{headers:{"Cache-Control":"no-store"}});}
