import { isStopword } from "./stopwords";

const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export type SearchIntent = "hours" | "price" | "insurance" | "booking" | "location" | "emergency" | "kids";

const INTENT_PATTERNS: Record<SearchIntent, RegExp> = {
  hours:
    /\b(hours?|opening|open|close[sd]?|schedule|office hours|weekday|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  price: /\b(price|prices|pricing|cost|fee|fees|how much|charge|pay for)\b/i,
  insurance: /\b(insurance|coverage|in-?network|plan|accept(ed)?|member id|billing)\b/i,
  booking: /\b(book|booking|appointment|schedule|reschedule|online form)\b/i,
  location: /\b(location|address|directions|parking|where are you|find you)\b/i,
  emergency: /\b(emergency|same-?day|tooth pain|swelling|broken tooth|urgent)\b/i,
  kids: /\b(child|children|kids|pediatric|age \d)\b/i,
};

const SYNONYM_GROUPS: string[][] = [
  ["hour", "hours", "opening", "open", "schedule", "office"],
  ["price", "prices", "pricing", "cost", "fee", "fees", "charge"],
  ["insurance", "coverage", "in-network", "network", "plan", "accept", "accepted"],
  ["book", "booking", "appointment", "schedule", "reschedule"],
  ["location", "address", "directions", "parking"],
  ["emergency", "urgent", "same-day", "pain"],
  ["child", "children", "kids", "pediatric"],
  ["cancel", "cancellation", "reschedule"],
  ["whiten", "whitening", "bleach"],
  ["payment", "financing", "careplan", "credit card"],
];

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !isStopword(t));
}

export function detectIntents(query: string): Set<SearchIntent> {
  const intents = new Set<SearchIntent>();
  for (const [intent, pattern] of Object.entries(INTENT_PATTERNS) as [SearchIntent, RegExp][]) {
    if (pattern.test(query)) intents.add(intent);
  }
  if (WEEKDAYS.some((d) => query.toLowerCase().includes(d))) {
    intents.add("hours");
  }
  return intents;
}

export interface ExpandedQuery {
  text: string;
  weight: number;
}

/** Expand query with synonyms and intent terms for multi-pass search. */
export function expandQueries(query: string): ExpandedQuery[] {
  const trimmed = query.trim();
  const queries: ExpandedQuery[] = [{ text: trimmed, weight: 1 }];
  const tokens = tokenize(trimmed);
  const extraTerms = new Set<string>();

  for (const token of tokens) {
    for (const group of SYNONYM_GROUPS) {
      if (group.some((g) => g === token || g.replace(/-/g, "") === token)) {
        for (const g of group) extraTerms.add(g);
      }
    }
  }

  const intents = detectIntents(trimmed);
  if (intents.has("hours")) {
    for (const d of WEEKDAYS) extraTerms.add(d);
    extraTerms.add("office hours");
    extraTerms.add("closed");
  }
  if (intents.has("price")) {
    extraTerms.add("sample price");
    extraTerms.add("$");
  }
  if (intents.has("insurance")) {
    extraTerms.add("in-network");
    extraTerms.add("member");
  }
  if (intents.has("booking")) {
    extraTerms.add("call");
    extraTerms.add("online");
  }
  if (intents.has("location")) {
    extraTerms.add("oakview");
    extraTerms.add("parking");
  }
  if (intents.has("emergency")) {
    extraTerms.add("same-day");
    extraTerms.add("tooth pain");
  }
  if (intents.has("kids")) {
    extraTerms.add("age");
    extraTerms.add("older");
  }

  for (const t of tokens) extraTerms.delete(t);
  if (extraTerms.size > 0) {
    queries.push({
      text: `${trimmed} ${[...extraTerms].slice(0, 12).join(" ")}`,
      weight: 0.45,
    });
  }

  return queries;
}
