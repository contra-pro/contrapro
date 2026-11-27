import {readFileSync} from "node:fs";
import {expect,it} from "vitest";
it.each(["confirmation","recovery"])("%s email template keeps bilingual text and the provider's secure confirmation URL",kind=>{const html=readFileSync(new URL(`../../../../supabase/templates/${kind}.html`,import.meta.url),"utf8");expect(html).toContain('lang="fr"');expect(html).toContain('lang="ar" dir="rtl"');expect(html).toContain('{{ .ConfirmationURL }}');expect(html).not.toMatch(/https?:\/\/|TokenHash|\.Token\s/);expect(html).not.toMatch(/<script\b|javascript:|\son[a-z]+\s*=/i);});
