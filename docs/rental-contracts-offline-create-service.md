# Offline rental-create application service

`packages/application/src/rentals/create.ts` implements one asynchronous creation
attempt using domain functions and an injected port. A fake port exists only in
tests. There is no default adapter, network, SQL, SDK, environment lookup, API route
or UI change. Production Migration / Deployment remains **NO-GO**.

## Source compatibility gate

Inspected `supabase/migration-drafts/20261120001300_rental_contracts.sql` before
implementation:

- Lines 215–236: `public.contratpro_rental_create(p_agency_id uuid,p_key uuid,
  p_details jsonb)` checks membership, normalizes details, locks the actor/key and
  returns an existing immutable creation receipt on matching payload. Changed
  normalized payload raises 40001. Missing key/reference conditions raise 22023.
- Lines 237–243: a new result is exactly `id`, `version:1`, `state:brouillon`,
  `number:r.contract_number`, then saved with the creation receipt and audit event.
  New rows are drafts; the table's draft-number constraint and generated number
  expression imply number:null. No totals, agency identifier or current detail is
  returned by this RPC.
- The member helper at lines 35–48 raises 42501 for denial and 22023 for unsupported
  isolation. Pricing/input validation also use 22023. Other PostgreSQL/helper errors
  can still occur; the service does not claim an exhaustive error inventory.

The response contract is therefore established from SQL source. It is not verified
by SQL execution. On replay, version 1 / brouillon / null remains the **original
creation receipt**, even after confirmation, cancellation or later modification.
The service does not reject a genuine replay because current detail would differ,
nor does it claim that a replay proves the contract is currently still a draft.

## Service contract and flow

```text
createRental(rawJson: string, context: RentalCreateContext,
             port: RentalCreatePort): Promise<RentalCreateResult>
```

Context is a separate server-provided record `{agencyId, creationKey}`. Both are
caller supplied; the service generates neither. The type names its intended trust
source, not an authorization proof. The eventual server boundary must authenticate
the user, select trusted context and enforce its own CSRF/configuration gates.

Flow:

1. Call parseRentalCreateJson on raw text, preserving lossless numeric validation,
   duplicate-key checks and existing field/pricing/strict-timestamp validation.
2. Snapshot the context's exact own-data shape. Reject malformed/getter/inherited
   context without invoking getters.
3. Call encodeRentalCreateRequest, retaining bounded UTC instants and canonical
   numeric money/UUIDs. Reject context IDs and range errors before invoking the port.
4. Freeze the new canonical argument object and details, then invoke port.create
   exactly once. Only p_agency_id, p_key and the six encoded business fields cross
   this boundary; no normalized bigint total is forwarded.
5. Validate the returned port envelope and receipt, constructing a fresh sanitized
   result from checked fields only. Do not log or return raw port errors.

Result variants:

| Result | Meaning |
|---|---|
| ok:true, value:{id,version:1,state:brouillon,number:null} | A structurally valid original creation receipt was returned by the injected port; current detail and real persistence are not independently proven |
| ok:false, code:invalid-input, errors | Raw/business validation failure; fixed existing field/code errors, no port call |
| ok:false, code:invalid-context, errors | Invalid context shape/UUID syntax; no port call |
| ok:false, code:out-of-range, errors | Encoder UTC bound rejected; no port call |
| ok:false, code:forbidden/conflict/invalid | Reviewed explicit RPC statement rejection mapped from 42501/40001/22023, respectively |
| ok:false, code:uncertain | Thrown transport/adapter failure, malformed result/envelope or unknown SQLSTATE; no success/rollback assertion |

22023 need not mean a bad client field: it can indicate server isolation/reference
conditions. Unknown errors are intentionally conservative. All failure information
uses fixed labels, never an exception message, query, payload, cookie or token.
Output contains only JSON-compatible scalar values and structured errors.

## Smallest injected port

```ts
type RentalCreatePort = Readonly<{
  create(args: RentalCreateRpcArguments): Promise<RentalCreatePortOutcome>;
}>;
type RentalCreatePortOutcome =
  | Readonly<{ kind: "success"; data: unknown }>
  | Readonly<{ kind: "rejected"; sqlState: string }>;
```

The method's fixed eventual target is public.contratpro_rental_create; there is no
generic SQL/RPC dispatcher. The envelope is an application port convention, not a
change to the SQL response. The eventual real adapter must return success only for
a completed RPC response, and rejected only for a confirmed statement rejection.
Transport failures, lost responses and ambiguous commits must throw/be treated as
uncertain. Error messages/details must not be copied into the port envelope.

Type annotations are not trusted at runtime: exact plain/null-prototype own-data
envelopes are checked again. Success data requires exactly four own fields, a
canonical lowercase 36-character UUID, numeric version 1, brouillon and null number.
Missing, extra, symbol, hidden, inherited and accessor fields are rejected. There
is no invented UUID version rule. A valid shape cannot authenticate a lying port
or prove that its receipt belongs to an agency: the SQL response has no agency
field, so a real authenticated adapter and database isolation remain essential.

## Retries and limitations

No retry loop, timer, key rotation, stateful fake database or durable cache exists.
An explicit second service call with the same caller context reuses the same
canonical key and arguments. Tests model a replay response, not real deduplication.
After uncertain outcomes the caller must retain the original payload/key/context;
changing them can create another operation. A future port owns transport timeouts;
a promise that never settles also leaves this service call pending.

The application layer cannot prove active membership, same-tenant references,
vehicle availability, client eligibility, numbering, transaction commit or audit
consistency. Creation itself does not reserve/confirm a vehicle. No identifier in
the JSON payload is trusted as agency/actor/key context, and unknown fields reject.
All existing strict timestamp, UTC encoder range and JSONB-size limitations remain.

## Verification and next step

Tests use vi.fn with synthetic receipts and explicit outcome envelopes, never a
database or network. Cases cover complete orchestration, exact arguments, local
validation denials, malformed context/port responses, reviewed SQLSTATE mapping,
transport errors, key preservation across explicit attempts, tenant-context
separation, frozen outbound snapshots and error sanitization.

Commands executed offline:

```text
npm run test --workspace=@contratpro/web -- src/rentals
npx --no-install tsc --project apps/web/tsconfig.json --noEmit --incremental false
npx --no-install eslint --config apps/web/eslint.config.mjs packages/application/src/rentals/create.ts apps/web/src/rentals/create-service.test.ts --max-warnings=0
git diff --check
```

Results: 359/359 rental tests passed across seven files, including 64 new service
tests. TypeScript passed. Targeted lint passed with the existing informational
Next.js pages-directory notice. Whitespace checks passed, including direct checks
on the new untracked files. The SQL draft retained SHA-256
3c27bc2a11de4d13a8003b35aa16d5d733eaeaa3be86557167a6fb2967214b79.

**GO for an offline HTTP adapter with fake dependencies only**, after review of the
service. That next task must implement bounded/fatal UTF-8 body reading, media-type
and origin/CSRF checks, injected authenticated context and deterministic response
mapping. It must not introduce real RPC calls or treat fake tests as Production
verification. No route is included in this change; Production remains NO-GO.
