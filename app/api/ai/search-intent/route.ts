import { NextRequest, NextResponse } from "next/server";
import { serverAIProvider } from "@/ai/server-provider";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query } = body as { query: string };

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Invalid payload: 'query' string required." },
        { status: 400 }
      );
    }

    const result = await serverAIProvider.parseSearchIntent(query);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[API /api/ai/search-intent] Error:", err);
    return NextResponse.json(
      { error: "Failed to parse search intent" },
      { status: 500 }
    );
  }
}
