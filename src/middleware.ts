import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminDemoMode, isValidAdminBasicAuth } from "@/lib/admin/auth";

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};

export function middleware(req: NextRequest) {
  if (isAdminDemoMode()) {
    return NextResponse.next();
  }

  const auth = req.headers.get("authorization");
  if (isValidAdminBasicAuth(auth)) {
    return NextResponse.next();
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="SiteBot Admin", charset="UTF-8"',
    },
  });
}
