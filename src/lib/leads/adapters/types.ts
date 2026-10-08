import type { LeadRecord } from "../../types";

export interface LeadSinkAdapter {
  name: string;
  enabled: boolean;
  send(lead: LeadRecord): Promise<void>;
}
