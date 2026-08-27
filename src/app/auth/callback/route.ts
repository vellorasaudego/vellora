import { NextRequest, NextResponse } from "next/server";
import { getAuthProvider } from "@/lib/auth";
import {
  applySupabaseCookieState,
  createSupabaseCookieState,
} from "@/lib/supabase/server";
import { createSupabaseRequestClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null, requestUrl: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";

  try {
    const target = new URL(value, requestUrl);
    if (target.origin !== new URL(requestUrl).origin) return "/";
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return "/";
  }
}

function isRecoveryFlow(request: NextRequest, next: string): boolean {
  if (request.nextUrl.searchParams.get("flow") === "recovery") return true;
  try {
    return new URL(next, request.url).pathname === "/redefinir-senha";
  } catch {
    return false;
  }
}

function redirectAfterCallback(request: NextRequest, recovery: boolean, error: boolean) {
  const target = recovery ? "/redefinir-senha" : "/login";
  const url = new URL(target, request.url);
  if (error) url.searchParams.set(recovery ? "recovery" : "auth", "erro");
  return url;
}

export async function GET(request: NextRequest) {
  if (getAuthProvider() !== "supabase") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"), request.url);
  const recovery = isRecoveryFlow(request, next);
  const providerReportedError = Boolean(
    request.nextUrl.searchParams.get("error") ||
      request.nextUrl.searchParams.get("error_code"),
  );
  if (!code || providerReportedError) {
    return NextResponse.redirect(redirectAfterCallback(request, recovery, true));
  }

  const state = createSupabaseCookieState();
  try {
    const client = createSupabaseRequestClient(request, state);
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth/callback] Não foi possível concluir o callback Supabase.", {
        error: error.message,
      });
      return applySupabaseCookieState(
        NextResponse.redirect(redirectAfterCallback(request, recovery, true)),
        state,
      );
    }

    return applySupabaseCookieState(
      NextResponse.redirect(new URL(recovery ? "/redefinir-senha" : next, request.url)),
      state,
    );
  } catch (error) {
    console.error("[auth/callback] Configuração Supabase indisponível.", {
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
    return applySupabaseCookieState(
      NextResponse.redirect(redirectAfterCallback(request, recovery, true)),
      state,
    );
  }
}
