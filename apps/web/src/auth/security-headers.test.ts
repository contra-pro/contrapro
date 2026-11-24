import { describe, expect, it, vi } from "vitest";
import { unstable_getResponseFromNextConfig } from "next/experimental/testing/server";

// Header routing only; do not inspect real local authentication configuration.
vi.mock("./config", () => ({ validatePublicConfig: vi.fn() }));
import nextConfig from "../../next.config";

describe("native sign-in document referrer policy", () => {
  it.each(["/fr/sign-in", "/ar/sign-in", "/fr/sign-in?status=sent", "/ar/sign-in?status=error", "/fr/sign-up", "/ar/forgot-password", "/fr/reset-password"])("overrides only the referrer policy on %s using Next's actual header matcher", async path => {
    const response = await unstable_getResponseFromNextConfig({ url: `http://localhost:3000${path}`, nextConfig });
    expect(response.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0, must-revalidate");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });
  it.each(["/fr/app", "/ar/app/clients", "/fr/auth/start", "/ar/auth/callback", "/fr/sign-in-extra", "/en/sign-in"])("retains no-referrer outside the sign-in documents: %s", async path => {
    const response = await unstable_getResponseFromNextConfig({ url: `http://localhost:3000${path}`, nextConfig });
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });
});
