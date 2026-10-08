"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const BOT_ID = "bright-smile-demo";

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

  const refresh = useCallback(async () => {
    const [l, c, cfg] = await Promise.all([
      fetch(`/api/admin/leads?botId=${BOT_ID}`).then((r) => r.json()),
      fetch(`/api/admin/conversations?botId=${BOT_ID}`).then((r) => r.json()),
      fetch(`/api/admin/config?botId=${BOT_ID}`).then((r) => r.json()),
    ]);
    setLeads(l.leads ?? []);
    setConversations(c.conversations ?? []);
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
    await fetch("/api/admin/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ botId: BOT_ID, greeting, handoffEmail }),
    });
    setStatus("Settings saved.");
  }

  async function reindex() {
    setStatus("Re-indexing…");
    const res = await fetch("/api/admin/reindex", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ botId: BOT_ID }),
    }).then((r) => r.json());
    setStatus(`Index updated: ${res.chunkCount} chunks.`);
    await refresh();
  }

  return (
    <main className="container">
      <p>
        <Link href="/">← Home</Link> · <Link href="/demo">Demo site</Link>
      </p>
      <h1>Admin — {BOT_ID}</h1>
      <p>Demo admin UI (no auth in this portfolio build). Do not expose publicly without protection.</p>
      {status && <p>{status}</p>}

      <div className="card">
        <h2>Bot settings</h2>
        <form onSubmit={saveConfig}>
          <label htmlFor="greeting">Greeting</label>
          <textarea id="greeting" rows={3} value={greeting} onChange={(e) => setGreeting(e.target.value)} />
          <label htmlFor="email">Handoff email</label>
          <input id="email" type="email" value={handoffEmail} onChange={(e) => setHandoffEmail(e.target.value)} />
          <button className="btn" type="submit">
            Save
          </button>
        </form>
        <p style={{ marginTop: "1rem" }}>
          <button className="btn secondary" type="button" onClick={reindex}>
            Re-index documents
          </button>
        </p>
      </div>

      <div className="card">
        <h2>Leads ({leads.length})</h2>
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
        <h2>Recent conversations</h2>
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
