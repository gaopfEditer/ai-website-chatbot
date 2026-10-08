import { NextRequest, NextResponse } from "next/server";
import { loadBotConfig } from "@/lib/bot-config";
import { corsHeaders } from "@/lib/http/cors";

/** Public widget config — no secrets */
export async function GET(req: NextRequest) {
  const botId = req.nextUrl.searchParams.get("botId") ?? "bright-smile-demo";
  const origin = req.headers.get("origin");
  try {
    const config = loadBotConfig(botId);
    const headers = corsHeaders(origin, config);
    if (origin && !headers["Access-Control-Allow-Origin"]) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403, headers });
    }
    return NextResponse.json(
      {
        botId: config.id,
        businessName: config.businessName,
        greeting: config.greeting,
      },
      { headers }
    );
  } catch {
    return NextResponse.json({ error: "Unknown bot" }, { status: 404 });
  }
}
