/** Trusted server ports only: Supabase Auth must verify the session before canonical mapping.
 * The membership adapter must use a restricted runtime identity and re-read current state.
 * Never supply these ports or their results from request bodies, headers or browser claims.
 */
export type AgencyAccessPorts = Readonly<{
  session: () => Promise<unknown>;
  memberships: (userId: string) => Promise<unknown>;
  now: () => number;
  // Untrusted selection hint, accepted only after matching current server membership evidence.
  selectedAgencyId?: string;
}>;

export type AgencyAccess =
  | Readonly<{ status: "signed-out" | "forbidden" | "onboarding" | "unmapped" | "selection-required" | "unavailable" }>
  | Readonly<{ status: "authorized"; userId: string; agencyId: string; membershipId: string; agencyName: string }>;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const identifier = (value: unknown): value is string => typeof value === "string" && uuid.test(value);

/** A selection hint never establishes membership; all evidence is revalidated first.
 * This grants dashboard access only, never business-write or platform authorization.
 * Re-run at each protected operation; do not cache the returned context.
 */
export async function resolveAgencyAccess(ports: AgencyAccessPorts): Promise<AgencyAccess> {
  try {
    const session = await ports.session();
    if (session === null) return { status: "signed-out" };
    if (!record(session) || !identifier(session.userId) || session.userState !== "active" ||
      typeof session.expiresAt !== "number" || !Number.isFinite(session.expiresAt)) {
      return { status: "forbidden" };
    }
    const now = ports.now();
    if (!Number.isFinite(now)) return { status: "unavailable" };
    if (session.expiresAt <= now) return { status: "signed-out" };
    const rows = await ports.memberships(session.userId);
    const checkedAt = ports.now();
    if (!Number.isFinite(checkedAt)) return { status: "unavailable" };
    if (session.expiresAt <= checkedAt) return { status: "signed-out" };
    if (!Array.isArray(rows) || rows.length > 100) return { status: "unavailable" };
    if (rows.length === 0) return { status: "onboarding" };
    const eligible: Extract<AgencyAccess, { status: "authorized" }>[] = [];
    const agencies = new Set<string>();
    const memberships = new Set<string>();
    for (const row of rows) {
      if (!record(row) || row.userId !== session.userId || !identifier(row.agencyId) ||
        !identifier(row.membershipId) || typeof row.agencyName !== "string" ||
        row.agencyName.trim().length === 0 || row.agencyName.length > 200 ||
        (row.membershipState !== "active" && row.membershipState !== "revoked") ||
        (row.agencyState !== "pending" && row.agencyState !== "active" && row.agencyState !== "suspended") ||
        agencies.has(row.agencyId.toLowerCase()) || memberships.has(row.membershipId.toLowerCase())) {
        return { status: "forbidden" };
      }
      agencies.add(row.agencyId.toLowerCase());
      memberships.add(row.membershipId.toLowerCase());
      if (row.membershipState === "active" && row.agencyState === "active") {
        eligible.push({ status: "authorized", userId: session.userId,
          agencyId: row.agencyId, membershipId: row.membershipId, agencyName: row.agencyName });
      }
    }
    if (eligible.length === 0) return { status: "forbidden" };
    if (ports.selectedAgencyId !== undefined) {
      const selected = eligible.find(row => row.agencyId === ports.selectedAgencyId);
      return selected ?? { status: "selection-required" };
    }
    if (eligible.length > 1) return { status: "selection-required" };
    return eligible[0]!;
  } catch {
    // Provider/database exceptions can contain credentials or personal data.
    return { status: "unavailable" };
  }
}
