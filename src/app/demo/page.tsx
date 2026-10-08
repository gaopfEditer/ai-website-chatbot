import Script from "next/script";

export default function DemoBusinessPage() {
  return (
    <>
      <header
        style={{
          background: "#0f766e",
          color: "#fff",
          padding: "1.5rem",
        }}
      >
        <div className="container" style={{ padding: 0 }}>
          <p style={{ margin: 0, opacity: 0.85, fontSize: 14 }}>Sample data — fictional business</p>
          <h1 style={{ margin: "0.25rem 0" }}>Bright Smile Dental Clinic</h1>
          <p style={{ margin: 0 }}>412 Oakview Lane · Maple Grove · (555) 014-7721</p>
        </div>
      </header>

      <main className="container">
        <section className="card">
          <h2>Family dentistry in Maple Grove</h2>
          <p>
            Preventive cleanings, restorative care, and cosmetic whitening. This page is a demo host site
            showing the embedded assistant bubble (bottom-right).
          </p>
          <ul>
            <li>Mon–Fri hours with select Saturdays</li>
            <li>In-network with sample plans listed in our FAQ docs</li>
            <li>Same-day emergency slots when available</li>
          </ul>
        </section>
        <section className="card">
          <h2>Try the assistant</h2>
          <p>Ask about office hours, whitening prices, or insurance. Ask about something not in the docs (e.g.
            &quot;Do you offer braces?&quot;) to see the lead-capture fallback.</p>
        </section>
      </main>

      <Script src="/widget.js" data-bot-id="bright-smile-demo" strategy="afterInteractive" />
    </>
  );
}
