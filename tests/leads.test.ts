import { describe, expect, it, beforeEach } from "vitest";
import { LeadInputSchema } from "@/lib/leads/validation";
import { resetStoreForTests, saveLead, listLeads } from "@/lib/leads/store";
import { v4 as uuidv4 } from "uuid";

beforeEach(() => {
  resetStoreForTests();
});

describe("lead validation and storage", () => {
  it("rejects invalid email", () => {
    const result = LeadInputSchema.safeParse({
      botId: "bright-smile-demo",
      conversationId: uuidv4(),
      name: "Alex",
      email: "not-an-email",
      need: "Want a cleaning",
      reason: "buying_intent",
    });
    expect(result.success).toBe(false);
  });

  it("persists valid leads in memory when VERCEL=1", async () => {
    process.env.VERCEL = "1";
    resetStoreForTests();
    const convId = uuidv4();
    await saveLead({
      botId: "bright-smile-demo",
      conversationId: convId,
      name: "Casey Kim",
      email: "casey@example.com",
      need: "New patient exam",
      reason: "buying_intent",
    });
    expect(listLeads("bright-smile-demo")).toHaveLength(1);
    delete process.env.VERCEL;
    resetStoreForTests();
  });

  it("persists valid leads to sqlite and csv", async () => {
    const convId = uuidv4();
    const lead = await saveLead({
      botId: "bright-smile-demo",
      conversationId: convId,
      name: "Jordan Lee",
      email: "jordan@example.com",
      need: "Book a whitening consult",
      reason: "buying_intent",
    });
    expect(lead.id).toBeTruthy();
    const all = listLeads("bright-smile-demo");
    expect(all).toHaveLength(1);
    expect(all[0].email).toBe("jordan@example.com");
  });
});
