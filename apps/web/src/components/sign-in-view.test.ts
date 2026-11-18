import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SignInView } from "./sign-in-view";
import { authMessages } from "../i18n/auth";

describe("French/Arabic sign-in UI", () => {
  for (const locale of ["fr", "ar"] as const) {
    it(`${locale}: offers Magic Link and Google as same-origin POST forms`, () => {
      const html = renderToStaticMarkup(createElement(SignInView, { locale, configured: true, status: undefined }));
      expect(html).toContain(authMessages(locale).title);
      expect(html).toContain(authMessages(locale).google);
      expect(html).toContain(`action="/${locale}/auth/start"`);
      expect(html.match(/method="post"/g)).toHaveLength(2);
      expect(html).toContain('type="email"'); expect(html).toContain('for="auth-email"');
      expect(html).not.toContain("service_role");
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
