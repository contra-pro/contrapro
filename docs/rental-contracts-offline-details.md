# Offline rental detail read model

Production remains **NO-GO**. No SQL, database, API route or lifecycle mutation is
implemented. `readRentalDetail(response, {agencyId,contractId})` validates an injected
losslessly decoded response. `RentalDetails` renders that response read-only and
validates it again rather than trusting local fixtures. Reference labels are optional
injected presentation data; SQL supplies client/vehicle IDs, not names or snapshots.

Source: `contratpro_rental_detail(p_agency_id uuid,p_id uuid)` returns
`to_jsonb(c)-creator_membership_id-return_membership_id` plus physicalUnavailable and
overdueConflict. The 22 required keys are the remaining table columns and those two
booleans. Missing data returns SQL null, mapped to not-found. Extra/missing/accessor/
inherited/symbol fields reject. Identity or agency mismatch rejects without exposing
the returned data. Context syntax is not authorization or membership evidence.

The model retains all response references, version, five SQL states, money/number
serial as bigint, timestamps as original source plus UTC epoch microseconds, nullable
confirmation/return metadata and advisory flags. Existing pricing verifies elapsed
days, total and separate deposit. It does not invent chronology constraints absent
from SQL or recompute availability. overdueConflict requires confirme plus the
physicalUnavailable flag; false flags do not authorize handover.

Number rules mirror SQL: drafts have no number; confirme/en_cours/termine require
one; annule may retain an issued number or remain unnumbered. Supplied number/year/
serial/confirmation fields must agree, including minimum four-digit serial padding
without truncation. The generated expression is used only to validate the provided
string; the UI never supplies a missing number. Return metadata is present exactly
for termine. The removed return-membership ID cannot be validated or invented.

## Precision and known compatibility boundaries

SQL emits bigint columns as JSON numeric tokens. The injected offline response may
use bigint or safe integer numbers for those tokens. Unsafe decoded numbers and
decimal strings reject; they are never repaired by BigInt(number). This is an
explicit lossless-adapter object convention, not a claim SQL returns bigint JS values
or strings. No real adapter/parser for the detail JSON response has been added;
ordinary SDK/Response.json decoding can lose precision and must not be used blindly.

Timestamp parsing reuses the strict explicit-offset, four-digit AD application
parser. PostgreSQL's broader years/BC/offset-second formats are not fully covered;
unsupported output rejects rather than guesses. This includes metadata columns,
which the table does not constrain to the application range. No full PG17 output
compatibility or deployment readiness is claimed.

Display uses Intl with Africa/Casablanca for whole seconds; six fractional digits
are preserved separately using bigint, including negative epoch fractions. UTC ISO
and source timestamps remain available. Date is used only for bounded display of
whole seconds, not pricing or authoritative instant storage. Host ICU/IANA data may
differ from future PostgreSQL timezone data. No timezone validity or signature/legal
claims follow from display.

## Preview and tests

Start the existing isolated preview command and open
http://127.0.0.1:4179/details.html. Six explicit fixtures cover draft, confirmed,
ongoing, finished and both cancellation variants. The supplied sample number is
clearly fictitious, not newly allocated or confirmed by this application.

Focused tests: `npm run test --workspace=@contratpro/web -- src/rentals/detail.test.tsx`.
Initial result: 45 passed, covering full shape, lifecycle, exact money, Casablanca
display, microseconds, scope denials, missing fields, unsafe numbers and no network.
These are not SQL, RLS, persistence or real confirmation tests.

GO for offline confirmation design/testing only, after read-model review. Before any
live integration, resolve the lossless detail transport, unsupported timestamp formats,
real authenticated context/permissions and deployed RPC evidence. No confirmation
button, real contract number allocation or new SQL contract is introduced here.
