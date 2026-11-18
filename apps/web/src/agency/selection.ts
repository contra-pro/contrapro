import { isUuid } from "../../../../packages/application/src/agency-management";
export const selectionCookie = "contratpro-agency-selection";
export function readSelection(value: string | undefined) {
  const parts = value?.split(":");
  if (!parts || parts.length !== 2 || !isUuid(parts[0]) || !isUuid(parts[1])) return undefined;
  return { userId: parts[0], agencyId: parts[1] };
}
