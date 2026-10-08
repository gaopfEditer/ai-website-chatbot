"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const BOT_ID = "bright-smile-demo";

const adminFetch = (input: RequestInfo | URL, init?: RequestInit) =>
  fetch(input, { ...init, credentials: "same-origin" });

type Lead = {
  id: string;
  name: string;
  email: string;
  need: string;
  reason: string;
  createdAt: string;
};

type Conversation = {
  id: string;
  updatedAt: string;
  messages: { role: string; content: string }[];
  leadCaptured: boolean;
};

export default function AdminPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [greeting, setGreeting] = useState("");
  const [handoffEmail, setHandoffEmail] = useState("");
  const [status, setStatus] = useState("");
  const [readOnly, setReadOnly] = useState(true);
  const [demoMode, setDemoMode] = useState(true);

  const refresh = useCallback(async () => {
    const [l, c, cfg] = await Promise.all([
      adminFetch(`/api/admin/leads?botId=${BOT_ID}`).then((r) => r.json()),
      adminFetch(`/api/admin/conversations?botId=${BOT_ID}`).then((r) => r.json()),
      adminFetch(`/api/admin/config?botId=${BOT_ID}`).then((r) => r.json()),
    ]);
    setLeads(l.leads ?? []);
    setConversations(c.conversations ?? []);
    setReadOnly(Boolean(l.readOnly ?? cfg.readOnly));
    setDemoMode(Boolean(l.demoMode ?? cfg.demoMode));
    if (cfg.config) {
      setGreeting(cfg.config.greeting);
      setHandoffEmail(cfg.config.handoffEmail);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function saveConfig(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) {
      setStatus("Demo mode: settings are read-only.");
      return;
    }
    const res = await adminFetch("/api/admin/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ botId: BOT_ID, greeting, handoffEmail }),
    });
    if (!res.ok) {
      setStatus("Could not save settings.");
      return;
    }
    setStatus("Settings saved.");
  }

  async function reindex() {
    if (readOnly) {
      setStatus("Demo mode: re-index is disabled.");
      return;
    }
    setStatus("Re-indexing…");
    const res = await adminFetch("/api/admin/reindex", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ botId: BOT_ID }),
    });
    const body = await res.json();
    if (!res.ok) {
      setStatus(body.error ?? "Re-index failed.");
      return;
    }
    setStatus(`Index updated: ${body.chunkCount} chunks.`);
    await refresh();
  }

  return (
    <main className="container">
      <p>
        <Link href="/">← Home</Link> · <Link href="/demo">Demo site</Link>
      </p>
      <h1>Admin — {BOT_ID}</h1>
      {demoMode ? (
        <p className="card" style={{ background: "#fff8e6", borderColor: "#f0d78c" }}>
          <strong>Public demo mode.</strong> Sample leads and conversations are shown only — live
          submissions are never listed here. Set <code>ADMIN_PASSWORD</code> in the environment to
          enable HTTP Basic auth and the full admin (real leads, settings, re-index on local/VPS
          hosts).
        </p>
      ) : (
        <p>Protected admin — HTTP Basic auth (any username, password = <code>ADMIN_PASSWORD</code>).</p>
      )}
      {status && <p>{status}</p>}

      <div className="card">
        <h2>Bot settings</h2>
        <form onSubmit={saveConfig}>
          <label htmlFor="greeting">Greeting</label>
          <textarea
            id="greeting"
            rows={3}
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
            readOnly={readOnly}
          />
          <label htmlFor="email">Handoff email</label>
          <input
            id="email"
            type="email"
            value={handoffEmail}
            onChange={(e) => setHandoffEmail(e.target.value)}
            readOnly={readOnly}
          />
          <button className="btn" type="submit" disabled={readOnly}>
            Save
          </button>
        </form>
        <p style={{ marginTop: "1rem" }}>
          <button className="btn secondary" type="button" onClick={reindex} disabled={readOnly}>
            Re-index documents
          </button>
        </p>
      </div>

      <div className="card">
        <h2>
          Leads ({leads.length}){demoMode ? " — sample data" : ""}
        </h2>
        {leads.length === 0 ? (
          <p>No leads yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th align="left">When</th>
                <th align="left">Name</th>
                <th align="left">Email</th>
                <th align="left">Need</th>
                <th align="left">Reason</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} style={{ borderTop: "1px solid #eee" }}>
                  <td>{new Date(lead.createdAt).toLocaleString()}</td>
                  <td>{lead.name}</td>
                  <td>{lead.email}</td>
                  <td>{lead.need}</td>
                  <td>{lead.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>Recent conversations{demoMode ? " (sample)" : ""}</h2>
        {conversations.slice(0, 10).map((conv) => (
          <details key={conv.id} style={{ marginBottom: "0.75rem" }}>
            <summary>
              {conv.id.slice(0, 8)}… — {new Date(conv.updatedAt).toLocaleString()}
              {conv.leadCaptured ? " · lead captured" : ""}
            </summary>
            <ul>
              {conv.messages.map((m, i) => (
                <li key={i}>
                  <strong>{m.role}:</strong> {m.content.slice(0, 200)}
                  {m.content.length > 200 ? "…" : ""}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </main>
  );
}
