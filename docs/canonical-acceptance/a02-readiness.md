# A02 operator readiness — preparation only

A01 is already accepted; do not rerun it. A02 reuses `createCategoryAObserver`
and `collectCase`, with no new harness, endpoint, SQL, fixture or gate change.
This preparation has not inspected credentials or established availability of
any real synthetic sessions. Live A02 remains BLOCKED until the inputs and
independent observation mechanisms below are supplied and reviewed.

The bounded [identity inventory procedure](a02-identity-inventory.md) can establish
the database baseline for three already-known synthetic nominations under separate
Development read-only authorization. It does not discover users or acquire sessions.

## Fixed request and result contract

Migration `20261115000400_supabase_auth.sql` lines 52–68 defines the zero-argument
`public.contratpro_auth_access()` as SQL STABLE SECURITY INVOKER, search_path
pg_catalog, a SELECT filtered by `link.supabase_user_id = (SELECT auth.uid())`.
Authenticated EXECUTE on this read RPC is distinct from the denied provisioning
EXECUTE. No new permission is required or authorized.

Exactly three sequential requests, A then B then U:

```text
GET https://gllsiklbvqpxzucvkehw.supabase.co/rest/v1/rpc/contratpro_auth_access
Accept: application/json
apikey: (existing Development sb_publishable_ key, memory only)
Authorization: Bearer (corresponding existing session, memory only)
```

No request body, query, Origin, cookies, extra RPC arguments, user ID parameter,
login or refresh. The existing guard ceiling is four, but the case issues three;
the spare slot does not authorize a fourth probe. No retry. Each request <=7s,
observer <=9s, collectCase <=10s. Body <=8192 bytes. Require exact requested response
URL, 200 JSON and no redirect, Location or Set-Cookie. Unexpected/401/403 responses,
expiry, cancellation or missing evidence stop the case; never refresh to recover.

| Session | Existing fixture prerequisite | Required response |
| --- | --- | --- |
| A | Active canonical mapping, no memberships | Exactly one own active row |
| B | Different Auth subject and canonical mapping, active, no memberships | Exactly one own active row |
| U | Existing Auth subject, no canonical mapping | Empty array |

A/B rows have exactly supabase_user_id, user_id, user_state, membership_id,
agency_id, agency_name, membership_state, agency_state. Subject and canonical ID
must match the independently known baseline; user_state is active and all five
membership/agency fields are null. All three subjects are distinct; A/B canonical
UUIDs differ from each other and every subject UUID. No customer accounts.

This proves self-only access discovery for this isolated cohort. It does not test
arbitrary cross-user query injection, write privileges or provisioning concurrency;
those remain other acceptance cases. U's empty result alone cannot independently
prove that the supplied identity is genuinely unmapped: require its prior baseline.

## Existing-session input, without token exposure

The observer accepts the following object directly in the authorized process:

```text
sessions: { A: session, B: session, U: session }
session: {
  accessToken, subject, canonicalUserId, projectRef,
  isSynthetic: true, source: "operator-verified-existing-session",
  verifiedAt, expiresAt
}
```

U canonicalUserId is null. Times are epoch milliseconds. At initial validation
and before/after each corresponding read, verification age must be <=60 seconds,
not future-dated, and expiry must be >10 seconds away. JWT shape must bind sub,
issuer `https://gllsiklbvqpxzucvkehw.supabase.co/auth/v1`, aud/role authenticated,
is_anonymous false and exp matching expiresAt. Decoding is NOT signature verification.
Use the actual time of prior independent server verification, never Date.now()
to relabel an unverified token as fresh. Real gateway verification is still needed.

Only an existing operator-controlled credential-bearing process may pass these
objects to the observer in memory. Its reviewed bootstrap must already possess
the sessions or use an approved non-echoing local input channel. This repository
has no such secure session-acquisition bootstrap or A02 CLI. No argv token, inline
PowerShell/Node expression containing tokens, shell history, repository file,
transcript, raw HTTP dump, debug logger, browser-storage extraction or clipboard
automation. Do not paste sessions into chat. Environment/token-file loading is
not implemented and must not be assumed. Do not print whole config/session objects.
An application bootstrap with normal auth middleware or an SDK could refresh;
therefore it is not automatically an acceptable transport/session supplier.

If existing verified A/B/U sessions or their baseline cannot meet the freshness
window without login, refresh or fixture creation, STOP and report that blocker.
Neither new users nor verification requests are authorized by the three-read plan.

## Independent no-write / no-provisioning evidence

The A02 fact contract contains `authAccessRpcOnly` and `noDataChanges`; it does not
contain an additional noProvisioningRpc field. Do not change the fact schema or
add a fabricated flag. Absence of provisioning calls is supported by a separately
reviewed, complete egress trace for the exact A02 execution window showing only
the three fixed GETs. Record logical session labels, sequence, fixed path, method,
status, run correlation and start/end timestamps; redact Authorization, apikey,
cookies, raw IDs, bodies and errors BEFORE any logging. Unaccounted outbound calls,
redirects, retries, process/worker gaps or incomplete traces block acceptance.

The existing A01 server preload matches local /fr|ar/auth/provision only. Its
previous trace cannot attest an A02 process making direct HTTPS RPC reads. Do not
reuse the A01 run/window or claim that A01 instrumentation automatically covers A02.

To confirm `noDataChanges`, require independent before/after observation of the
isolated cohort's identity.users, identity.supabase_users and relevant
tenancy.memberships/agencies rows and relationships, plus an approved means to
detect unexpected candidate rows/orphans. A self-only read response or a static
STABLE/SELECT definition does not by itself prove unchanged live data. Keep private
baselines outside the repository and report booleans only. Serialize other cohort
activity. Global counts and ordinary gateway access logs alone are insufficient.
Before/after equality proves no observed persistent delta, not absence of transient
or attempted writes. A strict no-write claim additionally needs authoritative
read-only transaction enforcement evidence or complete scoped database statement/
write auditing. Do not silently broaden noDataChanges into that stronger claim.
Reuse the accepted migration/postflight contract; any extra live database observer
or audit access needs separate explicit, finite read-only authorization. This
preparation supplies no SQL observer and authorizes no SQL or additional HTTP.

The existing confirmEvidence callback receives id, requestCount and AbortSignal.
For A02 it must return exactly `{noDataChanges:true}` only after independent evidence
is sufficient, otherwise reject/return no confirmation. To preserve the 9/10-second
case bound, baseline capture must precede execution and after-observation must
already be available within the callback deadline; if not feasible, this execution
procedure remains blocked. Never replace the callback with an always-true function.

## Minimal future operator procedure

1. Separately authorize A02 only, the exact project, existing A/B/U cohort, execution
   window and three GETs; approve any independently bounded observation reads.
   Reconfirm provisioning OFF and the applicability of accepted provisioning
   EXECUTE denial. Do not grant, log in, refresh, create fixtures or activate gates.
2. Review the credential-bearing bootstrap, HTTPS transport and independent
   observer before supplying tokens. Transport must pin the URL above, honor
   AbortSignal, use normal trusted TLS/hostname verification, preserve response
   metadata, omit ambient cookies/proxy credentials, log no secrets and perform
   no retries/refresh/additional requests. No TLS bypass or arbitrary proxy/URL.
3. Establish the private baseline and live observation window, then supply the
   existing fresh verified sessions in memory. Do not use synthetic offline JWTs.
4. Invoke the existing interface once, as below. The unresolved variable names are
   explicit operator-provided ports, not modules or credentials discovered here:

```javascript
import { createCategoryAObserver } from './scripts/canonical-category-a-observer.mjs';
import { collectCase, loadPlan } from './scripts/canonical-security-acceptance.mjs';

const plan = await loadPlan(); // load before supplying time-sensitive sessions
const observer = createCategoryAObserver(operatorConfig, {
  request: reviewedHttpsTransport,
  confirmEvidence: reviewedIndependentObserver,
});
const observation = await collectCase(plan, 'A02', observer, {
  authorization: {
    projectRef: 'gllsiklbvqpxzucvkehw', environment: 'development', category: 'A',
  },
  timeoutMs: 10000,
});
// Persist only the validated boolean observation and non-secret run/window evidence.
// Never log operatorConfig, transport headers, raw responses or caught errors.
```

operatorConfig must use the existing allowed keys: projectRef fixed above,
projectUrl https://gllsiklbvqpxzucvkehw.supabase.co, environment development,
appOrigin http://localhost:3000
(factory contract only; A02 never requests it), provisioningEnabled false,
authenticatedExecuteDenied/operatorTargetConfirmed/artifactContractVerified true,
publicKey and sessions. Confirmation booleans are operator assertions, not live
configuration/privilege attestations. The API descriptor does not grant permission.

5. Retain the three-request trace, exact window, protected baseline/after evidence
   and all six A02 facts for independent review. No automatic repeat on uncertainty.
   Do not label incomplete observation as PASS or authorize provisioning activation.

There is intentionally no source-supported one-line A02 execution command yet:
the secure credential-bearing bootstrap, reviewed HTTPS transport and independent
no-change observer remain operator inputs. The A01 runner rejects A02 and remote
RPC calls; do not repurpose it or improvise curl commands with token arguments.

## Offline checks

The existing observer tests use deterministic unsigned synthetic fixtures and
injected transports only. They do not establish real session availability, JWT
signatures, RLS behavior, live no-write evidence or TLS success. Use the targeted
offline command below; no A01 live rerun is needed:

```powershell
node --test --test-name-pattern="A02|session|JWT|configuration|transport" scripts/canonical-category-a-observer.test.mjs
```

Result: 25 tests passed, zero failures, exit 0. Only documentation changed; no
application code, harness, gates, credentials or fixtures changed. TypeScript and
ESLint were not rerun for these Markdown-only changes. No live calls were made.
