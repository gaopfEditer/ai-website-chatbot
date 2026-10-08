import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  isAdminDemoMode,
  isAdminPasswordConfigured,
  isValidAdminBasicAuth,
  parseBasicAuth,
  requireAdminAuth,
  requireAdminWrite,
} from "@/lib/admin/auth";

const env = process.env;

beforeEach(() => {
  process.env = { ...env };
  delete process.env.ADMIN_PASSWORD;
});

afterEach(() => {
  process.env = env;
});

describe("admin guard", () => {
  it("treats missing ADMIN_PASSWORD as public demo mode", () => {
    expect(isAdminPasswordConfigured()).toBe(false);
    expect(isAdminDemoMode()).toBe(true);
    expect(requireAdminAuth(null)).toBeNull();
  });

  it("requires basic auth when ADMIN_PASSWORD is set", () => {
    process.env.ADMIN_PASSWORD = "secret-demo";
    expect(isAdminDemoMode()).toBe(false);
    expect(requireAdminAuth(null)?.status).toBe(401);
    const header = `Basic ${Buffer.from("admin:secret-demo").toString("base64")}`;
    expect(isValidAdminBasicAuth(header)).toBe(true);
    expect(requireAdminAuth(header)).toBeNull();
  });

  it("parses basic auth and rejects wrong password", () => {
    process.env.ADMIN_PASSWORD = "correct";
    const parsed = parseBasicAuth(`Basic ${Buffer.from("user:wrong").toString("base64")}`);
    expect(parsed?.password).toBe("wrong");
    expect(isValidAdminBasicAuth(`Basic ${Buffer.from("user:wrong").toString("base64")}`)).toBe(false);
  });

  it("blocks writes in demo mode", () => {
    const res = requireAdminWrite(null);
    expect(res?.status).toBe(403);
  });
});
