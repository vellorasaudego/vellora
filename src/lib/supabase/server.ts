import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { runtimeValue } from "../runtime-config";
import { validateSupabaseConfig } from "./config";

export type PendingSupabaseCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

export type SupabaseCookieState = {
  cookies: PendingSupabaseCookie[];
  headers: Record<string, string>;
};

function serverSupabaseConfig() {
  return validateSupabaseConfig(
    runtimeValue("NEXT_PUBLIC_SUPABASE_URL") || runtimeValue("SUPABASE_URL"),
    runtimeValue("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ||
      runtimeValue("SUPABASE_PUBLISHABLE_KEY") ||
      runtimeValue("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
      runtimeValue("SUPABASE_ANON_KEY"),
  );
}

export function createSupabaseCookieState(): SupabaseCookieState {
  return { cookies: [], headers: {} };
}

export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  const config = serverSupabaseConfig();

  return createServerClient(config.url, config.publishableKey, {
    auth: { flowType: "pkce" },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot always mutate response cookies. The
          // proxy refreshes the session and owns the response in that case.
        }
      },
    },
  });
}

export function createSupabaseRequestClient(
  request: Pick<NextRequest, "cookies">,
  state: SupabaseCookieState,
): SupabaseClient {
  const config = serverSupabaseConfig();

  return createServerClient(config.url, config.publishableKey, {
    auth: { flowType: "pkce" },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, responseHeaders) {
        // Keep the request view in sync before the proxy creates the upstream
        // response. This is required when getUser() refreshes an expired token.
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        state.cookies.push(...cookiesToSet);
        Object.assign(state.headers, responseHeaders);
      },
    },
  });
}

/**
 * Creates a client for Auth operations that do not need a session. Unlike
 * createServerClient, this client does not force PKCE or write verifier
 * cookies. It is used to request a token_hash recovery email.
 */
export function createSupabaseStatelessClient(): SupabaseClient {
  const config = serverSupabaseConfig();

  return createClient(config.url, config.publishableKey, {
    auth: {
      flowType: "implicit",
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export function applySupabaseCookieState(
  response: NextResponse,
  state: SupabaseCookieState,
): NextResponse {
  state.cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  Object.entries(state.headers).forEach(([name, value]) => response.headers.set(name, value));
  return response;
}
