import { NextResponse } from "next/server";

import { computeHopeCycle } from "@/lib/hope/compute-hope";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const inputs = (body as { inputs?: unknown })?.inputs;
  if (!inputs || typeof inputs !== "object" || Array.isArray(inputs)) {
    return NextResponse.json(
      { ok: false, error: "Expected { inputs: object }" },
      { status: 400 }
    );
  }

  try {
    const { values, value_display } = computeHopeCycle(inputs as Record<string, unknown>);
    return NextResponse.json({
      ok: true,
      values,
      value_display,
    });
  } catch (err) {
    console.error("[compute]", err);
    return NextResponse.json(
      { ok: false, error: "Computation failed" },
      { status: 500 }
    );
  }
}
