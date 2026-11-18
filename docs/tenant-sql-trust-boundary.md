# Approved tenant SQL trust boundary — P1.2B-1R

ContratPro uses a **trusted server SQL executor**. Browsers never receive database
credentials or connect to PostgreSQL. Only trusted backend services/workers may
hold the application runtime credential. Platform authorization remains separate
from agency memberships and uses a different principal/credential boundary.

Before setting tenant context, future Auth.js integration must validate the session
server-side, obtain the authenticated user ID, resolve active agency membership,
and authorize the specific operation. Agency selection from a request is untrusted.
Neither a browser role claim nor a browser-supplied user ID is a trusted identity.
No authentication implementation or trusted-identity stub is introduced here.

`withTenantTransaction` supplies parameterized, transaction-local settings and checks
active user/membership/agency before callback work. UUID checks are input validation.
The helper is not authentication and PostgreSQL settings are not cryptographic
identity evidence. A compromised runtime credential or arbitrary SQL execution can
set another user's context and impersonate that identity. RLS is defense in depth
behind the trusted executor; it does not solve that compromise.

## Preventing user-controlled SQL

- There is no raw-SQL API, dashboard console, report-query editor or SQL endpoint.
- Keep the database handle private to server infrastructure; normal package exports
  remain `server-only`. The web placeholders do not import database code.
- Bind user values as parameters. Table/column names, sort expressions and operations
  must come from code-owned allowlists, never raw strings supplied by a browser.
- Never use SQL-template execution, `sql.raw` or dynamic query text on user content.
- Tenant callbacks are trusted application functions, not user scripts or plugins.
- The migration CLI accepts only fixed reviewed repository files and an approved
  plan digest; no argument/environment setting accepts SQL text or a migration path.
- Never expose migration credentials or execution through application routes.

No session-level tenant context, detached queries or context-switching nested
transactions are permitted. The wrapper's transaction is the only handle for its
work. Actual cleanup after commit/rollback/cancellation and pooled connection reuse
still requires PostgreSQL tests; the wrapper cannot erase a session-level value
introduced by other code.

## Connected acceptance requirements

Test server-side session/membership derivation when Auth.js is implemented. In the
earlier isolated database test stage, synthetic trusted contexts are test fixtures,
not fake application authentication. Demonstrate missing/invalid context denial,
revocation, cross-tenant queries and runtime permissions. Also demonstrate that raw
SQL can forge GUC context and record that as the accepted threat boundary, not as
an isolation success. Never claim resistance to a compromised SQL executor.

Keep FR/AR routes, mobile/PWA plans and online-first behavior unchanged. No service
worker, browser cache or client bundle may store database credentials or sensitive
tenant responses. Platform MFA and scoped support-access controls remain required
in their later implementation slices.
