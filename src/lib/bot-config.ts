import fs from "fs";
import { z } from "zod";
import { botConfigPath } from "./paths";

const BotConfigSchema = z.object({
  id: z.string(),
  businessName: z.string(),
  greeting: z.string(),
  handoffEmail: z.string().email(),
  allowedOrigins: z.array(z.string()),
  docsPath: z.string(),
  unknownConfidenceThreshold: z.number().default(4),
});

export type BotConfig = z.infer<typeof BotConfigSchema>;

export function loadBotConfig(botId: string): BotConfig {
  const raw = fs.readFileSync(botConfigPath(botId), "utf8");
  const config = BotConfigSchema.parse(JSON.parse(raw));
  const extra =
    process.env.ALLOWED_ORIGINS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  if (process.env.VERCEL_URL) {
    extra.push(`https://${process.env.VERCEL_URL}`);
  }
  config.allowedOrigins = [...new Set([...config.allowedOrigins, ...extra])];
  return config;
}

export function saveBotConfig(config: BotConfig): void {
  fs.writeFileSync(botConfigPath(config.id), JSON.stringify(config, null, 2));
}

export function isOriginAllowed(origin: string | null, config: BotConfig): boolean {
  if (!origin) return true;
  if (config.allowedOrigins.includes("*")) return true;
  return config.allowedOrigins.some((allowed) => {
    if (allowed === origin) return true;
    try {
      const o = new URL(origin);
      const a = new URL(allowed);
      return o.hostname === a.hostname && o.protocol === a.protocol;
    } catch {
      return false;
    }
  });
}
