# Rental Contracts — lossless JSON boundary

Local, database-free component: `packages/domain/src/rentals/json-boundary.ts`.
Production Migration / Deployment remains **NO-GO**. No route or RPC is enabled.

## Input: existing business payload, numeric money unchanged

`parseRentalCreateJson(unknown)` accepts JSON **text**, before ordinary JSON.parse
has converted number tokens. The root must be an object containing only clientId,
vehicleId, start, end, dailyRateMinor and optional depositMinor, as specified by
[create-input](rental-contracts-create-input.md). Money remains JSON numbers, not
strings or tagged objects. Agency and idempotency key remain outside this payload.
The existing validator's public signature and validation behavior are unchanged.

Number lexemes are interpreted using decimal coefficient/scale arithmetic with
bigint. The boundary accepts only exact integers within JavaScript's safe-integer
range, then converts to number for the existing validator. The calculator still
enforces 0..10^12 centimes and the duration bound. Thus 1.0, 1e3 and 10000e-1 are
accepted as exact integers, while 1.00000000000000001, 0.5, 1e-1000 and unsafe
integers are rejected before any lossy monetary conversion. Exact zero, including
-0 and zero with an exponent, normalizes to zero. Numeric strings are not coerced.
No coefficient is converted to Number until its exact safe-integer bound is proven.

The reader is purpose-built for a flat object, not a general JSON parser. Strings
alone are decoded with JSON.parse; complete objects and number tokens are never
passed to it. JSON string escape/grammar checks therefore use the native parser
without surrendering duplicate-key or number-precision checks. Duplicate keys are
rejected after escape decoding, including identical duplicates and escaped aliases.
Unknown fields are passed to the existing validator and rejected. Objects are
constructed with a null prototype. Syntax exceptions, duplicate keys and numeric
errors never expose the token, key, document text or parser exception message.

## Bounds and errors

- Maximum raw text: **32,768 UTF-8 bytes**, matching the existing client application
  JSON envelope. A cheap code-unit check precedes UTF-8 encoding to bound allocation.
- Maximum container depth: **1**, counting the root object. Nested objects/arrays
  are rejected immediately, without recursion. The rental-create schema has no
  valid nested values, so this adds no restriction to valid business fields.
- Only JSON whitespace (space, tab, CR, LF) is accepted; trailing documents, BOM,
  malformed numbers/escapes and trailing commas are rejected.
- Result shape remains `{ ok: true, value }` or `{ ok: false, errors }`. Existing
  fixed field/code validation errors are preserved. Boundary errors use field form
  and codes malformed-json, duplicate-key, invalid-number, nesting-limit, too-large.
  Non-string input uses the existing invalid code. Error precedence is not a promise
  to enumerate every defect in an invalid document.

This takes already decoded text, not a byte stream. A future HTTP adapter must
enforce the byte limit while reading, reject malformed UTF-8 using fatal decoding,
and call this boundary before request.json()/JSON.parse. Stream cancellation,
Content-Type, authentication and CSRF checks are not implemented here. No body or
token logging is added. It cannot undo rounding from an earlier parser.

## Output: separate normalized-result JSON, not an RPC request

`serializeRentalCreateValidation(result)` accepts an internal result returned by
these validators and selects only known output fields. It serializes success as:

```json
{"ok":true,"value":{"clientId":"a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11","vehicleId":"00000000-0000-0000-0000-000000000000","startMicroseconds":"0","endMicroseconds":"86400000001","currency":"MAD","billableDays":2,"dailyRateMinor":"12345","depositMinor":"50000","rentalTotalMinor":"24690"}}
```

UTC epoch microseconds and every bigint monetary field are signed/base-10 integer
strings (amounts are nonnegative after validation), without exponents or decimals.
Currency remains MAD; billableDays remains a bounded number. Deposit is separate
from rentalTotalMinor. Decimal strings permit exact BigInt reconstruction after
ordinary JSON.parse, including a 10^18 total and pre-1970 negative microseconds.
No global bigint JSON hook or recursive arbitrary-object replacer is installed.
Errors serialize only their fixed field and code.

This new internal output representation does not replace any existing public API
or change SQL request numeric fields. Output is not valid create input: it includes
derived fields and represents instants differently. Tests round-trip exact normalized
values through JSON text/string decoding and BigInt reconstruction; there is no
general output deserializer or inverse RPC-request codec. The serializer's contract
requires genuine internal validation results, not arbitrary fabricated objects.

## SQL differences and limitations

The inactive draft remains unchanged. Its payload uses JSON numbers and timestamp
strings, and emits its own normalized JSON shape. This component does not claim
full PostgreSQL input equivalence:

- The approved [strict timestamp contract](rental-contracts-application-timestamps.md)
  intentionally rejects PostgreSQL hour-24/second-60 normalization.
- Duplicate-key rejection is stricter than PostgreSQL JSONB duplicate-key handling.
- The raw 32 KiB text limit is an application resource bound, **not** a substitute
  for pg_column_size(p_details)<=4096. Whitespace, escaping and JSONB storage have
  different sizes. The database gate remains necessary and runtime-unverified.
- Mathematical integer evaluation here does not reproduce every PostgreSQL numeric
  parser lexical/range limit. Extreme decimal exponents, especially zero tokens,
  can be accepted mathematically here yet rejected by PostgreSQL numeric parsing.
  No raw number token is forwarded to SQL; a future request encoder must emit
  validated bounded amounts canonically. Such an encoder is not implemented here.
- The boundary proves neither canonical identity, tenant references, active
  membership, availability, idempotency, concurrency safety nor persistence.

## Verification and next task

Database-free tests cover exact numeric spellings, unsafe/fractional and malformed
tokens, escaped duplicate keys, nested/oversized payloads, string grammar, existing
validation errors, bigint output and microsecond/maximum-money round trips. Static
checks and unit tests do not prove PostgreSQL runtime compatibility.

Next local task: independently review the tokenizer and resource/error boundaries,
then design a pure request encoder emitting canonical bounded JSON money numbers
and six-digit UTC timestamp strings. Resolve year-boundary and SQL-formatting gaps
before any RPC wiring; authorization and Production activation remain separate.
