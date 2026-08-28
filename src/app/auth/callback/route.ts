import { NextRequest, NextResponse } from "next/server";
import { getAuthProvider } from "@/lib/auth";
import {
  applySupabaseCookieState,
  createSupabaseCookieState,
} from "@/lib/supabase/server";
import { createSupabaseRequestClient } from "@/lib/supabase/server";

function secureCallbackResponse<T extends NextResponse>(response: T): T {
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

function applyCallbackState(
  response: NextResponse,
  state: ReturnType<typeof createSupabaseCookieState>,
) {
  return secureCallbackResponse(applySupabaseCookieState(response, state));
}

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
    return secureCallbackResponse(NextResponse.redirect(new URL("/login", request.url)));
  }

  const tokenHash = request.nextUrl.searchParams.get("token_hash")?.trim() ?? "";
  const tokenType = request.nextUrl.searchParams.get("type");
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"), request.url);
  const recovery = Boolean(tokenHash) || tokenType === "recovery" || isRecoveryFlow(request, next);
  const providerReportedError = Boolean(
    request.nextUrl.searchParams.get("error") ||
      request.nextUrl.searchParams.get("error_code") ||
      request.nextUrl.searchParams.get("error_description"),
  );

  if (tokenHash) {
    if (tokenHash.length > 512 || tokenType !== "recovery" || providerReportedError) {
      return secureCallbackResponse(NextResponse.redirect(redirectAfterCallback(request, true, true)));
    }

    const state = createSupabaseCookieState();
    try {
      const client = createSupabaseRequestClient(request, state);
      const { data, error } = await client.auth.verifyOtp({
        token_hash: tokenHash,
        type: "recovery",
      });

      if (error || !data.session || !data.user) {
        console.error("[auth/callback] Não foi possível validar o token de recuperação Supabase.", {
          error: error?.message ?? "Sessão ausente após validar o token",
        });
        return applyCallbackState(
          NextResponse.redirect(redirectAfterCallback(request, true, true)),
          state,
        );
      }

      return applyCallbackState(
        NextResponse.redirect(new URL("/redefinir-senha", request.url)),
        state,
      );
    } catch (error) {
      console.error("[auth/callback] Configuração Supabase indisponível.", {
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
      return applyCallbackState(
        NextResponse.redirect(redirectAfterCallback(request, true, true)),
        state,
      );
    }
  }

  if (!code || providerReportedError) {
    return secureCallbackResponse(NextResponse.redirect(redirectAfterCallback(request, recovery, true)));
  }

  const state = createSupabaseCookieState();
  try {
    const client = createSupabaseRequestClient(request, state);
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth/callback] Não foi possível concluir o callback Supabase.", {
        error: error.message,
      });
      return applyCallbackState(
        NextResponse.redirect(redirectAfterCallback(request, recovery, true)),
        state,
      );
    }

    return applyCallbackState(
      NextResponse.redirect(new URL(recovery ? "/redefinir-senha" : next, request.url)),
      state,
    );
  } catch (error) {
    console.error("[auth/callback] Configuração Supabase indisponível.", {
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
    return applyCallbackState(
      NextResponse.redirect(redirectAfterCallback(request, recovery, true)),
      state,
    );
  }
}
