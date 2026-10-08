import { NextRequest, NextResponse } from "next/server";
import { loadBotConfig, saveBotConfig } from "@/lib/bot-config";
import { z } from "zod";

const UpdateSchema = z.object({
  botId: z.string(),
  greeting: z.string().min(1).max(2000),
  handoffEmail: z.string().email(),
});

export async function GET(req: NextRequest) {
  const botId = req.nextUrl.searchParams.get("botId") ?? "bright-smile-demo";
  try {
    return NextResponse.json({ config: loadBotConfig(botId) });
  } catch {
    return NextResponse.json({ error: "Unknown bot" }, { status: 404 });
  }
}

export async function PUT(req: NextRequest) {
  const body = UpdateSchema.parse(await req.json());
  const config = loadBotConfig(body.botId);
  config.greeting = body.greeting;
  config.handoffEmail = body.handoffEmail;
  saveBotConfig(config);
  return NextResponse.json({ config });
}
