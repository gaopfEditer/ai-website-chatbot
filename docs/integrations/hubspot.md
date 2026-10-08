# HubSpot CRM lead sink (optional, off by default)

1. Create a HubSpot private app with **crm.objects.contacts.write** scope.
2. Copy the access token.

```bash
LEAD_SINK_HUBSPOT=true
HUBSPOT_PRIVATE_APP_TOKEN=pat-...
```

When enabled, new leads create HubSpot contacts with email, name, and a message field. Local SQLite/CSV storage always remains on.
