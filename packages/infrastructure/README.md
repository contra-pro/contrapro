# Infrastructure boundary

Reserved for PostgreSQL/Drizzle, private storage and provider adapters. Keep
credentials server-side and runtime database privileges restricted. No adapters,
credentials, database resources or external connections are implemented in P1.1.

P1.2A adds the `database/` offline tooling workspace. It supplies a Drizzle schema,
reviewable SQL drafts and an injected transaction-context helper, without constructing
a PostgreSQL client or connecting anywhere. Runtime integration awaits P1.2B and
subsequent authentication authorization.
