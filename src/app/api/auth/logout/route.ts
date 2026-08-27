import { NextRequest, NextResponse } from "next/server";
import { getAuthProvider, SESSION_COOKIE_NAME } from "@/lib/auth";
import { isSameOriginRequest } from "@/lib/abuse-prevention";
import {
  applySupabaseCookieState,
  createSupabaseCookieState,
} from "@/lib/supabase/server";
import { signOutWithSupabase } from "@/lib/supabase/auth";

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Origem da solicitação não autorizada." }, { status: 403 });
  }

  if (getAuthProvider() === "supabase") {
    try {
      const state = createSupabaseCookieState();
      const error = await signOutWithSupabase(req, state);
      if (error) {
        console.error("[api/auth/logout] Não foi possível encerrar a sessão Supabase.", {
          error: error.message,
        });
      }
      return applySupabaseCookieState(NextResponse.json({ ok: true }), state);
    } catch (error) {
      console.error("[api/auth/logout] Configuração Supabase indisponível.", {
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
      return NextResponse.json(
        { error: "Não foi possível encerrar a sessão. Tente novamente." },
        { status: 503 },
      );
    }
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: req.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
