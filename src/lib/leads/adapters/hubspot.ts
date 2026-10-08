import type { LeadSinkAdapter } from "./types";
import type { LeadRecord } from "../../types";

/**
 * Optional HubSpot CRM adapter (disabled by default).
 * Set LEAD_SINK_HUBSPOT=true and HUBSPOT_PRIVATE_APP_TOKEN.
 * See docs/integrations/hubspot.md
 */
export function createHubSpotAdapter(): LeadSinkAdapter {
  const enabled = process.env.LEAD_SINK_HUBSPOT === "true";
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

  return {
    name: "hubspot",
    enabled: enabled && Boolean(token),
    async send(lead: LeadRecord) {
      if (!enabled || !token) return;
      const [firstName, ...rest] = lead.name.trim().split(/\s+/);
      const lastName = rest.join(" ") || "Visitor";
      await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          properties: {
            email: lead.email,
            firstname: firstName,
            lastname: lastName,
            message: lead.need,
            hs_lead_status: "NEW",
          },
        }),
      });
    },
  };
}
