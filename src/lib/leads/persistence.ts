/** Vercel serverless has no durable disk; demo deploys use in-memory lead storage. */
export function useInMemoryLeadStore(): boolean {
  if (process.env.LEADS_MEMORY === "1") return true;
  return process.env.VERCEL === "1";
}

export function leadPersistenceNote(): string | undefined {
  if (!useInMemoryLeadStore()) return undefined;
  return "Demo deployment: submissions are accepted for the widget flow but are not permanently stored.";
}
