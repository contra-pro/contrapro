import type { SupabaseClient } from "@supabase/supabase-js";
import { isRecord, isUuid } from "../../../../packages/application/src/agency-management";
import { clientFields, clientLimits, validateClient, type ClientRecord, type ClientPermissions, type ClientQuery, type ClientPage, type ClientListItem } from "../../../../packages/application/src/clients";

export type ClientFailure = "forbidden" | "not-found" | "conflict" | "unavailable" | "invalid" | "uncertain";
export class ClientFault extends Error { constructor(public readonly code: ClientFailure) { super(code); } }
export async function clientRpc(client: SupabaseClient, name: string, args: Record<string, unknown>): Promise<unknown> {
  const result = await client.rpc(name, args);
  if (result.error) {
    const code: unknown = result.error.code;
    throw new ClientFault(code === "42501" ? "forbidden" : code === "P0002" ? "not-found" : code === "40001" ? "conflict" : code === "22023" ? "invalid" : "unavailable");
  }
  return result.data as unknown;
}
export async function clientPermissions(client: SupabaseClient, agencyId: string): Promise<ClientPermissions> {
  const data = await clientRpc(client, "contratpro_clients_permissions", { p_agency_id: agencyId });
  if (!isRecord(data) || !["read", "create", "update", "archive"].every(key => typeof data[key] === "boolean") ||
    Object.keys(data).length !== 4 || (!data.read && (data.create || data.update || data.archive))) throw new ClientFault("unavailable");
  return { read: data.read as boolean, create: data.create as boolean, update: data.update as boolean, archive: data.archive as boolean };
}
export async function listClients(client: SupabaseClient, agencyId: string, query: ClientQuery): Promise<ClientPage> {
  const data = await clientRpc(client, "contratpro_clients_list", { p_agency_id: agencyId, p_search: query.search,
    p_type: query.identityType, p_page: query.page, p_size: query.pageSize });
  if (!isRecord(data) || !Array.isArray(data.items) || data.items.length > query.pageSize || typeof data.total !== "number" ||
    !Number.isSafeInteger(data.total) || data.total < data.items.length || (data.items.length > 0 && data.total < (query.page - 1) * query.pageSize + data.items.length)) throw new ClientFault("unavailable");
  const items: ClientListItem[] = []; const ids = new Set<string>();
  for (const item of data.items as unknown[]) {
    if (!isRecord(item) || item.agencyId !== agencyId || item.state !== "active" || !isUuid(item.id) || ids.has(item.id) ||
      Object.keys(item).some(key => !["id", "agencyId", "state", "firstName", "lastName", "phone", "email", "city", "identityType"].includes(key)) ||
      !["firstName", "lastName", "phone", "email", "city"].every(key => typeof item[key] === "string" && (item[key] as string).length <= clientLimits[key as keyof typeof clientLimits]) ||
      !item.firstName || !item.lastName || !["none", "cin", "passport"].includes(String(item.identityType))) throw new ClientFault("unavailable");
    ids.add(item.id);
    items.push({ id: item.id, firstName: item.firstName as string, lastName: item.lastName as string,
      phone: item.phone as string, email: item.email as string, city: item.city as string, identityType: item.identityType as ClientListItem["identityType"] });
  }
  return { items, total: data.total, query };
}
export async function clientDetail(client: SupabaseClient, agencyId: string, id: string): Promise<ClientRecord | null> {
  const data = await clientRpc(client, "contratpro_client_detail", { p_agency_id: agencyId, p_id: id });
  if (data === null) return null;
  if (!isRecord(data) || data.agencyId !== agencyId || data.id !== id || data.state !== "active" || !isUuid(data.id) ||
    typeof data.version !== "number" || !Number.isSafeInteger(data.version) || data.version < 1 ||
    !clientFields.every(key => typeof data[key] === "string")) throw new ClientFault("unavailable");
  const fields = Object.fromEntries(clientFields.map(key => [key, data[key]]));
  const parsed = validateClient(fields);
  if (!parsed.ok) throw new ClientFault("unavailable");
  return { ...parsed.value, id: data.id, version: data.version };
}
