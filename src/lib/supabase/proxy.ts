import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { Role } from "../auth";
import { applySupabaseCookieState, createSupabaseCookieState, createSupabaseRequestClient } from "./server";
import { getSupabaseProxySession } from "./proxy-session";

function redirectToLogin(request: NextRequest, state: ReturnType<typeof createSupabaseCookieState>): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", request.nextUrl.pathname);
  return applySupabaseCookieState(NextResponse.redirect(url), state);
}

export async function proxySupabaseAuth(
  request: NextRequest,
  requiredRole: Role,
): Promise<NextResponse> {
  const state = createSupabaseCookieState();

  try {
    const client = createSupabaseRequestClient(request, state);
    const session = await getSupabaseProxySession(client);
    if (!session) return redirectToLogin(request, state);

    if (session.role !== requiredRole) {
      const url = request.nextUrl.clone();
      url.pathname = session.role === "admin" ? "/admin" : session.role === "familia" ? "/familia" : "/cuidador";
      url.search = "";
      return applySupabaseCookieState(NextResponse.redirect(url), state);
    }

    return applySupabaseCookieState(NextResponse.next({ request }), state);
  } catch (error) {
    console.error("[proxy] A sessão Supabase não pôde ser validada.", {
      error: error instanceof Error ? error.message : "Erro desconhecido",
      pathname: request.nextUrl.pathname,
    });
    return redirectToLogin(request, state);
  }
}
