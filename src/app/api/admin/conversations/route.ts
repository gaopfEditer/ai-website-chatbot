import { NextRequest, NextResponse } from "next/server";
import { listConversations } from "@/lib/leads/store";

export async function GET(req: NextRequest) {
  const botId = req.nextUrl.searchParams.get("botId") ?? undefined;
  return NextResponse.json({ conversations: listConversations(botId) });
}
