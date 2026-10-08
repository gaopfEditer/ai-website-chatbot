# Google Sheets lead sink (optional, off by default)

1. Create a Google Apps Script web app that accepts `POST` JSON and appends a row to a sheet.
2. Deploy the web app and copy the URL.
3. Set environment variables:

```bash
LEAD_SINK_GOOGLE_SHEETS=true
GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/....../exec
```

When enabled, each saved lead is POSTed to the webhook in addition to local SQLite/CSV storage.
