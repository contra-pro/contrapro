# Rental-create input validation — local only

`packages/domain/src/rentals/create-input.ts` composes the strict timestamp parser
and price calculator. No routes, RPC calls, database access or persistence are added.
Production Migration / Deployment remains **NO-GO**.

## Exact scope and contract

The inactive SQL draft's `public.contratpro_rental_create(p_agency_id uuid,
p_key uuid,p_details jsonb)` delegates business-field validation to
`app_private.rental_input`. This validator covers **p_details only**:

| Field | Input | Normalization |
|---|---|---|
| clientId, vehicleId | Required UUID strings | Lowercase canonical UUID; PostgreSQL's documented braces, uppercase, omitted/extra four-digit-group hyphens accepted; no version/variant restriction |
| start, end | Required strict explicit-offset timestamp strings | UTC epoch microseconds as bigint; end strictly after start |
| dailyRateMinor | Required numeric integral centimes, 0 through 10^12 | bigint |
| depositMinor | Optional numeric integral centimes, 0 through 10^12 | bigint; absence defaults to zero; explicit null/undefined rejected |

No other fields are accepted. Agency, actor, request key, currency, state, number,
version, totals and client/vehicle snapshots are not caller business fields.
UUID syntax does not prove that the object exists, is active or belongs to the
agency. Even a nil UUID is syntactically valid; the database reference checks remain
necessary. PostgreSQL UUID spelling evidence: [PostgreSQL 17 UUID documentation](https://www.postgresql.org/docs/17/datatype-uuid.html).

Success is `{ ok: true, value }`. Value contains clientId, vehicleId,
startMicroseconds, endMicroseconds, currency MAD, billableDays, dailyRateMinor,
depositMinor and rentalTotalMinor. All money and instant fields are bigint; days is
a bounded integer number. Total excludes the deposit. The existing calculator
alone enforces rate/deposit bounds and 1..1,000,000 rounded 24-hour days.

Failure is `{ ok: false, errors }`, with fixed field labels and codes:
required, invalid, unknown-fields or out-of-range. Timestamp/calendar/order errors
use period; price/duration bounds use pricing. Invalid values are never echoed.
The function accepts plain or null-prototype data records, including frozen ones.
Inherited fields, accessors, nonenumerable fields and symbol keys are rejected;
it does not coerce values or invoke getters/toJSON. Hostile in-process Proxy objects
are outside the decoded-JSON input contract.

## SQL differences and limitations

- The [approved strict timestamp subset](rental-contracts-application-timestamps.md)
  rejects hour 24 and second 60 even when PostgreSQL normalizes them. SQL remains
  unchanged and requires a separately reviewed alignment change.
- Input monetary values must be numbers, as the draft requires JSON numbers.
  Strings and bigint input are not silently accepted. Successful values within the
  10^12 bound are safely convertible to bigint, including zero and negative zero.
  PostgreSQL numeric retains decimal lexemes exactly; a JavaScript object cannot
  reveal rounding already performed during JSON.parse. For example, a fractional
  token rounded to an integer before this validator cannot be detected here.
  A future raw-JSON boundary needs lossless numeric-token validation before ordinary
  JSON parsing. This validator does not claim raw-wire numeric equivalence.
- The SQL checks `pg_column_size(p_details) <= 4096`, a PostgreSQL JSONB storage
  property. No UTF-8/JSON.stringify length is substituted for that check. Accepted
  business values are bounded: UUID strings at most 41 ASCII characters, timestamps
  at most 32 and two bounded numeric amounts, across six fixed keys. Runtime JSONB
  size equivalence has not been executed/verified; the database size gate remains
  authoritative. Raw HTTP body size, lexical whitespace and duplicate JSON keys
  must be handled by a future transport boundary, not guessed from an object.
- Output is an internal value, not SQL's normalized JSON object (which contains
  UTC strings and a days field). Bigint requires explicit lossless encoding at a
  future transport boundary. No RPC serializer is included.
- Half-open adjacency and offset equivalence are preserved. Numeric offsets do not
  assert Africa/Casablanca wall-time validity. This adds no availability check,
  authorization, tenancy proof, idempotency, concurrency or commit guarantee.

SQL source: `supabase/migration-drafts/20261120001300_rental_contracts.sql`,
`rental_price`, `rental_input` and `contratpro_rental_create`. No SQL was executed
or edited. Database-free tests establish application behavior only.

Next local task: design and test a lossless raw JSON/serialization boundary before
adding any route, preserving exact money and microseconds. Resolve numeric lexeme,
duplicate-key and payload-size responsibilities explicitly; do not wire undeployed
RPCs or bypass tenant authorization.
