import type { NextConfig } from "next";
import { validatePublicConfig } from "./src/auth/config";

// Reject a misconfigured private key before it could be inlined into a browser bundle.
if (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
  validatePublicConfig(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
      ],
    }, ...["fr","ar"].flatMap(locale=>["sign","contract"].map(area=>({source:`/${locale}/${area}/:path*`,headers:[
      {key:"Content-Security-Policy",value:"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: blob:; frame-src blob:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"},
      {key:"Referrer-Policy",value:"no-referrer"},
      {key:"X-Robots-Tag",value:"noindex, nofollow, noarchive"},
    ]}))), ...["fr", "ar"].flatMap(locale => ["sign-in", "sign-up", "forgot-password", "reset-password"].map(page => ({
      // Later matching headers override the global policy for these documents only.
      // Native POST must retain Origin; the auth handler still rejects null/missing origins.
      source: `/${locale}/${page}`,
      headers: [{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }],
    })))];
  },
};

export default nextConfig;
