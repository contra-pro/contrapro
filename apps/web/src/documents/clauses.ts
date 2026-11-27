import { isRecord, isUuid } from "../../../../packages/application/src/agency-management";
import { DocumentFault } from "./model";

export type ClauseContent = { title: string; fr: string; ar: string; enabled: boolean };
export type ClauseVersion = ClauseContent & { id: string; clauseId: string; agencyId: string; revision: number };
export function clause(value: unknown): ClauseContent {
  if (!isRecord(value) || typeof value.enabled !== "boolean" ||
    !["title", "fr", "ar"].every(k => typeof value[k] === "string" && value[k].trim().length > 0 &&
      value[k].length <= (k === "title" ? 120 : 8000) && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value[k] as string))) throw new DocumentFault("invalid");
  return { title: String(value.title).trim(), fr: String(value.fr), ar: String(value.ar), enabled: value.enabled };
}
export function clauseSelection(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 40 || !value.every(isUuid) || new Set(value).size !== value.length) throw new DocumentFault("invalid");
  return value;
}
