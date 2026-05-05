import { NextResponse } from "next/server";

import { computeHope } from "@/lib/engine";

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
    const { values } = computeHope(inputs as Record<string, string | number | null>);
    return NextResponse.json({
      ok: true,
      values,
      value_display: values,
    });
  } catch (err) {
    console.error("[compute]", err);
    return NextResponse.json(
      { ok: false, error: "Computation failed" },
      { status: 500 }
    );
  }
}
