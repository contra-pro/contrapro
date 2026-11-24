import type { RentalDetailInstant } from "../../../../packages/application/src/rentals/detail";

/** Display only: Intl/Date locate whole seconds; all six microsecond digits stay bigint. */
export function formatRentalInstant(instant: RentalDetailInstant): { local: string; utc: string } {
  const micros = instant.epochMicroseconds;
  const seconds = micros >= 0n ? micros / 1_000_000n : (micros - 999_999n) / 1_000_000n;
  const fraction = (micros - seconds * 1_000_000n).toString().padStart(6, "0");
  const milliseconds = seconds * 1000n;
  if (milliseconds < BigInt(Number.MIN_SAFE_INTEGER) || milliseconds > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError("Unsupported display instant");
  const date = new Date(Number(milliseconds));
  const local = new Intl.DateTimeFormat("fr-MA", { timeZone: "Africa/Casablanca", day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", timeZoneName: "longOffset", era: "short" })
    .formatToParts(date).filter(part => part.type !== "era" || part.value.toLowerCase().startsWith("av"))
    .map(part => part.type === "second" ? `${part.value},${fraction}` : part.value).join("");
  const utc = date.toISOString().replace(/\.\d{3}Z$/, `.${fraction}Z`);
  return { local, utc };
}
