import type { BotConfig } from "../bot-config";
import { isOriginAllowed } from "../bot-config";

export function corsHeaders(origin: string | null, config: BotConfig): Record<string, string> {
  const allowed = origin && isOriginAllowed(origin, config);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (allowed && origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  return headers;
}
