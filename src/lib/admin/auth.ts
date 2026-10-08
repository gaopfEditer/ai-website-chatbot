import { NextResponse } from "next/server";

export function isAdminPasswordConfigured(): boolean {
  const p = process.env.ADMIN_PASSWORD;
  return typeof p === "string" && p.length > 0;
}

/** Public portfolio demo: no password → read-only admin with sample data only. */
export function isAdminDemoMode(): boolean {
  return !isAdminPasswordConfigured();
}

export function parseBasicAuth(authorization: string | null): { user: string; password: string } | null {
  if (!authorization?.startsWith("Basic ")) return null;
  try {
    const decoded = Buffer.from(authorization.slice(6), "base64").toString("utf8");
    const sep = decoded.indexOf(":");
    if (sep < 0) return null;
    return { user: decoded.slice(0, sep), password: decoded.slice(sep + 1) };
  } catch {
    return null;
  }
}

export function isValidAdminBasicAuth(authorization: string | null): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const parsed = parseBasicAuth(authorization);
  if (!parsed) return false;
  return parsed.password === expected;
}

export function adminUnauthorizedResponse(): NextResponse {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="SiteBot Admin", charset="UTF-8"',
    },
  });
}

/** When a password is set, require matching HTTP Basic credentials. */
export function requireAdminAuth(authorization: string | null): NextResponse | null {
  if (isAdminDemoMode()) return null;
  if (isValidAdminBasicAuth(authorization)) return null;
  return adminUnauthorizedResponse();
}

/** Block mutating admin actions in public demo mode. */
export function requireAdminWrite(authorization: string | null): NextResponse | null {
  if (isAdminDemoMode()) {
    return NextResponse.json(
      {
        error: "Demo mode: writes are disabled. Set ADMIN_PASSWORD to enable the full admin.",
        demoMode: true,
        readOnly: true,
      },
      { status: 403 }
    );
  }
  return requireAdminAuth(authorization);
}
