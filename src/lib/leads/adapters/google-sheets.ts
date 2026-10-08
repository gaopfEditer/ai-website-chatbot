import type { LeadSinkAdapter } from "./types";
import type { LeadRecord } from "../../types";

/**
 * Optional Google Sheets adapter (disabled by default).
 * Set LEAD_SINK_GOOGLE_SHEETS=true, GOOGLE_SHEETS_WEBHOOK_URL to a Google Apps Script
 * or compatible endpoint that accepts JSON POST { name, email, need, ... }.
 * See docs/integrations/google-sheets.md
 */
export function createGoogleSheetsAdapter(): LeadSinkAdapter {
  const enabled = process.env.LEAD_SINK_GOOGLE_SHEETS === "true";
  const webhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

  return {
    name: "google-sheets",
    enabled: enabled && Boolean(webhook),
    async send(lead: LeadRecord) {
      if (!enabled || !webhook) return;
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });
    },
  };
}
