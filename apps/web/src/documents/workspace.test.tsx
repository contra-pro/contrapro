import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { MappingEditor, RentalDocuments, TemplateLibrary } from "./workspace";
import { config } from "./fixtures";
it.each(["fr", "ar"] as const)("renders labelled mapping controls and document states in %s", locale => {
  const mapping = renderToStaticMarkup(<MappingEditor locale={locale} value={{ ...config, locale }} change={() => {}} />);
  expect(mapping).toContain("<label>"); expect(mapping).toContain('type="number"'); expect(mapping).toContain("agency.name");
  const library = renderToStaticMarkup(<TemplateLibrary locale={locale} />);
  expect(library).toContain(locale === "ar" ? 'dir="rtl"' : 'dir="ltr"'); expect(library).toContain('accept=".pdf,.docx"'); expect(library).toContain('role="status"');
  const documents = renderToStaticMarkup(<RentalDocuments locale={locale} rentalId="22222222-2222-4222-8222-222222222222" rentalVersion={1} />);
  expect(documents).toContain('type="date"'); expect(documents).toContain("disabled");
});
