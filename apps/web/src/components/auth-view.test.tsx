// @vitest-environment jsdom
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AuthView, type AuthMode } from "./auth-view";
import { authMessages } from "../i18n/auth";
describe("accessible localized authentication forms", () => {
  it("does not describe a failed signup POST as an expired Magic Link", () => {
    const html = renderToStaticMarkup(createElement(AuthView, { locale: "fr", mode: "sign-up", configured: true, status: "error" }));
    expect(html).not.toContain(authMessages("fr").error);
    expect(html).toContain(authMessages("fr").signupError);
  });
  for (const locale of ["fr", "ar"] as const) {
    for (const mode of ["sign-in", "sign-up", "forgot-password", "reset-password"] as AuthMode[]) {
      it(`${locale}/${mode}: labels inputs, uses fixed POST and safe locale navigation`, () => {
        const html = renderToStaticMarkup(createElement(AuthView, { locale, mode, configured: true, status: "password-mismatch" }));
        const dom = new DOMParser().parseFromString(html, "text/html");
        expect(dom.querySelectorAll("h1")).toHaveLength(1);
        for (const input of dom.querySelectorAll<HTMLInputElement>("input:not([type=hidden])")) {
          expect(dom.querySelector(`label[for="${input.id}"]`)).not.toBeNull();
          expect(input.required).toBe(true);
          if (input.type === "password") expect(input.value).toBe("");
        }
        expect(dom.querySelector("form")?.getAttribute("method")).toBe("post");
        expect(html).toContain(authMessages(locale)["password-mismatch"]);
        expect(html).toContain(`/${locale === "fr" ? "ar" : "fr"}/${mode}`);
        expect(html).not.toContain('value="google"');
      });
    }
    it(`${locale}: disables unavailable forms without reflecting arbitrary errors`, () => {
      const html = renderToStaticMarkup(createElement(AuthView, { locale, mode: "sign-up", configured: false, status: "private-token" }));
      expect(html).toContain("disabled"); expect(html).not.toContain("private-token");
    });
  }
});
