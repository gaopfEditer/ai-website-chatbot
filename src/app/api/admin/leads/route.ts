import { NextRequest, NextResponse } from "next/server";
import { isAdminDemoMode, requireAdminAuth } from "@/lib/admin/auth";
import { getSampleLeads } from "@/lib/admin/sample-data";
import { listLeads } from "@/lib/leads/store";

export async function GET(req: NextRequest) {
  const denied = requireAdminAuth(req.headers.get("authorization"));
  if (denied) return denied;

  const botId = req.nextUrl.searchParams.get("botId") ?? "bright-smile-demo";

  if (isAdminDemoMode()) {
    return NextResponse.json({
      leads: getSampleLeads(botId),
      demoMode: true,
      readOnly: true,
    });
  }

  return NextResponse.json({ leads: listLeads(botId), demoMode: false, readOnly: false });
}
