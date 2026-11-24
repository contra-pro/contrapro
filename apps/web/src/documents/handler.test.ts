import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("server-only", () => ({}));
const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("../auth/server", () => ({ serverAuthClient: auth }));
import { boundedJson, handleDocuments } from "./handler";
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
const request = (origin = "http://localhost:3000", body = "{}") => new NextRequest("http://localhost:3000/fr/app/document-action", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body });
it("fails closed before authentication when unverified", async () => {
  vi.stubEnv("CONTRATPRO_APP_ORIGIN", "http://localhost:3000"); vi.stubEnv("CONTRATPRO_DOCUMENTS_VERIFIED", "false");
  const response = await handleDocuments(request(), "fr"); expect(response.status).toBe(503); expect(auth).not.toHaveBeenCalled();
  expect(response.headers.get("cache-control")).toContain("no-store");
});
it("rejects cross-origin and unsupported locale requests", async () => {
  vi.stubEnv("CONTRATPRO_APP_ORIGIN", "http://localhost:3000"); vi.stubEnv("CONTRATPRO_DOCUMENTS_VERIFIED", "true");
  expect((await handleDocuments(request("https://evil.example"), "fr")).status).toBe(403);
  expect((await handleDocuments(request(), "en")).status).toBe(404); expect(auth).not.toHaveBeenCalled();
});
it("bounds actual request bytes and rejects malformed JSON", async () => {
  await expect(boundedJson(request("http://localhost:3000", "{"))).rejects.toThrow();
  await expect(boundedJson(request("http://localhost:3000", "x".repeat(14 * 1024 * 1024 + 1)))).rejects.toThrow("invalid");
  expect(await boundedJson(request("http://localhost:3000", '{"action":"list","input":{}}'))).toEqual({ action: "list", input: {} });
});
