# Temporary local auth access probe

Prepared only; no request was made and no flag was enabled.

After separate authorization, keep CONTRATPRO_AUTH_ACCESS_VERIFIED off and set
CONTRATPRO_DEV_AUTH_PROBE=true only in the local process running `npm run dev`.
The configured CONTRATPRO_APP_ORIGIN must match the localhost/127.0.0.1 HTTP origin.
Production builds always block this route, regardless of the opt-in flag.

Using the already signed-in browser on that exact origin, issue an empty same-origin
POST (do not paste or inspect cookies/tokens):

```javascript
fetch('/dev/auth-access-probe', { method: 'POST', credentials: 'same-origin', cache: 'no-store' })
  .then(response => response.json()).then(result => console.info(result));
```

Only a fixed state is returned, plus a fixed stage on blocked responses: activation,
request, authentication, transport, rpc_validation or internal. Transport includes
denied refresh/cookie writes and network failures, even when the SDK catches them.
Stages identify a failure category, not its underlying provider error. There is no session creation, cookie write or refresh
endpoint access. An expired or near-expiry session requiring SDK refresh fails closed;
do not generate a new login or refresh it as part of this diagnostic authorization.
The transport permits only pinned-project user verification, JWKS retrieval and one
fixed read RPC. Redirects and repeated RPC calls are blocked. A legacy signing key
may require two user-verification requests. Production authorization gates are unchanged.

`onboarding_ready` means active mapped identity with zero memberships.
`membership_present` means eligible membership evidence, not a grant of UI access.
`unmapped` means the self-only RPC returned no mapping. `rpc_error` or `blocked`
requires diagnosis; no raw errors or identities are returned. `authenticated` is a
reserved allowed state, not a terminal outcome currently emitted.

One successful read is not proof of cross-tenant isolation or permission-revocation
behavior. No global verification flag should be enabled based solely on this probe.

After verification, remove the probe route, access-probe.ts, access-probe.test.ts and
this document; revert only the optional transport injection in auth/server.ts and
remove the diagnostic process variable. Do not remove existing authentication code.
