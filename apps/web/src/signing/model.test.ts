import { expect, it } from "vitest";
import { capture, consent, signingZones } from "./model";
import { selectProvider, ProviderCoordinator, type SignatureProvider } from "./providers";
const checksum = "a".repeat(64);
it.each(["fr","ar"] as const)("requires explicit localized review, identity and consent in %s", locale => {
  const valid = { typedName: locale === "fr" ? "Prénom Nom" : "اسم العميل", reviewed: true, identityConfirmed: true, consent: true, consentVersion: consent[locale].version, reviewedChecksum: checksum };
  expect(capture(valid,locale,checksum).typedName).toBe(valid.typedName);
  for (const key of ["reviewed","identityConfirmed","consent"]) expect(() => capture({ ...valid,[key]:false },locale,checksum)).toThrow("invalid");
  expect(() => capture({ ...valid,reviewedChecksum:"b".repeat(64) },locale,checksum)).toThrow();
});
it("requires both signature positions and rejects higher assurance without a capable provider", () => {
  expect(() => signingZones([])).toThrow(); expect(() => selectProvider("external-qualified-requested",null,[])).toThrow("unsupported-assurance");
  expect(selectProvider("simple",null,[])).toBeNull();
});
it("retains unknown provider outcomes rather than inventing success", async () => {
  const calls: string[] = []; const repo = { async call<T>(_agency: string | null,action: string): Promise<T> { calls.push(action); return {version:1} as T; } };
  const provider = { capabilities: { id:"test" }, dispatch: async () => { throw Error("timeout"); } } as unknown as SignatureProvider;
  expect(await new ProviderCoordinator(repo).dispatch("agency","session",provider,{ id:"op",checksum,party:"agency" })).toEqual({ outcome:"unknown" });
  expect(calls).toEqual(["get","provider-claim","provider-result"]);
});
