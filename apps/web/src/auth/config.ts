export const AUTH_PROJECT_URL = "https://gllsiklbvqpxzucvkehw.supabase.co";

// Enable only after the operator configures Google in this Supabase project.
export function googleAuthEnabled() { return process.env.CONTRATPRO_GOOGLE_AUTH_ENABLED === "true"; }

// Only public values are read here; Next inlines these named browser variables.
export function publicAuthConfig() {
  return validatePublicConfig(process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export function validatePublicConfig(url: unknown, key: unknown) {
  if (url !== AUTH_PROJECT_URL || typeof key !== "string" || key.length > 4096) {
    throw new Error("AUTH_CONFIGURATION_UNAVAILABLE");
  }
  let publicKey = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
  if (!publicKey) {
    try {
      const parts = key.split(".");
      const payload: unknown = JSON.parse(atob((parts[1] ?? "").replace(/-/g, "+").replace(/_/g, "/")));
      // This classifies a PUBLIC legacy key, never verifies a user JWT.
      publicKey = parts.length === 3 && typeof payload === "object" && payload !== null &&
        "role" in payload && payload.role === "anon";
    } catch { publicKey = false; }
  }
  if (!publicKey) throw new Error("AUTH_CONFIGURATION_UNAVAILABLE");
  return { url: AUTH_PROJECT_URL, key };
}

export function appOrigin(value: unknown): string {
  if (typeof value !== "string") throw new Error("AUTH_CONFIGURATION_UNAVAILABLE");
  const parsed = new URL(value);
  if (parsed.origin !== value || parsed.username || parsed.password ||
    (parsed.protocol !== "https:" && !(parsed.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(parsed.hostname)))) {
    throw new Error("AUTH_CONFIGURATION_UNAVAILABLE");
  }
  return parsed.origin;
}
