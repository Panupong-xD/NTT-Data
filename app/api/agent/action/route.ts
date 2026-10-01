import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { actionId, decision, note, timestamp } = body;

    console.log(`[Local Next.js Agent HITL] Action ${actionId} -> Decision: ${decision}`);

    return NextResponse.json({
      success: true,
      actionId,
      decision,
      status: "recorded",
      timestamp: timestamp || new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process agent action" }, { status: 400 });
  }
}
