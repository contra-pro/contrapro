import "server-only";
import { createRental, type RentalCreateContext, type RentalCreatePort } from "../../../../packages/application/src/rentals/create";
import { rentalJsonMaxBytes } from "../../../../packages/domain/src/rentals/json-boundary";
import { appOrigin } from "../auth/config";

export type RentalHttpDependencies = Readonly<{
  origin: string;
  /** Must establish server context independently of untrusted body/agency headers. */
  resolveContext(request: Request): Promise<RentalCreateContext | null>;
  port: RentalCreatePort;
}>;

class BodyFailure extends Error {
  constructor(readonly code: "invalid-input" | "too-large") { super(code); }
}

async function readBody(request: Request): Promise<string> {
  if (!request.body || request.bodyUsed) throw new BodyFailure("invalid-input");
  const reader = request.body.getReader();
  // ignoreBOM:true preserves the BOM character; the JSON boundary rejects it.
  const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      if (!(chunk.value instanceof Uint8Array)) throw new BodyFailure("invalid-input");
      bytes += chunk.value.byteLength;
      if (bytes > rentalJsonMaxBytes) throw new BodyFailure("too-large");
      text += decoder.decode(chunk.value, { stream: true });
    }
    return text + decoder.decode();
  } catch (error) {
    try { await reader.cancel(); } catch { /* Preserve the original sanitized failure. */ }
    throw error instanceof BodyFailure ? error : new BodyFailure("invalid-input");
  } finally {
    reader.releaseLock();
  }
}

function reply(body: object, status: number, extra: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: {
    "Cache-Control": "private, no-store, max-age=0",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    ...extra,
  } });
}
const failure = (code: string, status: number, extra?: Record<string, string>) => reply({ ok: false, code }, status, extra);

/** Isolated offline factory: no default dependencies or publicly registered route. */
export function createRentalHttpHandler(dependencies: RentalHttpDependencies): (request: Request) => Promise<Response> {
  let origin: string;
  try {
    if (!dependencies || typeof dependencies.resolveContext !== "function" || typeof dependencies.port?.create !== "function") throw new Error();
    origin = appOrigin(dependencies.origin);
  } catch { throw new Error("RENTAL_HTTP_CONFIGURATION_INVALID"); }
  const { resolveContext, port } = dependencies;

  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") {
      const response = failure("method-not-allowed", 405, { Allow: "POST" });
      return request.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response;
    }
    if (new URL(request.url).origin !== origin || request.headers.get("origin") !== origin) return failure("forbidden", 403);
    const contentType = request.headers.get("content-type") ?? "";
    const mediaType = /^[ \t]*application\/json(?:[ \t]*;[ \t]*charset[ \t]*=[ \t]*(?:"utf-8"|utf-8))?[ \t]*$/i.exec(contentType);
    const encoding = request.headers.get("content-encoding");
    if (!mediaType || mediaType[0] !== contentType || (encoding !== null && encoding.toLowerCase() !== "identity")) {
      return failure("unsupported-media-type", 415);
    }
    let raw: string;
    try { raw = await readBody(request); }
    catch (error) { return error instanceof BodyFailure && error.code === "too-large"
      ? failure("too-large", 413) : failure("invalid-input", 400); }
    let context: RentalCreateContext | null;
    try { context = await resolveContext(request); }
    catch { return failure("unavailable", 503); }
    if (context === null || context === undefined) return failure("forbidden", 403);
    try {
      const result = await createRental(raw, context, port);
      if (result.ok) return reply(result, 200);
      switch (result.code) {
        case "quota": return failure("quota", 429);
        case "restricted": return failure("restricted", 402);
        case "invalid-input": case "out-of-range": return reply(result, 400);
        case "invalid-context": case "forbidden": return failure("forbidden", 403);
        case "conflict": return failure("conflict", 409);
        case "invalid": return failure("invalid", 400);
        case "uncertain": return failure("uncertain", 503);
      }
    } catch { return failure("uncertain", 503); }
  };
}
