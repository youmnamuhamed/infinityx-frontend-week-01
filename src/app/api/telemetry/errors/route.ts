import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Mock telemetry sink for local testing/verification.
//
// errorLogger.ts posts sanitized error payloads here via sendBeacon/fetch.
// This just logs to the server terminal and returns 200 — swap this out for
// a real ingestion pipeline (Sentry, Datadog, a custom store, etc.) later.
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const payload = await request.json();
    console.log("\n[telemetry:errors] Received payload:");
    console.log(JSON.stringify(payload, null, 2));
    return NextResponse.json({ received: true }, { status: 200 });
  } catch {
    return NextResponse.json({ received: false }, { status: 400 });
  }
}
