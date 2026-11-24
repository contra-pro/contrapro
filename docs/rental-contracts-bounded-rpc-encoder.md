# Bounded canonical rental-create RPC encoder

Status: prepared and verified with database-free application tests only.
**Production Migration / Deployment: NO-GO.** No SQL or database connection was used.
No existing validator, pricing calculator, JSON boundary or SQL draft was modified.

## Mandatory compatibility gate — source-based justification

Reviewed `supabase/migration-drafts/20261120001300_rental_contracts.sql`:

1. Lines 165–181: rental_input permits exactly the six business fields below,
   requires explicit-offset timestamps with four-digit input years and at most six
   fractional digits, then casts the strings to timestamptz.
2. Lines 152–162: finite, increasing instants; integral rates/deposits in 0..10^12;
   ceil(elapsed seconds / 86400) in 1..1,000,000. No money rounding is authorized.
3. Lines 182–185: formats instants AT TIME ZONE UTC using
   `YYYY-MM-DD"T"HH24:MI:SS.US"Z"`, normalizing numbers to bigint.
4. Lines 215–236: public creation RPC checks membership/key/references separately,
   and casts the normalized start/end strings back to timestamptz for insertion.

**Selected inclusive UTC instant range:**

| Endpoint | Canonical UTC | Epoch microseconds |
|---|---|---|
| Minimum | 0001-01-01T00:00:00.000000Z | -62135596800000000 |
| Maximum | 9999-12-31T23:59:59.999999Z | 253402300799999999 |

Both endpoints of a rental must lie in this range, and end must follow start.
Every represented instant therefore has an AD year 0001..9999 in UTC. Canonical Z
input has zero offset; casting, UTC formatting and reparsing cannot cross an era
or a fifth year digit. Six fractional digits represent an integral microsecond
exactly; PostgreSQL's US format retains those six digits. UTC is explicit at every
string boundary, and no implicit session timezone interpretation is needed.

This is a source/format-contract argument, not an executed PostgreSQL proof. PG17
format semantics are documented in [date/time formatting](https://www.postgresql.org/docs/17/functions-formatting.html):
YYYY has four or more year digits, US has six microsecond digits, and era is a
separate format token. No PostgreSQL process or query was run for this task.

## Why the range is narrower than application validation

The approved timestamp validator accepts four-digit local date labels with explicit
offsets. Offsets near year boundaries can normalize into astronomical UTC year 0
(1 BC) or year 10000. The application keeps those instants exactly as bigint.

The current SQL UTC formatting omits an era. In the BC case, positive YYYY text
without BC cannot round-trip the original instant when reparsed as AD. At the upper
edge, a canonical UTC year-10000 string cannot satisfy the four-digit input regex.
An encoder must not silently clamp, shift or discard the offending microseconds.

Option A explicitly authorizes rejection at this encoder boundary. Existing
application validators retain their broader range. Tests cover both reported
compatibility failures, minimum/maximum accepted instants and one microsecond beyond
each bound. Expanding this range requires an explicit contract decision and a
separately reviewed SQL normalization/format-and-reparse solution (and affected
fingerprint updates), or retaining a documented encoder restriction. No such SQL
change is implemented here. Strict application hour-24/second-60 rejection remains
intentional; canonical encoder output contains neither form.

## API and exact wire shape

`encodeRentalCreateRequest(value: NormalizedRentalCreate, agencyId: string,
key: string): RentalCreateEncoding` in
`packages/domain/src/rentals/rpc-request.ts` returns a discriminated result.

- Success: `{ ok: true, value: RentalCreateRpcArguments }`.
- Failure: `{ ok: false, errors: [{ field, code }] }`, with fixed labels. UTC range
  errors name startMicroseconds/endMicroseconds with out-of-range. Invalid
  structural or recomputation checks use form/invalid; context syntax errors use
  p_agency_id/invalid or p_key/invalid. No offending values are returned.

SQL target: `public.contratpro_rental_create(p_agency_id uuid,p_key uuid,p_details jsonb)`.
The returned value is the argument object, **not** an invocation or function-name
envelope. Property insertion order is deterministic:

```json
{"p_agency_id":"a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11","p_key":"00000000-0000-0000-0000-000000000000","p_details":{"clientId":"a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11","vehicleId":"00000000-0000-0000-0000-000000000000","start":"1970-01-01T00:00:00.000000Z","end":"1970-01-02T00:00:00.000001Z","dailyRateMinor":12345,"depositMinor":0}}
```

UUIDs use the existing validator's PostgreSQL-compatible normalization. The context
UUIDs reuse that validation separately; no UUID-version restriction is added. Nil
UUID syntax is not proof of existence or authority. Agency/key are never generated
or selected automatically and are not proof of authentication or idempotent execution.

Deposit is always explicitly encoded. Pipeline normalization already equates absence
with zero and does not preserve presence metadata. Encoding depositMinor:0 preserves
that SQL default and yields identical output for omitted versus explicit zero.
There is no omit-deposit option that could silently discard a nonzero deposit.

## Precision, determinism and forged inputs

Instants stay bigint through arithmetic. Formatting first bounds the instant, then
splits it into whole days and within-day microseconds. Only the day quotient (at most
3,652,058) is converted to number for a bounded calendar search. No full epoch or
fractional-second conversion to Number/Date occurs.

Money is converted to Number only after a bigint safe-integer guard, then the existing
validator enforces 0..10^12 and recomputes all normalized values. These bounded amounts
are exact JSON numbers; the potentially 10^18 total is never a wire argument. Deposit
and daily rate stay separate. No JSON serialization/parsing cycle is used by encoding.

The TypeScript normalized type is structural, not proof of provenance. The encoder
snapshots own enumerable data properties of a plain/null-prototype record, rejects
missing/extra/symbol/hidden/accessor fields, then uses the existing domain validator
to revalidate references' syntax, periods, money, currency, days and rental total.
Every normalized field must agree exactly with recomputation. Thus a coherent
reconstructed valid object may pass; provenance itself is not authenticated.
Hostile in-process Proxy traps are outside the ordinary data-record contract, as
with the existing validator. Input objects are not mutated or trusted toJSON methods
invoked. Newly constructed output contains only primitive strings/numbers.

## Verification

Database-free commands executed:

```text
npm run test --workspace=@contratpro/web -- src/rentals
npx --no-install tsc --project apps/web/tsconfig.json --noEmit --incremental false
npx --no-install eslint --config apps/web/eslint.config.mjs packages/domain/src/rentals/rpc-request.ts apps/web/src/rentals/rpc-request.test.ts --max-warnings=0
git diff --check
```

Results: 295 tests passed across six rental test files, including 38 new encoder
tests; TypeScript passed; targeted lint passed with the existing informational
Next.js pages-directory notice; whitespace checks passed, including direct checks
of the three new untracked files. SQL draft SHA-256 remained
3c27bc2a11de4d13a8003b35aa16d5d733eaeaa3be86557167a6fb2967214b79.

## Remaining limits and next step

- Offline round-trip tests establish application arithmetic and representation;
  actual PostgreSQL execution/casts, JSONB storage size, executor privileges, RLS
  and RPC deployment have not been verified here.
- Output has a fixed, small schema but does not replace the SQL pg_column_size gate.
- The raw JSON boundary remains necessary before decoded-object validation to reject
  rounded numeric tokens and duplicate keys. This encoder does not read raw requests.
- There is no authentication, active membership/reference-state check, availability
  check, idempotency guarantee, numbering, persistence, retry orchestration or API route.

**GO for offline application-service development** against an injected/fake port,
preserving trusted context and stable caller-supplied keys. First review/test this
encoder before adding any real transport. Production remains NO-GO.
