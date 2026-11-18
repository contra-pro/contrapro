import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
vi.mock("server-only", () => ({}));
import { provisionCanonicalIdentity } from "./canonical-provisioning";
import { AUTH_PROJECT_URL } from "./config";
const subject = "10000000-0000-4000-8000-000000000001";
function fixture() {
  const auth = { getUser: vi.fn(async () => ({ data: { user: { id: subject } }, error: null as unknown })),
    getClaims: vi.fn(async () => ({ data: { claims: { sub: subject, aud: "authenticated", iss: `${AUTH_PROJECT_URL}/auth/v1`, exp: 2000 } }, error: null })) };
  const rpc = vi.fn(async () => ({ data: "created" as unknown, error: null as unknown }));
  return { auth, rpc, client: { auth, rpc } as unknown as SupabaseClient };
}
describe("canonical provisioning adapter: synthetic transport only", () => {
  it("does nothing when disabled", async () => {
    const f = fixture(); expect(await provisionCanonicalIdentity(f.client, false, () => 1000)).toBe("blocked");
    expect(f.auth.getUser).not.toHaveBeenCalled(); expect(f.rpc).not.toHaveBeenCalled();
  });
  it("requires trusted identity before invoking the RPC", async () => {
    const f = fixture(); f.auth.getUser.mockResolvedValue({ data: { user: { id: subject } }, error: new Error("private detail") });
    expect(await provisionCanonicalIdentity(f.client, true, () => 1000)).toBe("blocked"); expect(f.rpc).not.toHaveBeenCalled();
  });
  it("rejects expired credentials", async () => {
    const f = fixture(); expect(await provisionCanonicalIdentity(f.client, true, () => 2000000)).toBe("blocked"); expect(f.rpc).not.toHaveBeenCalled();
  });
  it("rejects inconsistent subjects", async () => {
    const f = fixture(); f.auth.getUser.mockResolvedValue({ data: { user: { id: "20000000-0000-4000-8000-000000000001" } }, error: null });
    expect(await provisionCanonicalIdentity(f.client, true, () => 1000)).toBe("blocked"); expect(f.rpc).not.toHaveBeenCalled();
  });
  it.each(["created", "existing"])("returns only %s from the parameter-free RPC", async result => {
    const f = fixture(); f.rpc.mockResolvedValue({ data: result, error: null });
    expect(await provisionCanonicalIdentity(f.client, true, () => 1000)).toBe(result);
    expect(f.rpc).toHaveBeenCalledExactlyOnceWith("contratpro_provision_identity");
  });
  it.each(["conflicting mapping", "disabled user", "permission denied"])("does not retry or repair %s", async reason => {
    const f = fixture(); f.rpc.mockResolvedValue({ data: null, error: new Error(reason) });
    expect(await provisionCanonicalIdentity(f.client, true, () => 1000)).toBe("uncertain"); expect(f.rpc).toHaveBeenCalledTimes(1);
  });
  it("allows independent concurrent calls without adding retries (not PostgreSQL concurrency proof)", async () => {
    const f = fixture(); f.rpc.mockResolvedValueOnce({ data: "created", error: null }).mockResolvedValueOnce({ data: "existing", error: null });
    expect(await Promise.all([provisionCanonicalIdentity(f.client, true, () => 1000), provisionCanonicalIdentity(f.client, true, () => 1000)])).toEqual(["created", "existing"]);
    expect(f.rpc).toHaveBeenCalledTimes(2);
    for (const call of f.rpc.mock.calls) expect(call).toEqual(["contratpro_provision_identity"]);
  });
  it.each([null, {}, { user_id: subject }, "arbitrary sensitive payload"])("rejects unexpected RPC output without exposing it", async data => {
    const f = fixture(); f.rpc.mockResolvedValue({ data, error: null });
    expect(await provisionCanonicalIdentity(f.client, true, () => 1000)).toBe("uncertain");
  });
  it("sanitizes thrown errors without retry", async () => {
    const f = fixture(); f.rpc.mockRejectedValue(new Error("secret https://private.example/path"));
    expect(await provisionCanonicalIdentity(f.client, true, () => 1000)).toBe("uncertain"); expect(f.rpc).toHaveBeenCalledTimes(1);
  });
  it("blocks expiry during authentication before attempting the write", async () => {
    const f = fixture(); let clock = 1000;
    f.auth.getUser.mockImplementation(async () => { clock = 2000000; return { data: { user: { id: subject } }, error: null }; });
    expect(await provisionCanonicalIdentity(f.client, true, () => clock)).toBe("blocked");
    expect(f.rpc).not.toHaveBeenCalled();
  });
  it.each([2000000, NaN])("returns uncertain when the clock becomes %s after a write", async clockAfter => {
    const f = fixture(); let clock = 1000;
    f.rpc.mockImplementation(async () => { clock = clockAfter; return { data: "created", error: null }; });
    expect(await provisionCanonicalIdentity(f.client, true, () => clock)).toBe("uncertain");
    expect(f.rpc).toHaveBeenCalledExactlyOnceWith("contratpro_provision_identity");
  });
  it("keeps authentication transport failures before the write unavailable", async () => {
    const f = fixture(); f.auth.getUser.mockRejectedValue(new Error("private auth failure"));
    expect(await provisionCanonicalIdentity(f.client, true, () => 1000)).toBe("unavailable");
    expect(f.rpc).not.toHaveBeenCalled();
  });
});
