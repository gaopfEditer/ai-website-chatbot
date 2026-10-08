import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { loadBotConfig } from "@/lib/bot-config";
import { corsHeaders } from "@/lib/http/cors";
import { handleUserMessage } from "@/lib/chat/handle-message";
import { appendMessage, getOrCreateConversation } from "@/lib/leads/store";
import { checkRateLimit, clientKey } from "@/lib/safety/rate-limit";

const BodySchema = z.object({
  botId: z.string(),
  conversationId: z.string().uuid(),
  message: z.string().min(1).max(4000),
});

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
  const limit = checkRateLimit(`chat:${clientKey(req)}`);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let config;
  try {
    config = loadBotConfig(body.botId);
  } catch {
    return NextResponse.json({ error: "Unknown bot" }, { status: 404 });
  }

  const headers = corsHeaders(origin, config);
  if (origin && !headers["Access-Control-Allow-Origin"]) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403, headers });
  }

  const conv = getOrCreateConversation(body.conversationId, body.botId);
  appendMessage(body.conversationId, { role: "user", content: body.message });

  const payload = await handleUserMessage({
    botId: body.botId,
    message: body.message,
    history: conv.messages,
  });

  appendMessage(body.conversationId, { role: "assistant", content: payload.reply });

  return NextResponse.json(
    {
      ...payload,
      greeting: config.greeting,
      handoffEmail: config.handoffEmail,
    },
    { headers }
  );
}
