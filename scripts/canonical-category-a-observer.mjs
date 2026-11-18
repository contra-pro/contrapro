/** Category A observer for collectCase. No CLI, credential discovery, SDK, SQL,
 * default fetch, login or refresh. Construction/import never makes a request.
 * Only a separately authorized operator may inject a reviewed live transport.
 */
const projectRef = "gllsiklbvqpxzucvkehw";
const projectUrl = `https://${projectRef}.supabase.co`;
const rpcUrl = `${projectUrl}/rest/v1/rpc/contratpro_auth_access`;
const localOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const allowedKeys = (value, keys) => object(value) && Object.keys(value).every(key => keys.includes(key));
const blocked = () => { throw new Error("CATEGORY_A_BLOCKED"); };

function sessionEvidence(session, now) {
  if (!allowedKeys(session, ["accessToken", "subject", "canonicalUserId", "verifiedAt", "expiresAt", "isSynthetic", "source", "projectRef"])
    || session.projectRef !== projectRef || session.source !== "operator-verified-existing-session" || session.isSynthetic !== true
    || !uuid.test(session.subject) || !Number.isSafeInteger(session.verifiedAt) || session.verifiedAt > now
    || now - session.verifiedAt > 60000 || !Number.isSafeInteger(session.expiresAt) || session.expiresAt <= now + 10000
    || typeof session.accessToken !== "string" || session.accessToken.length > 8192
    || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(session.accessToken)) blocked();
  // Shape/consistency only. This decode does NOT verify JWT signatures. The operator
  // must supply independent verified-session evidence; real PostgREST verifies JWTs.
  const claims = JSON.parse(Buffer.from(session.accessToken.split(".")[1], "base64url").toString("utf8"));
  if (!object(claims) || claims.sub !== session.subject || claims.iss !== `${projectUrl}/auth/v1`
    || claims.aud !== "authenticated" || claims.role !== "authenticated" || claims.is_anonymous !== false
    || !Number.isSafeInteger(claims.exp) || !Number.isSafeInteger(claims.exp * 1000)
    || claims.exp * 1000 !== session.expiresAt) blocked();
}

async function readJson(response, limit) {
  if (!response.headers.get("content-type")?.toLowerCase().startsWith("application/json") || !response.body) blocked();
  const reader = response.body.getReader(); let size = 0; const chunks = [];
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.length; if (size > limit) { void reader.cancel().catch(() => {}); blocked(); }
      chunks.push(part.value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally { reader.releaseLock(); }
}

export function createCategoryAObserver(config, { request, confirmEvidence, now = Date.now } = {}) {
  if (!allowedKeys(config, ["projectRef", "environment", "appOrigin", "projectUrl", "provisioningEnabled",
    "authenticatedExecuteDenied", "operatorTargetConfirmed", "artifactContractVerified", "publicKey", "sessions"])
    || config.projectRef !== projectRef || config.environment !== "development" || config.projectUrl !== projectUrl
    || !localOrigins.includes(config.appOrigin) || config.provisioningEnabled !== false
    || config.authenticatedExecuteDenied !== true || config.operatorTargetConfirmed !== true || config.artifactContractVerified !== true
    || typeof request !== "function" || typeof confirmEvidence !== "function" || typeof now !== "function") blocked();
  const used = new Set();
  // Snapshot supplied configuration; do not permit a caller to switch a target or
  // replace a token after validation. Nothing reads environment, cookies or storage.
  const options = structuredClone(config);
  return async ({ id, signal } = {}) => {
    const run = new AbortController(); let timer; let abort;
    try {
      if (!["A01", "A02"].includes(id) || used.has(id) || !signal || signal.aborted || !Number.isSafeInteger(now())) blocked();
      used.add(id);
      abort = () => run.abort(); signal.addEventListener("abort", abort, { once: true });
      timer = setTimeout(abort, 9000);
      let count = 0;
      // Races also stop a non-cooperative test transport; real transport must honor
      // abort to terminate in-flight I/O. No callback is a security sandbox.
      const bounded = operation => {
        if (run.signal.aborted) blocked();
        return new Promise((resolve, reject) => {
          const cancelled = () => reject(new Error("CATEGORY_A_BLOCKED"));
          run.signal.addEventListener("abort", cancelled, { once: true });
          Promise.resolve().then(operation).then(resolve, reject).finally(() => run.signal.removeEventListener("abort", cancelled));
        });
      };
      async function send(url, init, expectedStatus, limit = 4096, empty = false) {
        if (++count > (id === "A01" ? 8 : 4)) blocked();
        if (url !== rpcUrl && ![`${options.appOrigin}/fr/auth/provision`, `${options.appOrigin}/ar/auth/provision`].includes(url)) blocked();
        if ((url === rpcUrl && init.method !== "GET") || (url !== rpcUrl && !["GET", "POST"].includes(init.method))) blocked();
        const requestController = new AbortController();
        const cancel = () => requestController.abort();
        run.signal.addEventListener("abort", cancel, { once: true });
        const timeout = setTimeout(cancel, 7000);
        try {
          return await bounded(async () => {
            const onAbort = new Promise((_, reject) => requestController.signal.addEventListener("abort", () => reject(new Error("CATEGORY_A_BLOCKED")), { once: true }));
            return await Promise.race([onAbort, (async () => {
              if (requestController.signal.aborted) blocked();
              const response = await request(url, { ...init, redirect: "error", credentials: "omit", cache: "no-store",
                referrerPolicy: "no-referrer", signal: requestController.signal });
              if (requestController.signal.aborted || response.redirected || response.url !== url || response.status !== expectedStatus
                || response.headers.has("location") || response.headers.has("set-cookie")) blocked();
              if (empty) return null;
              return await readJson(response, limit);
            })()]);
          });
        } finally { clearTimeout(timeout); run.signal.removeEventListener("abort", cancel); requestController.abort(); }
      }
      let facts;
      if (id === "A01") {
        const probes = [
          ["fr", "POST", options.appOrigin, undefined, 503, "blocked"],
          ["ar", "POST", options.appOrigin, undefined, 503, "blocked"],
          ["fr", "POST", "https://invalid.example", undefined, 403, "forbidden"],
          ["ar", "POST", "https://invalid.example", undefined, 403, "forbidden"],
          ["fr", "POST", undefined, undefined, 403, "forbidden"],
          ["ar", "POST", options.appOrigin, "{}", 400, "invalid"],
          ["fr", "GET", undefined, undefined, 405],
          ["ar", "GET", undefined, undefined, 405],
        ];
        for (const [locale, method, origin, body, status, code] of probes) {
          const result = await send(`${options.appOrigin}/${locale}/auth/provision`, { method,
            headers: { ...(origin ? { Origin: origin } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
            ...(body ? { body } : {}) }, status, 4096, method === "GET");
          if (method !== "GET" && (!allowedKeys(result, ["ok", "code"]) || Object.keys(result).length !== 2 || result.ok !== false || result.code !== code)) blocked();
        }
        const confirmation = await bounded(() => confirmEvidence({ id, requestCount: count, signal: run.signal }));
        if (!allowedKeys(confirmation, ["noProvisioningRpc"]) || confirmation.noProvisioningRpc !== true) blocked();
        facts = { frAndArChecked: true, emptySameOriginPostBlocked503: true, noProvisioningRpc: true,
          csrfRejected403: true, nonemptyBodyRejected400: true, getCannotProvision: true };
      } else {
        if (!allowedKeys(options.sessions, ["A", "B", "U"]) || Object.keys(options.sessions).length !== 3
          || typeof options.publicKey !== "string" || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(options.publicKey)) blocked();
        const sessions = options.sessions;
        for (const session of Object.values(sessions)) sessionEvidence(session, now());
        const subjects = new Set(Object.values(sessions).map(s => s.subject.toLowerCase()));
        if (subjects.size !== 3 || !uuid.test(sessions.A.canonicalUserId) || !uuid.test(sessions.B.canonicalUserId)
          || sessions.U.canonicalUserId !== null || sessions.A.canonicalUserId.toLowerCase() === sessions.B.canonicalUserId.toLowerCase()
          || subjects.has(sessions.A.canonicalUserId.toLowerCase()) || subjects.has(sessions.B.canonicalUserId.toLowerCase())) blocked();
        for (const label of ["A", "B", "U"]) {
          const session = sessions[label]; sessionEvidence(session, now());
          const rows = await send(rpcUrl, { method: "GET", headers: { Accept: "application/json", apikey: options.publicKey,
            Authorization: `Bearer ${session.accessToken}` } }, 200, 8192);
          sessionEvidence(session, now());
          if (!Array.isArray(rows) || rows.length !== (label === "U" ? 0 : 1)) blocked();
          if (label !== "U") {
            const row = rows[0];
            if (!allowedKeys(row, ["supabase_user_id", "user_id", "user_state", "membership_id", "agency_id", "agency_name", "membership_state", "agency_state"])
              || Object.keys(row).length !== 8 || row.supabase_user_id !== session.subject || row.user_id !== session.canonicalUserId
              || row.user_state !== "active" || !["membership_id", "agency_id", "agency_name", "membership_state", "agency_state"].every(key => row[key] === null)) blocked();
          }
        }
        const confirmation = await bounded(() => confirmEvidence({ id, requestCount: count, signal: run.signal }));
        if (!allowedKeys(confirmation, ["noDataChanges"]) || confirmation.noDataChanges !== true) blocked();
        facts = { existingSyntheticSessionsOnly: true, authAccessRpcOnly: true, subjectASeesOnlyA: true,
          subjectBSeesOnlyB: true, unmappedRemainsUnmapped: true, noDataChanges: true };
      }
      if (run.signal.aborted) blocked();
      return facts;
    } catch { throw new Error("CATEGORY_A_BLOCKED"); }
    finally { clearTimeout(timer); if (signal && abort) signal.removeEventListener("abort", abort); run.abort(); }
  };
}
