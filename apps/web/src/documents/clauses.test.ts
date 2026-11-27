import { expect, it } from "vitest";
import { clause, clauseSelection } from "./clauses";

const id = "11111111-1111-4111-8111-111111111111";
it("validates bilingual fixture wording without interpreting expressions", () => {
  expect(clause({ title: "Fixture", fr: "Texte\n{{agency.name}}", ar: "نص", enabled: true })).toMatchObject({ fr: "Texte\n{{agency.name}}" });
  for (const value of [{ title: "", fr: "a", ar: "ب", enabled: true }, { title: "Fixture", fr: "\u0000", ar: "ب", enabled: true }]) expect(() => clause(value)).toThrow("invalid");
});
it("keeps explicit order and rejects duplicate or unsafe version references", () => {
  expect(clauseSelection([id])).toEqual([id]);
  expect(() => clauseSelection([id,id])).toThrow("invalid");
  expect(() => clauseSelection(["other.agency"])).toThrow("invalid");
});
