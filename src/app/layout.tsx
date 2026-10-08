import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SiteBot — Website AI Assistant Demo",
  description: "Embeddable doc-grounded chat widget with lead capture (portfolio demo)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
