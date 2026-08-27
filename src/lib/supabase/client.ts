"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { validateSupabaseConfig } from "./config";

let browserClient: SupabaseClient | undefined;

function browserSupabaseConfig() {
  return validateSupabaseConfig(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** Creates the browser client using only public Supabase configuration. */
export function createSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    const config = browserSupabaseConfig();
    browserClient = createBrowserClient(config.url, config.publishableKey, {
      auth: { flowType: "pkce" },
    });
  }
  return browserClient;
}
