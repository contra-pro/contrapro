import "server-only";

/** Request-scoped observation time for the bounded operational overview. */
export async function dashboardTime(): Promise<number> {
  return Date.now();
}
