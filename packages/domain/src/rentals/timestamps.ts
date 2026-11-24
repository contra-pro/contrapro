/** A [start, end) interval of UTC epoch microseconds, directly usable by pricing. */
export type RentalInterval = Readonly<{
  startMicroseconds: bigint;
  endMicroseconds: bigint;
}>;

const microsecondsPerSecond = 1_000_000n;
const secondsPerDay = 86_400n;
const daysBeforeMonth = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334] as const;

function leapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysBeforeYear(year: number): number {
  const previous = year - 1;
  return previous * 365 + Math.floor(previous / 4) - Math.floor(previous / 100)
    + Math.floor(previous / 400);
}

/**
 * Strict application subset of the Phase 1A SQL timestamp contract.
 * Requires YYYY-MM-DDTHH:mm:ss[.ffffff](Z|±HH:mm), years 0001..9999.
 * Rejects PostgreSQL's hour-24/second-60 normalization. Offset magnitude may reach
 * 15:59, retaining the SQL numeric-offset range; both signed zero offsets mean UTC.
 * An offset identifies an instant, not an Africa/Casablanca wall-time assertion.
 * No Date, host timezone, floating-point fraction or timezone-database lookup.
 */
export function parseRentalTimestamp(input: unknown): bigint {
  if (typeof input !== "string") throw new TypeError("Rental timestamp must be a string");
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:\d{2})$/.exec(input);
  // JavaScript's $ can match before a final newline; require a full-string match.
  if (!match || match[0] !== input) throw new RangeError("Invalid rental timestamp format");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const zone = match[8]!;
  const monthLength = month === 2 ? (leapYear(year) ? 29 : 28)
    : [4, 6, 9, 11].includes(month) ? 30 : 31;
  if (year === 0 || month < 1 || month > 12 || day < 1 || day > monthLength
    || hour > 23 || minute > 59 || second > 59) {
    throw new RangeError("Invalid rental calendar date or time");
  }

  let offsetSeconds = 0;
  if (zone !== "Z") {
    const offsetHour = Number(zone.slice(1, 3));
    const offsetMinute = Number(zone.slice(4, 6));
    if (offsetHour > 15 || offsetMinute > 59) throw new RangeError("Invalid rental offset");
    offsetSeconds = (offsetHour * 3600 + offsetMinute * 60) * (zone[0] === "+" ? 1 : -1);
  }

  // Integer calendar arithmetic stays exact within the four-digit input range.
  // UTC normalization may cross into year 0 or 10000; bigint preserves that instant.
  const days = daysBeforeYear(year) - daysBeforeYear(1970) + daysBeforeMonth[month - 1]!
    + (month > 2 && leapYear(year) ? 1 : 0) + day - 1;
  const fraction = BigInt((match[7] ?? "").padEnd(6, "0"));
  return (BigInt(days) * secondsPerDay + BigInt(hour * 3600 + minute * 60 + second - offsetSeconds))
    * microsecondsPerSecond + fraction;
}

/** Requires strictly increasing instants; the end is excluded, so adjacency is valid. */
export function parseRentalInterval(start: unknown, end: unknown): RentalInterval {
  const startMicroseconds = parseRentalTimestamp(start);
  const endMicroseconds = parseRentalTimestamp(end);
  if (endMicroseconds <= startMicroseconds) throw new RangeError("Rental end must follow start");
  return { startMicroseconds, endMicroseconds };
}
