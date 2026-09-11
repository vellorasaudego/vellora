import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";

function resolveSupabaseOrigins() {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!configuredUrl) return [];

  try {
    const origin = new URL(configuredUrl).origin;
    return [origin, origin.replace(/^https:/, "wss:")];
  } catch {
    // Fail closed when a malformed public URL is supplied at build time.
    return [];
  }
}

const supabaseOrigins = resolveSupabaseOrigins();

/**
 * Enforced on the Vercel/Next runtime. The current app uses an inline Google
 * Ads bootstrap and Tailwind/Turnstile inline styles, so unsafe-inline is a
 * deliberate compatibility exception until those scripts can receive a
 * nonce. External origins remain explicitly allow-listed.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://www.google.com https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://www.googletagmanager.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://www.google.com https://challenges.cloudflare.com",
  `connect-src 'self' ${supabaseOrigins.join(" ")} https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://www.google.com https://challenges.cloudflare.com`,
  "font-src 'self' data:",
  "frame-src 'self' https://challenges.cloudflare.com",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
