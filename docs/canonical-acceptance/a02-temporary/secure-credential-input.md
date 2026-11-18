# A02 private operator input — offline preparation only

Gate 2 remains unauthorized. No addresses or credentials are bound by this document.
The nominated A/B/U UUIDs in the execution packet remain unchanged.

## Future approved execution

Use a dedicated local Node process in a private interactive terminal, with terminal
recording, PowerShell transcription, request-body logging and debugger capture off.
Do not use a REPL, redirected input, command-line values, environment variables,
repository files or JSON packets for these credentials. Do not disclose addresses
to ChatGPT. The operator must privately confirm ownership of all three addresses;
the approved domain and ownership evidence remain UNBOUND.

The existing executor can import `readA02Credentials` from
`scripts/a02-private-input.mjs`. Importing it does nothing. After execution approval,
call `await readA02Credentials({signal})` with the executor's cancellation signal.
It prompts for A email/password, B email/password, U email/password, with no echo
for any field. Input is bounded to three minutes; cancellation, EOF, timeout,
non-TTY input or another stdin consumer fails closed with a fixed error.

Pass the returned synchronous `provider` to the existing `bootstrapA02Sessions`
credentialProvider port, and to the separately reviewed Auth creation executor.
Use `phase: 'fixture-setup'` with the packet's unchanged subjects. The existing
pinned HTTPS transport and six-request bootstrap budget are unchanged. No Auth
creation executor is activated or approved by this input helper. The separate
offline-prepared executor is documented in executor-observer-procedure.md. Do not run the
old credential generator for this operator-owned-address procedure.

Always call `dispose()` in `finally`, including partial creation, cancellation or
uncertainty. It releases retained references and invalidates existing handles;
JavaScript strings and previous copies cannot be reliably zeroized. End the process
after the approved lifecycle. No refresh tokens are returned or retained.

Default console inspection and JSON serialization redact credential handles and
returned sessions. Explicit property extraction, spreading/copying, debugger getter
evaluation, heap dumps and logging request bodies can still reveal plaintext and
are forbidden. Serialization at the intentional Auth request boundary necessarily
contains the credentials; the transport and executor must never log that payload.
Use only fixed status codes and A/B/U labels in diagnostics, never provider values,
transport objects, raw errors or server responses. This is accidental-output
hardening, not protection from hostile code inside the credential-bearing process.

## Before any Auth creation: separately scoped read-only collision check

The existing `scripts/inventory-a02-identities.sql` checks only exact nominated
UUIDs. It cannot prove the private addresses are unused. A reviewed observer must
also perform a bounded, parameterized lookup of these three addresses. A minimal
query shape is below; it is a proposal, not executable authorization:

```sql
WITH nominated(label, subject, email) AS (
  VALUES ('A', $1::uuid, $2::text),
         ('B', $3::uuid, $4::text),
         ('U', $5::uuid, $6::text)
)
SELECT n.label,
       EXISTS (SELECT 1 FROM auth.users a WHERE a.id = n.subject)
         AS nominated_id_exists,
       EXISTS (SELECT 1 FROM auth.users a WHERE lower(a.email) = lower(n.email))
         AS email_exists
FROM nominated n ORDER BY n.label LIMIT 3;
```

Bind UUIDs from the packet and addresses from the private memory provider, never
SQL interpolation, psql variables or command arguments. Establish client AND server
parameter-log protections before sending private parameters: parameterization alone
does not prevent database logs from recording them. The observer artifact, secure
channel, transaction/timeouts and single-query budget require explicit review and
approval; no new live check has run. Only labels and booleans may leave the observer.

Expected output: exactly A/B/U, both booleans false for every row. Any existing ID
or email, missing row, unavailable evidence or uncertain response stops creation.
Do not reset, update, adopt or probe an existing account through login. Resolve an
address collision privately with the operator and repeat only under approved scope;
do not silently change UUIDs or create substitutes. Absence can race with creation:
any creation conflict or lost response requires exact-ID read-only reconciliation,
never automatic retry or compensation. Cleanup remains separate Gate 4 authority.
