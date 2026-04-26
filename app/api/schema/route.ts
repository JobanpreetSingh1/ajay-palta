import { NextResponse } from "next/server";

import { MASTER_SCHEMA } from "@/lib/hope/master-schema";

export async function GET() {
  return NextResponse.json(MASTER_SCHEMA);
}
