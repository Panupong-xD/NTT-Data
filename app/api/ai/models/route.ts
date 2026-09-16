import { NextResponse } from "next/server";
import { getSwuModels } from "@/lib/services/ai/swu";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { apiKey?: string; userId?: string } || {};
    return NextResponse.json(await getSwuModels(body.apiKey, body.userId));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "SWU models request failed" },
      { status: 502 }
    );
  }
}
