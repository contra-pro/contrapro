import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { authDiagnostic, developmentAuthDiagnostic } from "./diagnostics";
afterEach(() => vi.unstubAllEnvs());
describe("credential-free development diagnostics", () => {
  it("drops unknown codes, messages, request content and invalid status values", () => {
    const event = authDiagnostic("sign-up", "signup-response", { code: "owner@example.com", message: "password=PRIVATE", status: "secret", token: "PRIVATE" });
    expect(event).toEqual({ operation: "sign-up", stage: "signup-response", category: "exception", code: "unclassified" });
    expect(JSON.stringify(event)).not.toMatch(/owner@|password|PRIVATE/);
  });
  it("identifies network timeouts without printing the exception", () => {
    expect(authDiagnostic("sign-up", "signup-request", { name: "AuthRetryableFetchError", status: 0, message: "PRIVATE" }))
      .toEqual({ operation: "sign-up", stage: "signup-request", category: "transport", code: "unclassified" });
  });
  it("never emits diagnostics in production", () => {
    vi.stubEnv("NODE_ENV", "production"); const log = vi.spyOn(console, "info").mockImplementation(() => {});
    developmentAuthDiagnostic(authDiagnostic("sign-up", "signup-response", { code: "signup_disabled", status: 422 }));
    expect(log).not.toHaveBeenCalled(); log.mockRestore();
  });
});
