# SiteBot — Website AI Assistant (Portfolio Demo)

Small businesses get the same repetitive questions on their website: hours, pricing, insurance, booking. **SiteBot** is a embeddable chat assistant that answers **only from the company’s own documents**, cites the source, and **captures leads** when it cannot help or detects buying intent.

> **Sample business:** [Bright Smile Dental Clinic](data/sample-business/bright-smile-dental/) — entirely fictional sample data for this demo.

## Problem

- Visitors leave when they cannot find answers quickly.
- Owners cannot staff live chat 24/7.
- Generic chatbots invent facts; SiteBot is doc-grounded and refuses to guess.

## Features

| Area | Behavior |
|------|----------|
| **Knowledge** | Ingest Markdown, PDF, HTML, and plain text into a local retrieval index |
| **Answers** | Offline BM25-style search (MiniSearch) + templated excerpts with **source citations** |
| **LLM (optional)** | Set `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` for OpenAI-compatible APIs |
| **Honesty** | Low-confidence or missing docs → “I don’t know” + lead form |
| **Leads** | Name, email, need; email validation; **SQLite + CSV** by default |
| **Integrations** | Pluggable **Google Sheets** and **HubSpot** adapters (disabled by default) |
| **Embed** | One script tag adds a chat bubble |
| **Admin** | Conversations, leads, re-index, edit greeting & handoff email |
| **Safety** | Rate limits, injection-resistant LLM system prompt, no secrets in widget, CORS allowlist |

## Screenshots

| Demo site + widget | Answered question | Lead fallback | Admin |
|--------------------|-------------------|---------------|-------|
| ![Demo site](docs/screenshots/01-demo-site-with-widget.png) | ![Citation answer](docs/screenshots/02-answer-with-citation.png) | ![Lead capture](docs/screenshots/03-lead-capture-fallback.png) | ![Admin](docs/screenshots/04-admin-leads-view.png) |

## One-line embed

```html
<script src="https://YOUR-DEPLOYED-HOST/widget.js" data-bot-id="bright-smile-demo"></script>
```

Locally:

```html
<script src="http://localhost:3000/widget.js" data-bot-id="bright-smile-demo"></script>
```

## Run locally (~2 minutes, fully offline)

```bash
npm install
npm run demo
```

- App: [http://localhost:3000](http://localhost:3000)
- Sample business site with widget: [http://localhost:3000/demo](http://localhost:3000/demo)
- Admin: [http://localhost:3000/admin](http://localhost:3000/admin)

`npm run demo` builds the retrieval index and starts Next.js. **No API keys required.**

### Tests

```bash
npm test
```

### Regenerate screenshots (Playwright)

```bash
npx playwright install chromium
npm run screenshots
```

## Load your own documents

1. Copy `data/bots/bright-smile-demo.json` to a new bot id (e.g. `my-shop.json`).
2. Point `docsPath` at your folder of `.md`, `.txt`, `.html`, `.pdf` files.
3. Run `BOT_ID=my-shop npm run ingest`.
4. Embed with `data-bot-id="my-shop"`.
5. Add your site origin to `allowedOrigins` in the bot JSON (or set `ALLOWED_ORIGINS` env var).

Re-index from the admin UI or:

```bash
curl -X POST http://localhost:3000/api/admin/reindex -H 'Content-Type: application/json' -d '{"botId":"bright-smile-demo"}'
```

## Optional LLM mode

```bash
export LLM_BASE_URL=https://api.openai.com/v1
export LLM_API_KEY=sk-...
export LLM_MODEL=gpt-4o-mini
npm run demo
```

Answers still use retrieved passages in the prompt; the system instructions forbid hallucination.

## Lead storage & CRM / Sheets

**Default:** `data/leads.db` (SQLite) and append-only `data/leads.csv`.

**Google Sheets (off by default):** see [docs/integrations/google-sheets.md](docs/integrations/google-sheets.md)

**HubSpot (off by default):** see [docs/integrations/hubspot.md](docs/integrations/hubspot.md)

## Deploy to Vercel (free tier)

1. Import this repository in Vercel (Next.js detected; `vercel.json` included).
2. Set `ALLOWED_ORIGINS` to your customer sites (comma-separated URLs).
3. Optional: LLM and lead sink env vars from `.env.example`.
4. Deploy. Use `https://<project>.vercel.app/widget.js` in the embed snippet.

**Note:** Serverless filesystem is ephemeral; leads persist for the lifetime of the deployment’s writable storage. For production, point lead sinks at Sheets/HubSpot or swap SQLite for a hosted database.

## Project layout

- `public/widget.js` — embeddable bubble (no secrets)
- `data/sample-business/` — fictional Bright Smile docs
- `data/index/` — generated retrieval index (created by `npm run ingest`)
- `src/app/api/` — chat, leads, widget config, admin APIs
- `src/lib/` — ingestion, retrieval, offline/LLM answering, lead store

## License

MIT (portfolio demo).
