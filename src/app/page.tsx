import Link from "next/link";

export default function HomePage() {
  const embed = `<script src="https://YOUR-DOMAIN/widget.js" data-bot-id="bright-smile-demo"></script>`;

  return (
    <main className="container">
      <h1>SiteBot (portfolio demo)</h1>
      <p>
        A one-line embeddable website assistant for small businesses. Answers from the company&apos;s
        own documents, cites sources, and captures leads when docs don&apos;t cover a question.
      </p>
      <p>
        <Link href="/demo">View sample business site</Link> · <Link href="/admin">Admin</Link>
      </p>

      <div className="card">
        <h2>Embed snippet</h2>
        <pre>{embed}</pre>
        <p>Replace <code>YOUR-DOMAIN</code> with your deployed host (or <code>http://localhost:3000</code> locally).</p>
      </div>

      <div className="card">
        <h2>Run locally in ~2 minutes</h2>
        <pre>{`npm install
npm run demo`}</pre>
        <p>
          Opens Next.js on port 3000, builds the offline retrieval index, and serves the widget. No API keys
          required.
        </p>
      </div>
    </main>
  );
}
