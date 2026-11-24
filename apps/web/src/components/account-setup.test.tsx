// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountSetup } from "./account-setup";
import { AuthForm } from "./auth-form";
import { authMessages } from "../i18n/auth";
import { SignOutForm } from "./sign-out-form";
let root: Root | undefined;
afterEach(async () => { if (root) await act(async () => root!.unmount()); document.body.innerHTML = ""; vi.unstubAllGlobals(); });
async function render(element: React.ReactNode) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  await act(async () => root!.render(element));
}
describe("explicit account setup and localized form validation", () => {
  for (const locale of ["fr", "ar"] as const) {
    it(`${locale}: logout uses same-origin fetch and does not claim success on provider failure`, async () => {
      const fetch = vi.fn(async () => Response.json({ ok: false }, { status: 503 })); vi.stubGlobal("fetch", fetch);
      await render(createElement(SignOutForm, { locale }));
      await act(async () => { document.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
      expect(fetch).toHaveBeenCalledExactlyOnceWith(`/${locale}/auth/sign-out`, expect.objectContaining({ method: "POST", credentials: "same-origin", redirect: "error" }));
      expect(document.body.textContent).toContain(authMessages(locale).logoutError);
    });
    it(`${locale}: never provisions during render or when the existing gate is off`, async () => {
      const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
      await render(createElement(AccountSetup, { locale, enabled: false }));
      expect(document.querySelector("button")?.disabled).toBe(true); expect(fetch).not.toHaveBeenCalled();
    });
    it(`${locale}: only an explicit action posts to existing provisioning; errors remain unconfirmed`, async () => {
      const fetch = vi.fn(async () => Response.json({ ok: false, code: "uncertain" }, { status: 503 })); vi.stubGlobal("fetch", fetch);
      await render(createElement(AccountSetup, { locale, enabled: true }));
      expect(fetch).not.toHaveBeenCalled();
      await act(async () => document.querySelector("button")!.click());
      expect(fetch).toHaveBeenCalledExactlyOnceWith(`/${locale}/auth/provision`, expect.objectContaining({ method: "POST", credentials: "same-origin", cache: "no-store" }));
      expect(document.body.textContent).toContain(authMessages(locale).setupError);
    });
    it(`${locale}: prevents mismatched passwords with localized feedback before native submission`, async () => {
      await render(createElement(AuthForm, { locale, mode: "sign-up", action: `/${locale}/auth/sign-up`, configured: true, label: "submit" },
        [createElement("input", { key: "email", name: "email", defaultValue: "owner@example.com" }),
          createElement("input", { key: "password", name: "password", defaultValue: "a secure password" }),
          createElement("input", { key: "confirm", name: "confirmPassword", defaultValue: "different password" })]));
      const event = new Event("submit", { bubbles: true, cancelable: true });
      await act(async () => { document.querySelector("form")!.dispatchEvent(event); });
      expect(event.defaultPrevented).toBe(true); expect(document.body.textContent).toContain(authMessages(locale)["password-mismatch"]);
    });
  }
});
