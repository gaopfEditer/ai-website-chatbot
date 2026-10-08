import { NextRequest, NextResponse } from "next/server";
import { loadBotConfig } from "@/lib/bot-config";
import { corsHeaders } from "@/lib/http/cors";
import { LeadInputSchema } from "@/lib/leads/validation";
import { saveLead } from "@/lib/leads/store";
import { checkRateLimit, clientKey } from "@/lib/safety/rate-limit";

export async function OPTIONS(req: NextRequest) {
  const botId = req.nextUrl.searchParams.get("botId") ?? "bright-smile-demo";
  try {
    const config = loadBotConfig(botId);
    return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin"), config) });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const limit = checkRateLimit(`leads:${clientKey(req)}`);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  let input;
  try {
    input = LeadInputSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Validation failed", details: e }, { status: 400 });
  }

  let config;
  try {
    config = loadBotConfig(input.botId);
  } catch {
    return NextResponse.json({ error: "Unknown bot" }, { status: 404 });
  }

  const headers = corsHeaders(origin, config);
  if (origin && !headers["Access-Control-Allow-Origin"]) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403, headers });
  }

  const lead = await saveLead(input);
  return NextResponse.json(
    {
      ok: true,
      message: `Thanks! Our team will reach out at ${lead.email}.`,
    },
    { headers }
  );
}
