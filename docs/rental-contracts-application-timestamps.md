# Rental application timestamp contract

Local domain component: `packages/domain/src/rentals/timestamps.ts`.
Production Migration / Deployment remains **NO-GO**. This does not enable any route.

## Input and output

`parseRentalTimestamp(unknown)` accepts only strings shaped as
`YYYY-MM-DDTHH:mm:ss[.fraction](Z|±HH:mm)`, with one to six fractional digits when
present. It returns signed UTC epoch microseconds as `bigint` (epoch 1970-01-01).
Invalid types throw TypeError; invalid syntax, calendar/time/offset fields or
interval order throw RangeError. No trimming, Date coercion or rounding occurs.

Years 0001–9999 retain the draft's four-digit, non-BC input envelope. Gregorian
calendar rules apply, including century leap-year exceptions. Hours are 00–23,
minutes and seconds 00–59. Hour 24, second 60, year 0000, missing offsets, lowercase
markers, whitespace and more than six fractional digits are rejected.
Numeric offsets retain PostgreSQL's magnitude range through 15:59; minutes must
be 00–59. Z, +00:00 and -00:00 all denote zero offset under this SQL-oriented
contract; -00:00 is not interpreted as an RFC3339 unknown-offset marker.

All valid input offsets identify instants. They do not prove that a wall label
exists or has that offset in Africa/Casablanca. No IANA timezone lookup occurs.
Offsetless ambiguous/nonexistent local times are rejected; named-zone gap/fold
validation belongs to a future wall-time input adapter. Synthetic offset-change
tests exercise arithmetic, not current or historical Moroccan transition rules.

`parseRentalInterval(start, end)` returns `{ startMicroseconds, endMicroseconds }`
with end strictly after start. Equal instants with different offsets are rejected.
Intervals are [start, end); adjacent endpoints are allowed. It imposes no additional
duration limit: the existing price calculator enforces its own duration bound.
Spread the interval into `calculateRentalPrice` with bigint dailyRateMinor and
optional depositMinor. The pricing API remains unchanged. Deposit stays separate.

UTC normalization can cross year boundaries, including into astronomical year 0
or 10000 for boundary inputs. These are valid bigint instants, not newly accepted
expanded-year input strings. There is no UTC-string formatter here. JSON cannot
serialize bigint directly; a future transport adapter must encode it losslessly.

## Intentional application-versus-SQL discrepancy

The inactive draft's `app_private.rental_input` first checks string shape and then
casts to timestamptz. PostgreSQL 17 accepts hour 24 at midnight and second 60 in
cases that its parser normalizes. The strict application explicitly rejects both,
as approved. This component is **not fully input-compatible with that SQL parser**.
The draft is unchanged. This review and unit tests execute no SQL and do not prove
PostgreSQL runtime equivalence, executor authority, RLS or Production readiness.

Minimum future alignment: tighten both existing start/end shape checks inside
`rental_input` before casts. Replace the time portion
`T\d{2}:\d{2}:\d{2}` with `T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]`
for each field, retaining the six-digit precision and mandatory explicit offset.
Keep calendar, offset and year validation through the cast, with explicit strict
offset/year predicates if PostgreSQL differential tests expose any differences.
Do not introduce a round-trip equality check against a single UTC spelling: valid
different offsets and fractional widths intentionally represent equal instants.
Any future SQL edit must update affected implementation fingerprints/manifests and
be reviewed and tested under separately authorized PostgreSQL execution. This is
an alignment proposal only, not an executed or approved migration.

Recommended next local task: a strict rental-create input validator composing
timestamp intervals and pricing, with exact allowed fields and lossless money
handling. It must not invent tenant authorization or wire an undeployed RPC.
