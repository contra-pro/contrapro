export type RentalPricingInput = Readonly<{
  /** UTC epoch microseconds, resolved from explicit-offset instants by the caller. */
  startMicroseconds: bigint;
  endMicroseconds: bigint;
  /** Integral MAD centimes. */
  dailyRateMinor: bigint;
  depositMinor?: bigint;
}>;

export type RentalPrice = Readonly<{
  currency: "MAD";
  billableDays: number;
  dailyRateMinor: bigint;
  rentalTotalMinor: bigint;
  depositMinor: bigint;
}>;

const microsecondsPerDay = 86_400_000_000n;
const maximumDays = 1_000_000n;
const maximumMoneyMinor = 1_000_000_000_000n;

/**
 * Pure price preview for [start, end), matching the Phase 1A draft's arithmetic.
 * Uses elapsed 24-hour days, including across Africa/Casablanca offset changes.
 * No wall-time parsing, authorization, availability or persisted-price guarantee.
 * Bigint values must be encoded losslessly at any future JSON boundary.
 */
export function calculateRentalPrice(input: RentalPricingInput): RentalPrice {
  const { startMicroseconds, endMicroseconds, dailyRateMinor, depositMinor = 0n } = input;
  if ([startMicroseconds, endMicroseconds, dailyRateMinor, depositMinor]
    .some(value => typeof value !== "bigint")) {
    throw new TypeError("Rental pricing requires integral bigint values");
  }

  const duration = endMicroseconds - startMicroseconds;
  if (duration <= 0n || duration > maximumDays * microsecondsPerDay) {
    throw new RangeError("Rental duration outside supported bounds");
  }
  if (dailyRateMinor < 0n || dailyRateMinor > maximumMoneyMinor
    || depositMinor < 0n || depositMinor > maximumMoneyMinor) {
    throw new RangeError("Rental amount outside supported bounds");
  }

  const days = (duration + microsecondsPerDay - 1n) / microsecondsPerDay;
  return {
    currency: "MAD",
    billableDays: Number(days),
    dailyRateMinor,
    rentalTotalMinor: days * dailyRateMinor,
    depositMinor,
  };
}
