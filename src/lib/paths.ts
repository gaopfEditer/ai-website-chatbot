import path from "path";

export const ROOT = process.cwd();

export function dataPath(...segments: string[]): string {
  return path.join(ROOT, "data", ...segments);
}

export function botConfigPath(botId: string): string {
  return dataPath("bots", `${botId}.json`);
}

export function indexPath(botId: string): string {
  return dataPath("index", `${botId}.json`);
}
