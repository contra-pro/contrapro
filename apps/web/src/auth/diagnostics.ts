import "server-only";
import type { PasswordOperation } from "./password";
export type AuthStage = "configuration" | "request-validation" | "form" | "client" | "cookie-write" | "callback" |
  "signup-request" | "signup-response" | "session-verification" | "password-request" | "password-update" | "recovery-request";
export type AuthDiagnostic = { operation: PasswordOperation; stage: AuthStage; category: "configuration" | "provider" | "transport" | "exception";
  code: string; httpStatus?: number };
const allowedCodes = new Set(["signup_disabled", "email_provider_disabled", "email_address_not_authorized", "email_address_invalid",
  "user_already_exists", "email_exists", "weak_password", "over_request_rate_limit", "over_email_send_rate_limit", "captcha_failed",
  "unexpected_failure", "validation_failed", "bad_json", "hook_timeout", "hook_timeout_after_retry", "hook_payload_invalid_content_type",
  "request_timeout", "flow_state_not_found", "flow_state_expired", "bad_code_verifier", "otp_expired", "email_not_confirmed", "invalid_credentials"]);
/** Allowlisted fields only. Never serialize the error, message, request, body, URL, user or cookies. */
export function authDiagnostic(operation: PasswordOperation, stage: AuthStage, error: unknown): AuthDiagnostic {
  const record = error && typeof error === "object" ? error : {};
  const rawCode = "code" in record && typeof record.code === "string" ? record.code : "";
  const code = allowedCodes.has(rawCode) ? rawCode : "unclassified";
  const configuration = "message" in record && record.message === "AUTH_CONFIGURATION_UNAVAILABLE";
  const name = "name" in record ? record.name : "";
  const category = configuration ? "configuration" : ["AuthRetryableFetchError", "AbortError", "TimeoutError"].includes(String(name)) ? "transport"
    : code !== "unclassified" ? "provider" : "exception";
  const status = "status" in record ? record.status : null;
  return { operation, stage, category, code, ...(typeof status === "number" && Number.isInteger(status) && status >= 100 && status <= 599 ? { httpStatus: status } : {}) };
}
export function developmentAuthDiagnostic(event: AuthDiagnostic) {
  if (process.env.NODE_ENV === "development") console.info("[contratpro-auth]", JSON.stringify(event));
}
