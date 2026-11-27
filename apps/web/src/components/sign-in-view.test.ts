import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SignInView } from "./sign-in-view";
import { authMessages } from "../i18n/auth";

describe("French/Arabic sign-in UI", () => {
  for (const locale of ["fr", "ar"] as const) {
    it(`${locale}: offers password login and optional Magic Link, hides unconfigured Google`, () => {
      const html = renderToStaticMarkup(createElement(SignInView, { locale, configured: true, status: undefined, magicEnabled: true }));
      expect(html).toContain(authMessages(locale).title);
      expect(html).not.toContain(authMessages(locale).google);
      expect(html).toContain(`action="/${locale}/auth/password"`);
      expect(html).toContain('autoComplete="current-password"');
      expect(html).toContain(`action="/${locale}/auth/start"`);
      expect(html.match(/method="post"/g)).toHaveLength(2);
      expect(html).toContain('type="email"'); expect(html).toContain('for="auth-email"');
      expect(html).not.toContain("service_role");
    });
    it(`${locale}: displays Google only when explicitly enabled`, () => {
      const html = renderToStaticMarkup(createElement(SignInView, { locale, configured: true, status: undefined, googleEnabled: true }));
      expect(html).toContain(authMessages(locale).google);
      expect(html).toContain('value="google"');
    });
    it(`${locale}: defaults to password only without enabling external authentication`, () => {
      const html = renderToStaticMarkup(createElement(SignInView, { locale, configured: true, status: undefined }));
      expect(html).not.toContain(`action="/${locale}/auth/start"`);
      expect(html).not.toContain('value="magic"');
      expect(html).not.toContain('value="google"');
      expect(html.match(/method="post"/g)).toHaveLength(1);
    });
    it.each(["sent", "error", "signed-out"] as const)(`${locale}: shows fixed %s copy`, status => {
      const html = renderToStaticMarkup(createElement(SignInView, { locale, configured: true, status }));
      expect(html).toContain('role="status"');
      expect(html).toContain(authMessages(locale)[status]);
    });
    it(`${locale}: disables sign-in when public configuration is unavailable`, () => {
      const html = renderToStaticMarkup(createElement(SignInView, { locale, configured: false, status: "private-error-message" }));
      expect(html).toContain(authMessages(locale).unavailable);
      expect(html).toContain("disabled");
      expect(html).not.toContain("private-error-message");
    });
  }
});
